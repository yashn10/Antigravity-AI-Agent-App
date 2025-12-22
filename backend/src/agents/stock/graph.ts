import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { groqLLM } from '../../llm/groq.js';
import { searchTavily } from '../../tools/tavily.js';
import { StockAgentState, ReasoningStep, ToolExecution } from '../types.js';

// Define the state annotation for LangGraph
const StockStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => [],
    }),
    currentAgent: Annotation<'stock'>({
        reducer: (_, update) => update,
        default: () => 'stock' as const,
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
    stockQuery: Annotation<StockAgentState['stockQuery']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    marketData: Annotation<StockAgentState['marketData']>({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({}),
    }),
    searchResults: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
    disclaimer: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});

type StockState = typeof StockStateAnnotation.State;

const STOCK_SYSTEM_PROMPT = `You are a Market Intelligence Analyst. Analyze the provided market data and give insightful analysis.

⚠️ IMPORTANT DISCLAIMER ⚠️
You are NOT a licensed financial advisor. All information is for educational purposes only.

Based on the search results provided, structure your response with:
📊 **Market Overview** - Current conditions
📈 **Bull Case** - Positive factors and opportunities
📉 **Bear Case** - Risks and concerns
⚠️ **Key Risks** - Important considerations
💡 **Key Takeaways** - Summary points

Be concise but informative. Cite sources when available.`;

const INVESTMENT_DISCLAIMER = `

---
⚠️ **Investment Disclaimer**
This analysis is for informational and educational purposes only. It is not financial advice or a recommendation. Past performance does not guarantee future results. Please consult a qualified financial advisor before making investment decisions.
---`;

// Node: Analyze user request and extract stock symbols/sectors
async function analyzeRequest(state: StockState): Promise<Partial<StockState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content).toUpperCase();
    const query: StockAgentState['stockQuery'] = { ...state.stockQuery };

    // Detect stock symbols (common pattern: 1-5 uppercase letters)
    const symbolRegex = /\b[A-Z]{1,5}\b/g;
    const potentialSymbols = userMessage.match(symbolRegex) || [];

    // Filter common words that might be mistaken for symbols
    const commonWords = ['I', 'A', 'AND', 'OR', 'THE', 'FOR', 'TO', 'IN', 'IS', 'IT', 'OF', 'ON', 'AT', 'BY', 'AN', 'BE', 'AS', 'DO', 'IF', 'MY', 'SO', 'UP', 'AI', 'US', 'HOW', 'WHAT', 'TELL', 'ME', 'ABOUT', 'TODAY', 'NOW', 'DOING', 'STOCK', 'MARKET'];
    const symbols = potentialSymbols.filter(s => !commonWords.includes(s) && s.length >= 2 && s.length <= 5);

    if (symbols.length > 0) {
        query.symbols = symbols;
    }

    // Detect sector
    const sectorKeywords: Record<string, string[]> = {
        'technology': ['tech', 'technology', 'software', 'saas', 'ai', 'semiconductor'],
        'healthcare': ['health', 'healthcare', 'pharma', 'biotech', 'medical'],
        'finance': ['finance', 'bank', 'financial', 'fintech', 'insurance'],
        'energy': ['energy', 'oil', 'gas', 'renewable', 'solar', 'ev'],
        'consumer': ['consumer', 'retail', 'e-commerce', 'luxury'],
        'crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain'],
    };

    const messageLower = lastMessage.content.toString().toLowerCase();
    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
        if (keywords.some(kw => messageLower.includes(kw))) {
            query.sector = sector;
            break;
        }
    }

    return {
        stockQuery: query,
        reasoningSteps: [{
            step: 1,
            title: 'Analyzing Query',
            description: `Identified: ${query.symbols?.join(', ') || query.sector || 'general market'}`,
            status: 'completed' as const,
        }],
    };
}

// Node: Fetch market data directly using Tavily
async function fetchMarketData(state: StockState): Promise<Partial<StockState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userMessage = String(lastMessage?.content || '');
    const query = state.stockQuery || {};

    // Build search query
    let searchQuery = userMessage;
    if (query.symbols && query.symbols.length > 0) {
        searchQuery = `${query.symbols.join(' ')} stock market analysis price news`;
    } else if (query.sector) {
        searchQuery = `${query.sector} sector stock market analysis news`;
    } else {
        searchQuery = `${userMessage} stock market analysis`;
    }

    try {
        console.log('Stock search query:', searchQuery);

        const result = await searchTavily(searchQuery, {
            searchDepth: 'basic',
            maxResults: 5,
            includeAnswer: true,
            includeDomains: ['finance.yahoo.com', 'marketwatch.com', 'bloomberg.com', 'cnbc.com', 'reuters.com'],
        });

        // Format results for the LLM
        const formattedResults = result.results
            .map((r, i) => `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content}`)
            .join('\n\n');

        const searchOutput = result.answer
            ? `**Market Insight:** ${result.answer}\n\n**Sources:**\n${formattedResults}`
            : formattedResults || 'No specific data found. Providing general analysis.';

        return {
            searchResults: searchOutput,
            reasoningSteps: [{
                step: 2,
                title: 'Data Fetched',
                description: `Found ${result.results.length} market sources`,
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        console.error('Stock search error:', error);
        return {
            searchResults: 'Unable to fetch real-time data. Providing general analysis based on available information.',
            reasoningSteps: [{
                step: 2,
                title: 'Search',
                description: 'Using cached knowledge',
                status: 'completed' as const,
            }],
        };
    }
}

// Node: Generate analysis using LLM with the fetched data
async function generateAnalysis(state: StockState): Promise<Partial<StockState>> {
    const searchResults = state.searchResults || 'No specific market data available.';
    const lastMessage = state.messages[state.messages.length - 1];
    const userQuery = String(lastMessage?.content || 'market analysis');

    const systemMessage = new SystemMessage(STOCK_SYSTEM_PROMPT);
    const dataMessage = new HumanMessage(`User Query: ${userQuery}

Market Data and News:
${searchResults}

Based on this data, provide a comprehensive market analysis. Be specific and cite the sources provided.`);

    try {
        const response = await groqLLM.invoke([systemMessage, dataMessage]);

        // Append disclaimer
        const responseContent = String(response.content) + INVESTMENT_DISCLAIMER;

        return {
            messages: [new AIMessage(responseContent)],
            isComplete: true,
            disclaimer: INVESTMENT_DISCLAIMER,
            reasoningSteps: [{
                step: 3,
                title: 'Analysis Complete',
                description: 'Market analysis ready',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error generating analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Create the stock agent graph - simplified workflow
export function createStockAgentGraph() {
    const workflow = new StateGraph(StockStateAnnotation)
        .addNode('analyze', analyzeRequest)
        .addNode('fetch', fetchMarketData)
        .addNode('respond', generateAnalysis)
        .addEdge(START, 'analyze')
        .addEdge('analyze', 'fetch')
        .addEdge('fetch', 'respond')
        .addEdge('respond', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeStockAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = [],
    _agentState?: Record<string, unknown>
): Promise<{
    response: string;
    state: StockState;
}> {
    const graph = createStockAgentGraph();

    const initialState: Partial<StockState> = {
        messages: [...existingMessages, new HumanMessage(userMessage)],
        sessionId,
        currentAgent: 'stock',
        toolExecutions: [],
        reasoningSteps: [],
        needsClarification: false,
        isComplete: false,
    };

    const result = await graph.invoke(initialState);

    const aiMessages = result.messages.filter((m: BaseMessage) => m._getType() === 'ai');
    const lastAIMessage = aiMessages[aiMessages.length - 1];
    const response = lastAIMessage ? String(lastAIMessage.content) : 'I apologize, but I encountered an issue fetching market data.';

    return {
        response,
        state: result as StockState,
    };
}

export default createStockAgentGraph;
