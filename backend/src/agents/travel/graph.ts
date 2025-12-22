import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { groqLLM } from '../../llm/groq.js';
import { travelTools, travelSearchTool, flightSearchTool, hotelSearchTool } from '../../tools/index.js';
import { TravelAgentState, ReasoningStep, ToolExecution } from '../types.js';

// Define the state annotation for LangGraph
const TravelStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    currentAgent: Annotation<'travel'>({
        reducer: (_, update) => update,
        default: () => 'travel' as const,
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
    travelDetails: Annotation<TravelAgentState['travelDetails']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    searchResults: Annotation<TravelAgentState['searchResults']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    itinerary: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    costBreakdown: Annotation<Record<string, number> | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});

type TravelState = typeof TravelStateAnnotation.State;

const TRAVEL_SYSTEM_PROMPT = `You are an expert Travel Planning Agent. Your role is to help users plan complete trips with flights, accommodations, and detailed itineraries.

CAPABILITIES:
- Search for flights using airport IATA codes (e.g., JFK, LAX, CDG)
- Search for hotels using city codes
- Provide travel tips and destination insights
- Create day-by-day itineraries
- Calculate cost breakdowns

WORKFLOW:
1. GATHER INFORMATION: Ask for any missing essential details:
   - Origin and destination cities
   - Travel dates (departure and return)
   - Number of travelers
   - Budget range (optional but helpful)
   - Preferences (direct flights, hotel star rating, activities)

2. SEARCH: Use available tools to find:
   - Flight options
   - Hotel accommodations
   - Destination information

3. PLAN: Create a structured travel plan with:
   - Recommended flights
   - Hotel suggestions
   - Day-by-day itinerary
   - Estimated costs
   - Travel tips

IMPORTANT:
- Always use 3-letter IATA codes for airports (e.g., JFK for New York JFK, CDG for Paris)
- Format dates as YYYY-MM-DD
- Provide multiple options when available
- Include practical travel tips
- Be helpful and enthusiastic about travel!

When you need to clarify something with the user, ask ONE clear question at a time.`;

// Bind tools to the LLM
const llmWithTools = groqLLM.bindTools(travelTools);

// Node: Analyze user request and determine next action
async function analyzeRequest(state: TravelState): Promise<Partial<TravelState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content).toLowerCase();

    // Extract travel details from the message
    const details: TravelAgentState['travelDetails'] = { ...state.travelDetails };

    // Simple extraction logic (the LLM will handle complex cases)
    const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
    const dates = userMessage.match(dateRegex);
    if (dates) {
        if (!details.departureDate) details.departureDate = dates[0];
        if (dates[1] && !details.returnDate) details.returnDate = dates[1];
    }

    const travelersMatch = userMessage.match(/(\d+)\s*(people|person|travelers?|adults?)/i);
    if (travelersMatch) {
        details.travelers = parseInt(travelersMatch[1]);
    }

    return {
        travelDetails: details,
        reasoningSteps: [{
            step: 1,
            title: 'Analyzing Request',
            description: 'Understanding your travel requirements',
            status: 'completed' as const,
        }],
    };
}

// Node: Check if we need clarification
async function checkClarification(state: TravelState): Promise<Partial<TravelState>> {
    const details = state.travelDetails || {};
    const missingFields: string[] = [];

    if (!details.origin && !details.destination) {
        missingFields.push('origin and destination');
    } else if (!details.destination) {
        missingFields.push('destination');
    }

    if (!details.departureDate) {
        missingFields.push('travel dates');
    }

    if (missingFields.length > 0) {
        const clarificationPrompt = `I'd love to help you plan your trip! To get started, could you please provide:
- ${missingFields.join('\n- ')}

For example: "I want to fly from New York (JFK) to Paris (CDG) from March 15-22, 2025 for 2 people"`;

        return {
            needsClarification: true,
            clarificationQuestion: clarificationPrompt,
            messages: [new AIMessage(clarificationPrompt)],
            reasoningSteps: [{
                step: 2,
                title: 'Gathering Details',
                description: 'Requesting essential travel information',
                status: 'completed' as const,
            }],
        };
    }

    return {
        needsClarification: false,
        reasoningSteps: [{
            step: 2,
            title: 'Details Complete',
            description: 'All essential information gathered',
            status: 'completed' as const,
        }],
    };
}

// Node: Call the LLM with tools
async function callAgent(state: TravelState): Promise<Partial<TravelState>> {
    const systemMessage = new SystemMessage(TRAVEL_SYSTEM_PROMPT);
    const messages = [systemMessage, ...state.messages];

    try {
        const response = await llmWithTools.invoke(messages);

        return {
            messages: [response],
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: 'Processing',
                description: 'Working on your travel plan',
                status: 'in_progress' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Tool node for executing tools
const toolNode = new ToolNode(travelTools);

// Node: Process tool results
async function processToolResults(state: TravelState): Promise<Partial<TravelState>> {
    // Tool results are already added to messages by ToolNode
    return {
        reasoningSteps: [{
            step: state.reasoningSteps.length + 1,
            title: 'Searching',
            description: 'Fetching travel options',
            status: 'completed' as const,
        }],
    };
}

// Node: Generate final response
async function generateResponse(state: TravelState): Promise<Partial<TravelState>> {
    const systemMessage = new SystemMessage(TRAVEL_SYSTEM_PROMPT + `

IMPORTANT: You now have search results. Generate a comprehensive travel plan that includes:
1. **Recommended Flights** - Best options with prices
2. **Accommodation Options** - Hotel suggestions
3. **Day-by-Day Itinerary** - What to do each day
4. **Cost Breakdown** - Estimated total costs
5. **Travel Tips** - Practical advice for the trip

Format your response nicely with headers and bullet points.`);

    const messages = [systemMessage, ...state.messages];

    try {
        const response = await groqLLM.invoke(messages);

        return {
            messages: [response],
            isComplete: true,
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: 'Plan Complete',
                description: 'Your travel itinerary is ready',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Routing function to determine if we should use tools
function shouldUseTool(state: TravelState): string {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage && 'tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
        return 'tools';
    }

    return 'respond';
}

// Routing function after clarification check
function afterClarification(state: TravelState): string {
    if (state.needsClarification) {
        return END;
    }
    return 'agent';
}

// Create the travel agent graph
export function createTravelAgentGraph() {
    const workflow = new StateGraph(TravelStateAnnotation)
        .addNode('analyze', analyzeRequest)
        .addNode('clarify', checkClarification)
        .addNode('agent', callAgent)
        .addNode('tools', toolNode)
        .addNode('respond', generateResponse)
        .addEdge(START, 'analyze')
        .addEdge('analyze', 'clarify')
        .addConditionalEdges('clarify', afterClarification, {
            agent: 'agent',
            [END]: END,
        })
        .addConditionalEdges('agent', shouldUseTool, {
            tools: 'tools',
            respond: 'respond',
        })
        .addEdge('tools', 'agent')
        .addEdge('respond', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeTravelAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = []
): Promise<{
    response: string;
    state: TravelState;
}> {
    const graph = createTravelAgentGraph();

    const initialState: Partial<TravelState> = {
        messages: [...existingMessages, new HumanMessage(userMessage)],
        sessionId,
        currentAgent: 'travel',
        toolExecutions: [],
        reasoningSteps: [],
        needsClarification: false,
        isComplete: false,
    };

    const result = await graph.invoke(initialState);

    // Extract the last AI message as the response
    const aiMessages = result.messages.filter((m: BaseMessage) => m._getType() === 'ai');
    const lastAIMessage = aiMessages[aiMessages.length - 1];
    const response = lastAIMessage ? String(lastAIMessage.content) : 'I apologize, but I encountered an issue processing your request.';

    return {
        response,
        state: result as TravelState,
    };
}

export default createTravelAgentGraph;
