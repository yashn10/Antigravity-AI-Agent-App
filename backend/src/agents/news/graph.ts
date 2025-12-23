import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { groqLLM } from '../../llm/groq.js';
import { fetchTopHeadlines, searchNews, formatArticles, NewsCategory } from '../../tools/newsapi.js';
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
    newsData: Annotation<string | undefined>({
        reducer: (_, update) => update,
        default: () => undefined,
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

const NEWS_SYSTEM_PROMPT = `You are an expert News Analyst, similar to Perplexity AI. Analyze the provided news data and create an insightful summary.

Based on the news articles provided, structure your response with:
📰 **Top Headlines** - Key stories with brief descriptions
📊 **Analysis** - Context and implications of major stories
🔗 **Sources** - Reference the source names provided
💡 **Follow-up Insights** - Related topics to explore

Be concise, informative, and cite sources when discussing specific stories.`;

// Node: Analyze user request and detect category/topic
async function analyzeRequest(state: NewsState): Promise<Partial<NewsState>> {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage._getType() !== 'human') {
        return {};
    }

    const userMessage = String(lastMessage.content).toLowerCase();
    const preferences: NewsAgentState['newsPreferences'] = { ...state.newsPreferences };

    // Detect category from message
    const categoryMap: Record<string, NewsCategory> = {
        'tech': 'technology',
        'technology': 'technology',
        'ai': 'technology',
        'artificial intelligence': 'technology',
        'software': 'technology',
        'startup': 'technology',
        'gadget': 'technology',
        'business': 'business',
        'market': 'business',
        'stock': 'business',
        'economy': 'business',
        'finance': 'business',
        'corporate': 'business',
        'science': 'science',
        'research': 'science',
        'discovery': 'science',
        'space': 'science',
        'health': 'health',
        'medical': 'health',
        'healthcare': 'health',
        'wellness': 'health',
        'sports': 'sports',
        'game': 'sports',
        'football': 'sports',
        'basketball': 'sports',
        'soccer': 'sports',
        'cricket': 'sports',
        'entertainment': 'entertainment',
        'movie': 'entertainment',
        'music': 'entertainment',
        'celebrity': 'entertainment',
    };

    let detectedCategory: NewsCategory = 'general';
    for (const [keyword, category] of Object.entries(categoryMap)) {
        if (userMessage.includes(keyword)) {
            detectedCategory = category;
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

    // Extract keywords for search
    const keywords = userMessage
        .replace(/what('s| is| are)?|the|latest|news|in|about|on|today|this|week/gi, '')
        .trim();
    if (keywords.length > 2) {
        preferences.keywords = [keywords];
    }

    return {
        newsPreferences: { ...preferences, categories: [detectedCategory] },
        reasoningSteps: [{
            step: 1,
            title: 'Analyzing Request',
            description: `Category: ${detectedCategory}${preferences.keywords ? `, Topic: ${preferences.keywords[0]}` : ''}`,
            status: 'completed' as const,
        }],
    };
}

// Node: Fetch news data directly
async function fetchNewsData(state: NewsState): Promise<Partial<NewsState>> {
    const preferences = state.newsPreferences || {};
    const category = (preferences.categories?.[0] as NewsCategory) || 'general';
    const keywords = preferences.keywords?.[0];

    try {
        let newsData: string;
        let articleCount = 0;

        if (keywords && keywords.length > 3) {
            // Search for specific topic
            console.log('Searching news for:', keywords);
            const result = await searchNews({
                query: keywords,
                sortBy: 'publishedAt',
                pageSize: 8,
            });
            newsData = formatArticles(result.articles);
            articleCount = result.articles.length;
        } else {
            // Fetch top headlines by category
            console.log('Fetching headlines for category:', category);
            const result = await fetchTopHeadlines({
                category,
                pageSize: 8,
            });
            newsData = formatArticles(result.articles);
            articleCount = result.articles.length;
        }

        return {
            newsData: newsData || 'No news articles found.',
            reasoningSteps: [{
                step: 2,
                title: 'News Fetched',
                description: `Found ${articleCount} articles`,
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        console.error('News fetch error:', error);
        return {
            newsData: 'Unable to fetch news. Please try again later.',
            reasoningSteps: [{
                step: 2,
                title: 'Fetch Issue',
                description: 'Using cached knowledge',
                status: 'completed' as const,
            }],
        };
    }
}

// Node: Generate news summary using LLM
async function generateSummary(state: NewsState): Promise<Partial<NewsState>> {
    const newsData = state.newsData || 'No news data available.';
    const preferences = state.newsPreferences || {};
    const category = preferences.categories?.[0] || 'general';
    const lastMessage = state.messages[state.messages.length - 1];
    const userQuery = String(lastMessage?.content || 'latest news');

    const systemMessage = new SystemMessage(NEWS_SYSTEM_PROMPT);
    const dataMessage = new HumanMessage(`User Query: ${userQuery}

News Category: ${category}

News Articles:
${newsData}

Based on these articles, provide a comprehensive news summary. Highlight the most important stories and provide analysis.`);

    try {
        const response = await groqLLM.invoke([systemMessage, dataMessage]);

        return {
            messages: [response],
            isComplete: true,
            reasoningSteps: [{
                step: 3,
                title: 'Analysis Complete',
                description: 'News summary ready',
                status: 'completed' as const,
            }],
        };
    } catch (error) {
        return {
            error: `Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isComplete: true,
        };
    }
}

// Create the news agent graph - simplified workflow
export function createNewsAgentGraph() {
    const workflow = new StateGraph(NewsStateAnnotation)
        .addNode('analyze', analyzeRequest)
        .addNode('fetch', fetchNewsData)
        .addNode('respond', generateSummary)
        .addEdge(START, 'analyze')
        .addEdge('analyze', 'fetch')
        .addEdge('fetch', 'respond')
        .addEdge('respond', END);

    return workflow.compile();
}

// Main invocation function
export async function invokeNewsAgent(
    userMessage: string,
    sessionId: string,
    existingMessages: BaseMessage[] = [],
    _agentState?: Record<string, unknown>
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
