import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { groqLLM } from '../../llm/groq.js';
import { newsTools } from '../../tools/index.js';
import { NewsAgentState, ReasoningStep, ToolExecution } from '../types.js';

// Define the state annotation for LangGraph
const NewsStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    currentAgent: Annotation<'news'>({
        reducer: (_, update) => update,
        default: () => 'news' as const,
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
    newsPreferences: Annotation<NewsAgentState['newsPreferences']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    articles: Annotation<NewsAgentState['articles']>({
        reducer: (_, update) => update,
        default: () => [],
    }),
    summary: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    followUpInsights: Annotation<string[] | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});

type NewsState = typeof NewsStateAnnotation.State;

const NEWS_SYSTEM_PROMPT = `You are an expert News Analyst Agent, similar to Perplexity AI. Your role is to fetch, analyze, and synthesize the latest news for users.

CAPABILITIES:
- Fetch top headlines by category (general, business, technology, science, health, sports, entertainment)
- Search for specific news topics
- Perform deep web searches for additional context
- Provide comprehensive summaries with source citations
- Generate follow-up insights and related topics

WORKFLOW:
1. UNDERSTAND: Determine what news the user wants:
   - Specific category (tech, business, sports, etc.)
   - Specific topic or keywords
   - Time range (today, this week, etc.)

2. GATHER: Use available tools to fetch:
   - Top headlines for requested category
   - Search results for specific topics
   - Additional context via web search

3. SYNTHESIZE: Create a comprehensive response with:
   - **Headlines**: Key stories with brief descriptions
   - **Deep Summary**: Analysis and context for major stories
   - **Source Citations**: Links and references
   - **Follow-up Insights**: Related topics to explore

FORMATTING GUIDELINES:
- Use clear headers and bullet points
- Include source names and dates
- Provide balanced coverage
- Highlight breaking or significant news
- Suggest related topics for further reading

NEWS CATEGORIES:
- general: Top stories across all topics
- technology: Tech news, AI, startups, gadgets
- business: Markets, economy, corporate news
- science: Research, discoveries, space
- health: Medical news, wellness, healthcare
- sports: Games, athletes, leagues
- entertainment: Movies, music, celebrities

Always cite your sources and provide balanced, factual information.`;

// Bind tools to the LLM
const llmWithTools = groqLLM.bindTools(newsTools);

// Node: Analyze user request
async function analyzeRequest(state: NewsState): Promise<Partial<NewsState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content).toLowerCase();
    const preferences: NewsAgentState['newsPreferences'] = { ...state.newsPreferences };

    // Detect category from message
    const categoryMap: Record<string, string[]> = {
        technology: ['tech', 'technology', 'ai', 'artificial intelligence', 'software', 'startup', 'gadget'],
        business: ['business', 'market', 'stock', 'economy', 'finance', 'corporate'],
        science: ['science', 'research', 'discovery', 'space', 'physics', 'biology'],
        health: ['health', 'medical', 'healthcare', 'wellness', 'medicine'],
        sports: ['sports', 'game', 'football', 'basketball', 'soccer', 'cricket', 'tennis'],
        entertainment: ['entertainment', 'movie', 'music', 'celebrity', 'film', 'tv'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => userMessage.includes(kw))) {
            preferences.categories = [category];
            break;
        }
    }

    // Detect time range
    if (userMessage.includes('today')) {
        preferences.timeRange = 'today';
    } else if (userMessage.includes('week')) {
        preferences.timeRange = 'week';
    } else if (userMessage.includes('month')) {
        preferences.timeRange = 'month';
    }

    return {
        newsPreferences: preferences,
        reasoningSteps: [{
            step: 1,
            title: 'Analyzing Request',
            description: 'Understanding your news preferences',
            status: 'completed' as const,
        }],
    };
}

// Node: Call the LLM with tools
async function callAgent(state: NewsState): Promise<Partial<NewsState>> {
    const systemMessage = new SystemMessage(NEWS_SYSTEM_PROMPT);
    const messages = [systemMessage, ...state.messages];

    try {
        const response = await llmWithTools.invoke(messages);

        return {
            messages: [response],
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: 'Fetching News',
                description: 'Gathering latest headlines and articles',
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

// Tool node
const toolNode = new ToolNode(newsTools);

// Node: Generate final response with analysis
async function generateResponse(state: NewsState): Promise<Partial<NewsState>> {
    const systemMessage = new SystemMessage(NEWS_SYSTEM_PROMPT + `

IMPORTANT: You now have news data. Generate a Perplexity-style comprehensive response with:

1. **📰 Top Headlines** - Key stories with brief descriptions
2. **📊 Deep Analysis** - Context and implications of major stories  
3. **🔗 Sources** - Links to original articles
4. **💡 Follow-up Insights** - Related topics and what to watch

Use clear formatting with emojis for visual organization. Be informative and engaging.`);

    const messages = [systemMessage, ...state.messages];

    try {
        const response = await groqLLM.invoke(messages);

        return {
            messages: [response],
            isComplete: true,
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: 'Analysis Complete',
                description: 'News summary ready',
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

// Routing function
function shouldUseTool(state: NewsState): string {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage && 'tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
        return 'tools';
    }

    return 'respond';
}

// Create the news agent graph
export function createNewsAgentGraph() {
    const workflow = new StateGraph(NewsStateAnnotation)
        .addNode('analyze', analyzeRequest)
        .addNode('agent', callAgent)
        .addNode('tools', toolNode)
        .addNode('respond', generateResponse)
        .addEdge(START, 'analyze')
        .addEdge('analyze', 'agent')
        .addConditionalEdges('agent', shouldUseTool, {
            tools: 'tools',
            respond: 'respond',
        })
        .addEdge('tools', 'agent')
        .addEdge('respond', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeNewsAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = []
): Promise<{
    response: string;
    state: NewsState;
}> {
    const graph = createNewsAgentGraph();

    const initialState: Partial<NewsState> = {
        messages: [...existingMessages, new HumanMessage(userMessage)],
        sessionId,
        currentAgent: 'news',
        toolExecutions: [],
        reasoningSteps: [],
        needsClarification: false,
        isComplete: false,
    };

    const result = await graph.invoke(initialState);

    const aiMessages = result.messages.filter((m: BaseMessage) => m._getType() === 'ai');
    const lastAIMessage = aiMessages[aiMessages.length - 1];
    const response = lastAIMessage ? String(lastAIMessage.content) : 'I apologize, but I encountered an issue fetching news.';

    return {
        response,
        state: result as NewsState,
    };
}

export default createNewsAgentGraph;
