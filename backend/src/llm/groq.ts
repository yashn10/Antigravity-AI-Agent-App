import { ChatGroq } from '@langchain/groq';
import { env } from '../config/env.js';

// Primary model for complex reasoning tasks
export const groqLLM = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 4096,
});

// Fast model for quick classification and routing
export const groqLLMFast = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: 'llama-3.1-8b-instant',
    temperature: 0.3,
    maxTokens: 1024,
});

// Structured output model for JSON responses
export const groqLLMStructured = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    maxTokens: 4096,
});
