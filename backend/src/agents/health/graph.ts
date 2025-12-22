import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { groqLLM } from '../../llm/groq.js';
import { HealthAgentState, ReasoningStep, ToolExecution } from '../types.js';

// Define the state annotation for LangGraph
const HealthStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    currentAgent: Annotation<'health'>({
        reducer: (_, update) => update,
        default: () => 'health' as const,
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
    userProfile: Annotation<HealthAgentState['userProfile']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    recommendations: Annotation<HealthAgentState['recommendations']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    disclaimer: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});

type HealthState = typeof HealthStateAnnotation.State;

const HEALTH_SYSTEM_PROMPT = `You are a friendly Wellness & Lifestyle Coach. Your role is to provide general wellness guidance, lifestyle tips, and healthy living recommendations.

⚠️ IMPORTANT DISCLAIMER ⚠️
You are NOT a medical professional. You do NOT provide:
- Medical diagnoses
- Treatment recommendations
- Medication advice
- Mental health treatment plans

Always remind users to consult qualified healthcare professionals for medical concerns.

WHAT YOU CAN HELP WITH:
✅ General wellness tips and lifestyle advice
✅ Healthy eating suggestions and nutrition basics
✅ Exercise recommendations for general fitness
✅ Stress management and relaxation techniques
✅ Sleep hygiene tips
✅ Daily routine optimization
✅ Mindfulness and self-care practices
✅ Work-life balance suggestions

WORKFLOW:
1. UNDERSTAND: Learn about the user's:
   - Current lifestyle and habits
   - Wellness goals
   - Activity level
   - Any restrictions or preferences

2. PERSONALIZE: Create tailored recommendations based on their needs

3. DELIVER: Provide actionable advice with:
   - Clear, practical steps
   - Realistic goals
   - Encouraging and supportive tone

RESPONSE FORMAT:
Use a warm, supportive tone. Structure responses with:
- 🎯 Personalized recommendations
- 📋 Practical action steps
- 💡 Helpful tips
- ⚠️ Appropriate disclaimers

Always include this disclaimer when discussing health topics:
"Remember: This is general wellness guidance only. Please consult a healthcare professional for personalized medical advice."`;

const MEDICAL_DISCLAIMER = `

---
⚠️ **Important Disclaimer**
This is general wellness information only and should not be considered medical advice. Please consult with a qualified healthcare provider before making any changes to your diet, exercise routine, or for any health concerns. If you're experiencing a medical emergency, please contact emergency services immediately.
---`;

// Node: Analyze user request
async function analyzeRequest(state: HealthState): Promise<Partial<HealthState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content).toLowerCase();
    const profile: HealthAgentState['userProfile'] = { ...state.userProfile };

    // Detect goals from message
    const goalKeywords: Record<string, string[]> = {
        'weight_loss': ['lose weight', 'weight loss', 'slim', 'diet'],
        'fitness': ['fitness', 'exercise', 'workout', 'strength', 'cardio'],
        'stress': ['stress', 'anxiety', 'relax', 'calm', 'overwhelmed'],
        'sleep': ['sleep', 'insomnia', 'tired', 'fatigue', 'rest'],
        'energy': ['energy', 'energized', 'motivation', 'productive'],
        'nutrition': ['nutrition', 'eating', 'healthy food', 'diet'],
    };

    const detectedGoals: string[] = [];
    for (const [goal, keywords] of Object.entries(goalKeywords)) {
        if (keywords.some(kw => userMessage.includes(kw))) {
            detectedGoals.push(goal);
        }
    }

    if (detectedGoals.length > 0) {
        profile.goals = detectedGoals;
    }

    // Detect activity level
    if (userMessage.includes('sedentary') || userMessage.includes('desk job')) {
        profile.activityLevel = 'sedentary';
    } else if (userMessage.includes('active') || userMessage.includes('workout')) {
        profile.activityLevel = 'active';
    }

    return {
        userProfile: profile,
        reasoningSteps: [{
            step: 1,
            title: 'Understanding Goals',
            description: 'Analyzing your wellness needs',
            status: 'completed' as const,
        }],
    };
}

// Node: Check if we need more information
async function gatherInfo(state: HealthState): Promise<Partial<HealthState>> {
    const profile = state.userProfile || {};
    const messages = state.messages;

    // Check if this is a simple greeting or general question
    const lastMessage = messages[messages.length - 1];
    const userMessage = String(lastMessage?.content || '').toLowerCase();

    const isGreeting = /^(hi|hello|hey|good morning|good evening)/i.test(userMessage);
    const isGeneral = userMessage.length < 30 && !profile.goals?.length;

    if (isGreeting || (isGeneral && messages.length <= 1)) {
        const welcomeMessage = `Hello! 👋 I'm your Wellness Coach, here to help you with:

🥗 **Nutrition** - Healthy eating tips and meal ideas
🏃 **Exercise** - Workout recommendations for your level
😌 **Stress Management** - Relaxation techniques
😴 **Sleep** - Tips for better rest
📅 **Daily Routines** - Optimize your day

What would you like to focus on today? For example:
- "Help me create a morning routine"
- "I want to manage stress better"
- "Suggest exercises for someone with a desk job"
- "Give me healthy meal ideas"

${MEDICAL_DISCLAIMER}`;

        return {
            needsClarification: true,
            messages: [new AIMessage(welcomeMessage)],
            reasoningSteps: [{
                step: 2,
                title: 'Welcome',
                description: 'Introducing wellness services',
                status: 'completed' as const,
            }],
        };
    }

    return {
        needsClarification: false,
        reasoningSteps: [{
            step: 2,
            title: 'Processing',
            description: 'Creating personalized recommendations',
            status: 'in_progress' as const,
        }],
    };
}

// Node: Generate wellness recommendations
async function generateRecommendations(state: HealthState): Promise<Partial<HealthState>> {
    const systemMessage = new SystemMessage(HEALTH_SYSTEM_PROMPT);
    const messages = [systemMessage, ...state.messages];

    try {
        const response = await groqLLM.invoke(messages);

        // Append disclaimer to response
        const responseContent = String(response.content) + MEDICAL_DISCLAIMER;

        return {
            messages: [new AIMessage(responseContent)],
            isComplete: true,
            disclaimer: MEDICAL_DISCLAIMER,
            reasoningSteps: [{
                step: 3,
                title: 'Recommendations Ready',
                description: 'Personalized wellness advice prepared',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error generating recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Routing function
function afterGathering(state: HealthState): string {
    if (state.needsClarification) {
        return END;
    }
    return 'recommend';
}

// Create the health agent graph
export function createHealthAgentGraph() {
    const workflow = new StateGraph(HealthStateAnnotation)
        .addNode('analyze', analyzeRequest)
        .addNode('gather', gatherInfo)
        .addNode('recommend', generateRecommendations)
        .addEdge(START, 'analyze')
        .addEdge('analyze', 'gather')
        .addConditionalEdges('gather', afterGathering, {
            recommend: 'recommend',
            [END]: END,
        })
        .addEdge('recommend', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeHealthAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = []
): Promise<{
    response: string;
    state: HealthState;
}> {
    const graph = createHealthAgentGraph();

    const initialState: Partial<HealthState> = {
        messages: [...existingMessages, new HumanMessage(userMessage)],
        sessionId,
        currentAgent: 'health',
        toolExecutions: [],
        reasoningSteps: [],
        needsClarification: false,
        isComplete: false,
    };

    const result = await graph.invoke(initialState);

    const aiMessages = result.messages.filter((m: BaseMessage) => m._getType() === 'ai');
    const lastAIMessage = aiMessages[aiMessages.length - 1];
    const response = lastAIMessage ? String(lastAIMessage.content) : 'I apologize, but I encountered an issue.';

    return {
        response,
        state: result as HealthState,
    };
}

export default createHealthAgentGraph;
