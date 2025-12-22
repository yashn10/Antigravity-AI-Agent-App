import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { groqLLM } from '../../llm/groq.js';
import { InterviewAgentState, ReasoningStep, ToolExecution } from '../types.js';

// Define the state annotation for LangGraph
const InterviewStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    currentAgent: Annotation<'interview'>({
        reducer: (_, update) => update,
        default: () => 'interview' as const,
    }),
    sessionId: Annotation<string>({
        reducer: (_, update) => update,
        default: () => '',
    }),
    toolExecutions: Annotation<ToolExecution[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    reasoningSteps: Annotation<ReasoningStep[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    needsClarification: Annotation<boolean>({
        reducer: (_, update) => update,
        default: () => false,
    }),
    clarificationQuestion: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    isComplete: Annotation<boolean>({
        reducer: (_, update) => update,
        default: () => false,
    }),
    error: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    interviewConfig: Annotation<InterviewAgentState['interviewConfig']>({
        reducer: (curr, update) => update ? { ...curr, ...update } : curr,
        default: () => undefined,
    }),
    currentQuestion: Annotation<InterviewAgentState['currentQuestion']>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    answers: Annotation<InterviewAgentState['answers']>({
        reducer: (curr, update) => update ? [...(curr || []), ...update] : curr,
        default: () => [],
    }),
    questionCount: Annotation<number>({
        reducer: (curr, update) => update,
        default: () => 0,
    }),
    overallScore: Annotation<number | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    finalFeedback: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    phase: Annotation<'setup' | 'interviewing' | 'evaluating' | 'complete'>({
        reducer: (_, update) => update,
        default: () => 'setup' as const,
    }),
});

type InterviewState = typeof InterviewStateAnnotation.State;

const INTERVIEW_SYSTEM_PROMPT = `You are an expert Professional Interview Coach. Your role is to conduct realistic mock interviews and provide constructive feedback.

INTERVIEW TYPES:
- Technical: Coding, algorithms, system design
- Behavioral: STAR method, situational questions
- System Design: Architecture, scalability, trade-offs
- Mixed: Combination of all types

EXPERIENCE LEVELS:
- Junior (0-2 years): Fundamentals, learning ability
- Mid (2-5 years): Practical experience, problem-solving
- Senior (5-8 years): Leadership, architecture decisions
- Lead (8+ years): Strategy, mentoring, system thinking

WORKFLOW:
1. SETUP: Gather interview parameters:
   - Target role (e.g., Frontend Developer, Data Scientist)
   - Experience level
   - Tech stack or skills to focus on
   - Interview type preference

2. CONDUCT: Ask questions one at a time:
   - Start with easier questions, increase difficulty
   - Give time for candidate to respond
   - Ask follow-up questions based on answers
   - Cover multiple skill areas

3. EVALUATE: After each answer, provide:
   - Score (0-10)
   - What was good
   - What could be improved
   - Key points they should have mentioned

4. CONCLUDE: After the interview:
   - Overall score and summary
   - Strengths demonstrated
   - Areas for improvement
   - Specific tips for real interviews

QUESTION GUIDELINES:
- Technical: Focus on the specified tech stack
- Behavioral: Use STAR format expectations
- System Design: Start simple, add constraints
- Be realistic - mirror actual interview experiences

FEEDBACK STYLE:
- Be encouraging but honest
- Provide specific, actionable feedback
- Include example better answers when helpful
- Help build confidence while identifying gaps`;

// Node: Check interview setup
async function checkSetup(state: InterviewState): Promise<Partial<InterviewState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content).toLowerCase();
    const config = state.interviewConfig;

    // If we don't have a config yet, try to extract from message or ask for setup
    if (!config?.role) {
        // Try to detect role and other parameters
        const detectedConfig: InterviewAgentState['interviewConfig'] = {
            role: '',
            experienceLevel: 'mid',
            techStack: [],
            interviewType: 'mixed',
        };

        // Detect role
        const rolePatterns = [
            /interview\s+(?:for\s+)?(?:a\s+)?(.+?)\s+(?:role|position|job)/i,
            /practice\s+(?:a\s+)?(.+?)\s+interview/i,
            /(.+?)\s+interview/i,
            /prepare\s+(?:for|me\s+for)\s+(.+)/i,
        ];

        for (const pattern of rolePatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                detectedConfig.role = match[1].trim();
                break;
            }
        }

        // Detect experience level
        if (userMessage.includes('junior') || userMessage.includes('entry')) {
            detectedConfig.experienceLevel = 'junior';
        } else if (userMessage.includes('senior')) {
            detectedConfig.experienceLevel = 'senior';
        } else if (userMessage.includes('lead') || userMessage.includes('principal')) {
            detectedConfig.experienceLevel = 'lead';
        }

        // Detect interview type
        if (userMessage.includes('technical') || userMessage.includes('coding')) {
            detectedConfig.interviewType = 'technical';
        } else if (userMessage.includes('behavioral') || userMessage.includes('behavior')) {
            detectedConfig.interviewType = 'behavioral';
        } else if (userMessage.includes('system design')) {
            detectedConfig.interviewType = 'system_design';
        }

        // Detect tech stack
        const techKeywords = [
            'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
            'node', 'nodejs', 'express', 'django', 'flask', 'spring', 'go', 'golang',
            'rust', 'c++', 'c#', 'ruby', 'rails', 'php', 'laravel', 'aws', 'azure',
            'gcp', 'docker', 'kubernetes', 'sql', 'nosql', 'mongodb', 'postgresql',
            'machine learning', 'ml', 'ai', 'data science', 'frontend', 'backend',
            'fullstack', 'full-stack', 'devops', 'mobile', 'ios', 'android', 'flutter'
        ];

        const detectedTech = techKeywords.filter(tech => userMessage.includes(tech));
        if (detectedTech.length > 0) {
            detectedConfig.techStack = detectedTech;
        }

        if (detectedConfig.role) {
            return {
                interviewConfig: detectedConfig,
                phase: 'interviewing',
                reasoningSteps: [{
                    step: 1,
                    title: 'Setup Complete',
                    description: `Configuring ${detectedConfig.role} interview`,
                    status: 'completed' as const,
                }],
            };
        }

        // Need to ask for setup
        const setupMessage = `Welcome to your Mock Interview session! 🎯

To personalize your interview experience, please tell me:

1. **Role**: What position are you preparing for?
   (e.g., Frontend Developer, Data Scientist, Product Manager)

2. **Experience Level**: junior / mid / senior / lead

3. **Tech Stack** (for technical roles): 
   (e.g., React, Python, AWS, System Design)

4. **Interview Type**: 
   - Technical (coding, algorithms)
   - Behavioral (STAR method)
   - System Design (architecture)
   - Mixed (all types)

For example: *"Practice a senior React developer interview focusing on technical and system design"*`;

        return {
            needsClarification: true,
            messages: [new AIMessage(setupMessage)],
            phase: 'setup',
            reasoningSteps: [{
                step: 1,
                title: 'Gathering Setup',
                description: 'Collecting interview preferences',
                status: 'completed' as const,
            }],
        };
    }

    return {
        phase: state.phase === 'setup' ? 'interviewing' : state.phase,
    };
}

// Node: Conduct interview (ask question or evaluate answer)
async function conductInterview(state: InterviewState): Promise<Partial<InterviewState>> {
    const config = state.interviewConfig;
    const questionCount = state.questionCount || 0;
    const currentQuestion = state.currentQuestion;
    const messages = state.messages;

    // If we've asked enough questions, move to evaluation
    if (questionCount >= 5 && currentQuestion) {
        return {
            phase: 'evaluating',
        };
    }

    const systemMessage = new SystemMessage(INTERVIEW_SYSTEM_PROMPT + `

CURRENT INTERVIEW SETTINGS:
- Role: ${config?.role || 'General'}
- Experience Level: ${config?.experienceLevel || 'mid'}
- Tech Stack: ${config?.techStack?.join(', ') || 'General'}
- Interview Type: ${config?.interviewType || 'mixed'}
- Questions Asked: ${questionCount}/5

${currentQuestion ? `
PREVIOUS QUESTION: ${currentQuestion.question}
Expected topics: ${currentQuestion.expectedTopics.join(', ')}

EVALUATE the candidate's last response, then ask the NEXT question.
Format your response as:

## Answer Evaluation
**Score: X/10**
✅ Strengths: [what they did well]
❌ Could improve: [what was missing or could be better]
💡 Key points to mention: [important points they should have covered]

---

## Next Question
[Your next interview question]

---

Remember to increase difficulty progressively.`
            : `
Ask your FIRST interview question. Start with something appropriate for the ${config?.experienceLevel || 'mid'}-level.
Introduce yourself briefly as the interviewer first.`}`);

    try {
        const response = await groqLLM.invoke([systemMessage, ...messages]);

        // Parse question from response for tracking
        const responseText = String(response.content);
        const questionMatch = responseText.match(/##\s*(?:Next\s+)?Question\s*\n+([\s\S]+?)(?:\n---|\n##|$)/i);

        const newQuestion: InterviewAgentState['currentQuestion'] = {
            question: questionMatch ? questionMatch[1].trim() : responseText,
            expectedTopics: [],
            difficulty: questionCount < 2 ? 'easy' : questionCount < 4 ? 'medium' : 'hard',
        };

        return {
            messages: [response],
            currentQuestion: newQuestion,
            questionCount: questionCount + 1,
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: `Question ${questionCount + 1}`,
                description: currentQuestion ? 'Evaluating answer and asking next question' : 'Starting interview',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error conducting interview: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Node: Generate final evaluation
async function generateFinalEvaluation(state: InterviewState): Promise<Partial<InterviewState>> {
    const config = state.interviewConfig;

    const systemMessage = new SystemMessage(INTERVIEW_SYSTEM_PROMPT + `

FINAL EVALUATION TIME

Interview Settings:
- Role: ${config?.role || 'General'}
- Experience Level: ${config?.experienceLevel || 'mid'}
- Tech Stack: ${config?.techStack?.join(', ') || 'General'}
- Questions Asked: ${state.questionCount}

Provide a comprehensive final evaluation:

## 📊 Overall Score: X/10

## ✅ Strengths Demonstrated
[List the candidate's strongest areas]

## 🎯 Areas for Improvement
[List specific areas to work on]

## 💡 Recommendations
[Specific tips for real interviews]

## 📈 Readiness Assessment
Based on this practice session, I would rate your interview readiness for a ${config?.experienceLevel} ${config?.role} role as: [Ready / Almost Ready / Need More Practice]

## 🔜 Next Steps
[Suggested topics or questions to practice]

---

Thank them for the practice session and encourage them to continue preparing.`);

    try {
        const response = await groqLLM.invoke([systemMessage, ...state.messages]);

        return {
            messages: [response],
            phase: 'complete',
            isComplete: true,
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: 'Interview Complete',
                description: 'Final evaluation generated',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error generating evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Routing function after setup
function afterSetup(state: InterviewState): string {
    if (state.needsClarification) {
        return END;
    }
    return 'conduct';
}

// Routing function after conduct
function afterConduct(state: InterviewState): string {
    if (state.phase === 'evaluating') {
        return 'evaluate';
    }
    return END;
}

// Create the interview agent graph
export function createInterviewAgentGraph() {
    const workflow = new StateGraph(InterviewStateAnnotation)
        .addNode('setup', checkSetup)
        .addNode('conduct', conductInterview)
        .addNode('evaluate', generateFinalEvaluation)
        .addEdge(START, 'setup')
        .addConditionalEdges('setup', afterSetup, {
            conduct: 'conduct',
            [END]: END,
        })
        .addConditionalEdges('conduct', afterConduct, {
            evaluate: 'evaluate',
            [END]: END,
        })
        .addEdge('evaluate', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeInterviewAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = [],
    existingConfig?: InterviewAgentState['interviewConfig'],
    existingQuestionCount?: number
): Promise<{
    response: string;
    state: InterviewState;
}> {
    const graph = createInterviewAgentGraph();

    const initialState: Partial<InterviewState> = {
        messages: [...existingMessages, new HumanMessage(userMessage)],
        sessionId,
        currentAgent: 'interview',
        toolExecutions: [],
        reasoningSteps: [],
        needsClarification: false,
        isComplete: false,
        interviewConfig: existingConfig,
        questionCount: existingQuestionCount || 0,
        phase: existingConfig ? 'interviewing' : 'setup',
    };

    const result = await graph.invoke(initialState);

    const aiMessages = result.messages.filter((m: BaseMessage) => m._getType() === 'ai');
    const lastAIMessage = aiMessages[aiMessages.length - 1];
    const response = lastAIMessage ? String(lastAIMessage.content) : 'I apologize, but I encountered an issue.';

    return {
        response,
        state: result as InterviewState,
    };
}

export default createInterviewAgentGraph;
