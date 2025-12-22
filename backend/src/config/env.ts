import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    // LLM Provider
    GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),

    // Search Tools
    TAVILY_API_KEY: z.string().min(1, 'TAVILY_API_KEY is required'),

    // News API
    NEWS_API_KEY: z.string().min(1, 'NEWS_API_KEY is required'),

    // Amadeus API
    AMADEUS_CLIENT_ID: z.string().min(1, 'AMADEUS_CLIENT_ID is required'),
    AMADEUS_CLIENT_SECRET: z.string().min(1, 'AMADEUS_CLIENT_SECRET is required'),

    // Server Config
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function validateEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Environment validation failed:');
        result.error.issues.forEach((issue) => {
            console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
        });
        console.error('\n📝 Please check your .env file. See .env.example for required variables.');
        process.exit(1);
    }

    return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
