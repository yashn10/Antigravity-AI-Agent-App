import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { env } from '../config/env.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
}

interface TavilyResponse {
    query: string;
    results: TavilySearchResult[];
    answer?: string;
}

async function searchTavily(
    query: string,
    options: {
        searchDepth?: 'basic' | 'advanced';
        maxResults?: number;
        includeAnswer?: boolean;
        includeDomains?: string[];
        excludeDomains?: string[];
    } = {}
): Promise<TavilyResponse> {
    const {
        searchDepth = 'basic',
        maxResults = 5,
        includeAnswer = true,
        includeDomains = [],
        excludeDomains = [],
    } = options;

    const response = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: env.TAVILY_API_KEY,
            query,
            search_depth: searchDepth,
            max_results: maxResults,
            include_answer: includeAnswer,
            include_domains: includeDomains,
            exclude_domains: excludeDomains,
        }),
    });

    if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

// LangChain tool for web search
export const tavilySearchTool = tool(
    async ({ query, searchDepth, maxResults }) => {
        try {
            const result = await searchTavily(query, {
                searchDepth: searchDepth as 'basic' | 'advanced',
                maxResults,
                includeAnswer: true,
            });

            // Format results for the agent
            const formattedResults = result.results
                .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
                .join('\n\n');

            const output = result.answer
                ? `**Quick Answer:** ${result.answer}\n\n**Sources:**\n${formattedResults}`
                : formattedResults;

            return output;
        } catch (error) {
            return `Error searching: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
    {
        name: 'web_search',
        description: 'Search the web for current information. Use for real-time data, news, prices, and any information that changes frequently.',
        schema: z.object({
            query: z.string().describe('The search query'),
            searchDepth: z
                .enum(['basic', 'advanced'])
                .optional()
                .default('basic')
                .describe('Search depth - use advanced for complex queries'),
            maxResults: z
                .number()
                .min(1)
                .max(10)
                .optional()
                .default(5)
                .describe('Number of results to return'),
        }),
    }
);

// Stock-specific search tool
export const stockSearchTool = tool(
    async ({ query, symbols }) => {
        try {
            const searchQuery = symbols
                ? `${query} ${symbols.join(' ')} stock market analysis`
                : `${query} stock market analysis`;

            const result = await searchTavily(searchQuery, {
                searchDepth: 'advanced',
                maxResults: 8,
                includeAnswer: true,
                includeDomains: [
                    'finance.yahoo.com',
                    'marketwatch.com',
                    'bloomberg.com',
                    'cnbc.com',
                    'reuters.com',
                    'seekingalpha.com',
                ],
            });

            const formattedResults = result.results
                .map((r, i) => `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content}`)
                .join('\n\n');

            return result.answer
                ? `**Market Insight:** ${result.answer}\n\n**Analysis Sources:**\n${formattedResults}`
                : formattedResults;
        } catch (error) {
            return `Error fetching market data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
    {
        name: 'stock_search',
        description: 'Search for stock market data, financial news, and market analysis. Use for stock prices, trends, and market insights.',
        schema: z.object({
            query: z.string().describe('The stock or market search query'),
            symbols: z
                .array(z.string())
                .optional()
                .describe('Stock symbols to include in search (e.g., ["AAPL", "GOOGL"])'),
        }),
    }
);

// Travel-specific search tool
export const travelSearchTool = tool(
    async ({ query, destination }) => {
        try {
            const searchQuery = destination
                ? `${destination} ${query} travel guide tips`
                : `${query} travel tips recommendations`;

            const result = await searchTavily(searchQuery, {
                searchDepth: 'advanced',
                maxResults: 6,
                includeAnswer: true,
                includeDomains: [
                    'tripadvisor.com',
                    'lonelyplanet.com',
                    'booking.com',
                    'expedia.com',
                    'travelandleisure.com',
                ],
            });

            const formattedResults = result.results
                .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
                .join('\n\n');

            return result.answer
                ? `**Travel Insight:** ${result.answer}\n\n**Travel Resources:**\n${formattedResults}`
                : formattedResults;
        } catch (error) {
            return `Error searching travel info: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
    {
        name: 'travel_search',
        description: 'Search for travel information, destination guides, tips, and recommendations.',
        schema: z.object({
            query: z.string().describe('The travel search query'),
            destination: z.string().optional().describe('Specific destination to search for'),
        }),
    }
);

export { searchTavily };
