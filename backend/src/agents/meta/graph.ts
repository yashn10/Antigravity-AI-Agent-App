import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { groqLLMFast } from '../../llm/groq.js';
import { MetaAgentState, AgentType, MetaRoutingIntent, ReasoningStep, ToolExecution, AGENT_INFO } from '../types.js';

// Import agent invokers
import { invokeTravelAgent } from '../travel/graph.js';
import { invokeNewsAgent } from '../news/graph.js';
import { invokeHealthAgent } from '../health/graph.js';
import { invokeStockAgent } from '../stock/graph.js';
import { invokeInterviewAgent } from '../interview/graph.js';

// Define the state annotation for LangGraph
const MetaStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    currentAgent: Annotation<'meta'>({
        reducer: (_, update) => update,
        default: () => 'meta' as const,
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
    detectedIntent: Annotation<MetaAgentState['detectedIntent']>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    routedTo: Annotation<AgentType | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    agentResponse: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});

type MetaState = typeof MetaStateAnnotation.State;

const META_SYSTEM_PROMPT = `You are a Meta AI Assistant that routes user requests to specialized agents.

AVAILABLE AGENTS:
1. TRAVEL - Trip planning, flights, hotels, itineraries
   Keywords: travel, trip, vacation, flight, hotel, destination, visit

2. NEWS - Latest news, headlines, current events
   Keywords: news, headlines, current events, what's happening, updates

3. HEALTH - Wellness guidance, lifestyle tips (NOT medical advice)
   Keywords: health, wellness, fitness, exercise, diet, stress, sleep, routine

4. STOCK - Market analysis, stock insights (NOT investment advice)
   Keywords: stock, market, investment, trading, finance, portfolio, crypto

5. INTERVIEW - Mock interviews, career coaching
   Keywords: interview, job, career, practice, mock interview, hire

ROUTING RULES:
1. Analyze the user's message to understand their intent
2. Select the MOST appropriate specialized agent
3. If unclear, ask a brief clarifying question
4. If greeting or general chat, introduce yourself and the agents

OUTPUT FORMAT (JSON):
{
  "agent": "travel" | "news" | "health" | "stock" | "interview" | "clarify" | "greet",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}

ONLY output valid JSON, nothing else.`;

// Node: Analyze and route user request
async function analyzeAndRoute(state: MetaState): Promise<Partial<MetaState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content);

    const systemMessage = new SystemMessage(META_SYSTEM_PROMPT);
    const routingPrompt = new HumanMessage(`Analyze this user request and determine which agent should handle it:\n\n"${userMessage}"\n\nRespond with JSON only.`);

    try {
        const response = await groqLLMFast.invoke([systemMessage, routingPrompt]);
        const responseText = String(response.content).trim();

        // Parse JSON response
        let routingDecision: { agent: string; confidence: number; reasoning: string };

        try {
            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                routingDecision = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch {
            // Fallback: try to determine from keywords
            const lowerMessage = userMessage.toLowerCase();

            if (lowerMessage.match(/travel|trip|flight|hotel|vacation|visit|destination/)) {
                routingDecision = { agent: 'travel', confidence: 0.8, reasoning: 'Travel keywords detected' };
            } else if (lowerMessage.match(/news|headline|current event|happening|update/)) {
                routingDecision = { agent: 'news', confidence: 0.8, reasoning: 'News keywords detected' };
            } else if (lowerMessage.match(/health|wellness|fitness|exercise|diet|stress|sleep/)) {
                routingDecision = { agent: 'health', confidence: 0.8, reasoning: 'Health keywords detected' };
            } else if (lowerMessage.match(/stock|market|invest|trading|crypto|portfolio/)) {
                routingDecision = { agent: 'stock', confidence: 0.8, reasoning: 'Stock keywords detected' };
            } else if (lowerMessage.match(/interview|job|career|practice|mock|hire/)) {
                routingDecision = { agent: 'interview', confidence: 0.8, reasoning: 'Interview keywords detected' };
            } else if (lowerMessage.match(/^(hi|hello|hey|good|what can|help)/i)) {
                routingDecision = { agent: 'greet', confidence: 0.9, reasoning: 'Greeting detected' };
            } else {
                routingDecision = { agent: 'clarify', confidence: 0.5, reasoning: 'Unable to determine intent' };
            }
        }

        return {
            detectedIntent: {
                primaryAgent: routingDecision.agent as MetaRoutingIntent,
                confidence: routingDecision.confidence,
                reasoning: routingDecision.reasoning,
            },
            reasoningSteps: [{
                step: 1,
                title: 'Intent Analysis',
                description: `Detected intent: ${routingDecision.agent} (${Math.round(routingDecision.confidence * 100)}% confidence)`,
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error analyzing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Node: Handle greetings
async function handleGreeting(state: MetaState): Promise<Partial<MetaState>> {
    const agentList = Object.values(AGENT_INFO)
        .filter(a => a.id !== 'meta')
        .map(a => `${a.icon} **${a.name}** - ${a.description}`)
        .join('\n');

    const greeting = `Hello! 👋 I'm your AI Assistant, here to connect you with specialized agents that can help with various tasks.

**Available Agents:**
${agentList}

How can I help you today? You can:
- Ask about any of these topics directly
- Tell me what you need help with, and I'll route you to the right agent
- Say something like "Plan a trip to Tokyo" or "What's the latest tech news?"`;

    return {
        messages: [new AIMessage(greeting)],
        isComplete: true,
        reasoningSteps: [{
            step: 2,
            title: 'Welcome',
            description: 'Greeting user and presenting agents',
            status: 'completed' as const,
        }],
    };
}

// Node: Handle clarification needed
async function handleClarification(state: MetaState): Promise<Partial<MetaState>> {
    const agentOptions = Object.values(AGENT_INFO)
        .filter(a => a.id !== 'meta')
        .map(a => `• ${a.icon} **${a.name}**: ${a.examples[0]}`)
        .join('\n');

    const clarification = `I'm not quite sure what you're looking for. Could you provide more details?

Here are some examples of what I can help with:
${agentOptions}

What would you like to do?`;

    return {
        messages: [new AIMessage(clarification)],
        needsClarification: true,
        isComplete: true,
        reasoningSteps: [{
            step: 2,
            title: 'Clarification',
            description: 'Asking user for more details',
            status: 'completed' as const,
        }],
    };
}

// Node: Route to specialized agent
async function routeToAgent(state: MetaState): Promise<Partial<MetaState>> {
    const intent = state.detectedIntent;
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const userMessage = String(lastMessage?.content || '');
    const sessionId = state.sessionId;

    if (!intent?.primaryAgent) {
        return {
            error: 'No agent detected',
            isComplete: true,
        };
    }

    const agentType = intent.primaryAgent as AgentType;

    try {
        let result: { response: string; state: unknown };

        switch (agentType) {
            case 'travel':
                result = await invokeTravelAgent(userMessage, sessionId);
                break;
            case 'news':
                result = await invokeNewsAgent(userMessage, sessionId);
                break;
            case 'health':
                result = await invokeHealthAgent(userMessage, sessionId);
                break;
            case 'stock':
                result = await invokeStockAgent(userMessage, sessionId);
                break;
            case 'interview':
                result = await invokeInterviewAgent(userMessage, sessionId);
                break;
            default:
                throw new Error(`Unknown agent type: ${agentType}`);
        }

        const agentInfo = AGENT_INFO[agentType];
        const prefixedResponse = `${agentInfo.icon} **${agentInfo.name}**\n\n${result.response}`;

        return {
            messages: [new AIMessage(prefixedResponse)],
            routedTo: agentType,
            agentResponse: result.response,
            isComplete: true,
            reasoningSteps: [{
                step: 2,
                title: `Routed to ${AGENT_INFO[agentType].name}`,
                description: 'Specialized agent handling request',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error routing to agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Routing function
function determineRoute(state: MetaState): string {
    const intent = state.detectedIntent;

    if (!intent) {
        return 'clarify';
    }

    switch (intent.primaryAgent) {
        case 'greet':
            return 'greet';
        case 'clarify':
            return 'clarify';
        case 'travel':
        case 'news':
        case 'health':
        case 'stock':
        case 'interview':
            return 'route';
        default:
            return 'clarify';
    }
}

// Create the meta agent graph
export function createMetaAgentGraph() {
    const workflow = new StateGraph(MetaStateAnnotation)
        .addNode('analyze', analyzeAndRoute)
        .addNode('greet', handleGreeting)
        .addNode('clarify', handleClarification)
        .addNode('route', routeToAgent)
        .addEdge(START, 'analyze')
        .addConditionalEdges('analyze', determineRoute, {
            greet: 'greet',
            clarify: 'clarify',
            route: 'route',
        })
        .addEdge('greet', END)
        .addEdge('clarify', END)
        .addEdge('route', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeMetaAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = [],
    _agentState?: Record<string, unknown>  // Accept for interface consistency
): Promise<{
    response: string;
    state: MetaState;
    routedAgent?: AgentType;
}> {
    const graph = createMetaAgentGraph();

    const initialState: Partial<MetaState> = {
        messages: [...existingMessages, new HumanMessage(userMessage)],
        sessionId,
        currentAgent: 'meta',
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
        state: result as MetaState,
        routedAgent: result.routedTo,
    };
}

export default createMetaAgentGraph;
