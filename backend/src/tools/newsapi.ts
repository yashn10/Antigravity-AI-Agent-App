import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { env } from '../config/env.js';

const NEWS_API_URL = 'https://newsapi.org/v2';

export interface NewsArticle {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
}

interface NewsAPIResponse {
    status: string;
    totalResults: number;
    articles: NewsArticle[];
}

export type NewsCategory =
    | 'general'
    | 'business'
    | 'technology'
    | 'science'
    | 'health'
    | 'sports'
    | 'entertainment';

// Fetch top headlines by category
async function fetchTopHeadlines(
    options: {
        category?: NewsCategory;
        country?: string;
        query?: string;
        pageSize?: number;
    } = {}
): Promise<NewsAPIResponse> {
    const { category = 'general', country = 'us', query, pageSize = 10 } = options;

    const params = new URLSearchParams({
        apiKey: env.NEWS_API_KEY,
        category,
        country,
        pageSize: pageSize.toString(),
    });

    if (query) {
        params.append('q', query);
    }

    const response = await fetch(`${NEWS_API_URL}/top-headlines?${params}`);

    if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new Error(`NewsAPI error: ${error.message || response.statusText}`);
    }

    return response.json() as Promise<NewsAPIResponse>;
}

// Search all news articles
async function searchNews(
    options: {
        query: string;
        from?: string;
        to?: string;
        sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
        pageSize?: number;
    }
): Promise<NewsAPIResponse> {
    const { query, from, to, sortBy = 'publishedAt', pageSize = 10 } = options;

    const params = new URLSearchParams({
        apiKey: env.NEWS_API_KEY,
        q: query,
        sortBy,
        pageSize: pageSize.toString(),
        language: 'en',
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const response = await fetch(`${NEWS_API_URL}/everything?${params}`);

    if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new Error(`NewsAPI error: ${error.message || response.statusText}`);
    }

    return response.json() as Promise<NewsAPIResponse>;
}

// Format articles for agent consumption
function formatArticles(articles: NewsArticle[]): string {
    return articles
        .map((article, i) => {
            const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
            return `**[${i + 1}] ${article.title}**
Source: ${article.source.name} | ${date}
${article.description || 'No description available.'}
URL: ${article.url}`;
        })
        .join('\n\n');
}

// LangChain tool for top headlines
export const newsHeadlinesTool = tool(
    async ({ category, country, query }) => {
        try {
            const result = await fetchTopHeadlines({
                category: category as NewsCategory,
                country,
                query,
                pageSize: 8,
            });

            if (result.articles.length === 0) {
                return `No news articles found for category: ${category}`;
            }

            const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
            return `**Top ${categoryLabel} Headlines:**\n\n${formatArticles(result.articles)}`;
        } catch (error) {
            return `Error fetching headlines: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
    {
        name: 'get_news_headlines',
        description: 'Get top news headlines by category. Categories: general, business, technology, science, health, sports, entertainment.',
        schema: z.object({
            category: z
                .enum(['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment'])
                .default('general')
                .describe('News category'),
            country: z
                .string()
                .length(2)
                .optional()
                .default('us')
                .describe('ISO 3166-1 country code (e.g., us, gb, in)'),
            query: z
                .string()
                .optional()
                .describe('Optional keyword to filter headlines'),
        }),
    }
);

// LangChain tool for news search
export const newsSearchTool = tool(
    async ({ query, timeRange, sortBy }) => {
        try {
            // Calculate date range
            const now = new Date();
            let from: string | undefined;

            switch (timeRange) {
                case 'today':
                    from = now.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    from = weekAgo.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    from = monthAgo.toISOString().split('T')[0];
                    break;
            }

            const result = await searchNews({
                query,
                from,
                sortBy: sortBy as 'relevancy' | 'popularity' | 'publishedAt',
                pageSize: 10,
            });

            if (result.articles.length === 0) {
                return `No news articles found for: "${query}"`;
            }

            return `**News Search Results for "${query}":**\n\n${formatArticles(result.articles)}`;
        } catch (error) {
            return `Error searching news: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
    {
        name: 'search_news',
        description: 'Search for news articles by keyword. Use for specific topics or to find recent news.',
        schema: z.object({
            query: z.string().describe('Search keywords'),
            timeRange: z
                .enum(['today', 'week', 'month'])
                .optional()
                .default('week')
                .describe('Time range for articles'),
            sortBy: z
                .enum(['relevancy', 'popularity', 'publishedAt'])
                .optional()
                .default('publishedAt')
                .describe('Sort order for results'),
        }),
    }
);

export { fetchTopHeadlines, searchNews, formatArticles };
