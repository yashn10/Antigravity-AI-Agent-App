import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { groqLLM } from '../../llm/groq.js';
import { stockTools } from '../../tools/index.js';
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
    disclaimer: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
    }),
});

type StockState = typeof StockStateAnnotation.State;

const STOCK_SYSTEM_PROMPT = `You are a Market Intelligence Analyst. Your role is to provide market analysis, stock summaries, and financial insights based on current data.

⚠️ IMPORTANT DISCLAIMER ⚠️
You are NOT a licensed financial advisor. You do NOT provide:
- Investment recommendations or "buy/sell" signals
- Personal financial advice
- Guaranteed predictions or forecasts
- Specific portfolio allocation advice

All information is for educational and informational purposes only.

WHAT YOU CAN PROVIDE:
✅ Market trend analysis and observations
✅ Stock and sector summaries
✅ Bull and bear case reasoning
✅ Risk factor identification
✅ Historical context and comparisons
✅ Industry news and developments
✅ General market education

WORKFLOW:
1. UNDERSTAND: Identify what the user wants to know:
   - Specific stocks or symbols
   - Sectors or industries
   - Market trends or conditions
   - Comparison analysis

2. RESEARCH: Use search tools to gather:
   - Current market data and news
   - Recent developments
   - Analyst opinions (with attribution)
   - Relevant financial metrics

3. ANALYZE: Present balanced analysis with:
   - Current situation summary
   - Bull case (positive factors)
   - Bear case (risk factors)
   - Key metrics and data points
   - Source citations

RESPONSE FORMAT:
Structure responses with:
📊 **Market Overview** - Current conditions
📈 **Bull Case** - Positive factors and opportunities
📉 **Bear Case** - Risks and concerns
⚠️ **Key Risks** - Important considerations
📰 **Recent News** - Relevant developments
💡 **Key Takeaways** - Summary points

Always include the investment disclaimer at the end.`;

const INVESTMENT_DISCLAIMER = `

---
⚠️ **Investment Disclaimer**
This analysis is for informational and educational purposes only. It is not financial advice, an investment recommendation, or a solicitation to buy or sell any securities. Past performance does not guarantee future results. All investments involve risk, including possible loss of principal. Please consult with a qualified financial advisor before making any investment decisions.
---`;

// Bind tools to the LLM
const llmWithTools = groqLLM.bindTools(stockTools);

// Node: Analyze user request
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
    const commonWords = ['I', 'A', 'AND', 'OR', 'THE', 'FOR', 'TO', 'IN', 'IS', 'IT', 'OF', 'ON', 'AT', 'BY', 'AN', 'BE', 'AS', 'DO', 'IF', 'MY', 'SO', 'UP', 'AI', 'US'];
    const symbols = potentialSymbols.filter(s => !commonWords.includes(s) && s.length >= 2);

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
            description: 'Identifying stocks and market focus',
            status: 'completed' as const,
        }],
    };
}

// Node: Call the LLM with tools
async function callAgent(state: StockState): Promise<Partial<StockState>> {
    const systemMessage = new SystemMessage(STOCK_SYSTEM_PROMPT);
    const messages = [systemMessage, ...state.messages];

    try {
        const response = await llmWithTools.invoke(messages);

        return {
            messages: [response],
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
                title: 'Researching',
                description: 'Gathering market data and analysis',
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
const toolNode = new ToolNode(stockTools);

// Node: Generate final analysis
async function generateAnalysis(state: StockState): Promise<Partial<StockState>> {
    const systemMessage = new SystemMessage(STOCK_SYSTEM_PROMPT + `

IMPORTANT: You now have market data. Generate a comprehensive analysis with:

1. 📊 **Market Overview** - Current conditions and context
2. 📈 **Bull Case** - Positive factors supporting growth
3. 📉 **Bear Case** - Risks and concerns to consider
4. ⚠️ **Key Risks** - Important risk factors
5. 💡 **Key Takeaways** - Summary and main points

Be balanced and objective. Cite sources when available. Remember to include the investment disclaimer.`);

    const messages = [systemMessage, ...state.messages];

    try {
        const response = await groqLLM.invoke(messages);

        // Append disclaimer
        const responseContent = String(response.content) + INVESTMENT_DISCLAIMER;

        return {
            messages: [new AIMessage(responseContent)],
            isComplete: true,
            disclaimer: INVESTMENT_DISCLAIMER,
            reasoningSteps: [{
                step: state.reasoningSteps.length + 1,
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

// Routing function
function shouldUseTool(state: StockState): string {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage && 'tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
        return 'tools';
    }

    return 'respond';
}

// Create the stock agent graph
export function createStockAgentGraph() {
    const workflow = new StateGraph(StockStateAnnotation)
        .addNode('analyze', analyzeRequest)
        .addNode('agent', callAgent)
        .addNode('tools', toolNode)
        .addNode('respond', generateAnalysis)
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
export async function invokeStockAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = []
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
