// Agent exports
export { createTravelAgentGraph, invokeTravelAgent } from './travel/graph.js';
export { createNewsAgentGraph, invokeNewsAgent } from './news/graph.js';
export { createHealthAgentGraph, invokeHealthAgent } from './health/graph.js';
export { createStockAgentGraph, invokeStockAgent } from './stock/graph.js';
export { createInterviewAgentGraph, invokeInterviewAgent } from './interview/graph.js';
export { createMetaAgentGraph, invokeMetaAgent } from './meta/graph.js';

// Types
export * from './types.js';

// Base agent
export { BaseAgent, createStreamingHandler } from './base.js';

// Agent registry
import { AgentType, AGENT_INFO } from './types.js';
import { invokeTravelAgent } from './travel/graph.js';
import { invokeNewsAgent } from './news/graph.js';
import { invokeHealthAgent } from './health/graph.js';
import { invokeStockAgent } from './stock/graph.js';
import { invokeInterviewAgent } from './interview/graph.js';
import { invokeMetaAgent } from './meta/graph.js';
import { BaseMessage } from '@langchain/core/messages';

// Type for agent invoker functions
type AgentInvoker = (
    message: string,
    sessionId: string,
    existingMessages?: BaseMessage[],
    agentState?: Record<string, unknown>
) => Promise<{ response: string; state: unknown }>;

// Registry of all agents
export const agentRegistry: Record<AgentType, AgentInvoker> = {
    meta: invokeMetaAgent,
    travel: invokeTravelAgent,
    news: invokeNewsAgent,
    health: invokeHealthAgent,
    stock: invokeStockAgent,
    interview: invokeInterviewAgent,
};

// Get agent info
export function getAgentInfo(agentType: AgentType) {
    return AGENT_INFO[agentType];
}

// Get all agents info
export function getAllAgentsInfo() {
    return Object.values(AGENT_INFO);
}

// Invoke any agent by type
export async function invokeAgent(
    agentType: AgentType,
    message: string,
    sessionId: string,
    existingMessages: BaseMessage[] = [],
    agentState?: Record<string, unknown>
): Promise<{ response: string; state: unknown }> {
    const invoker = agentRegistry[agentType];
    if (!invoker) {
        throw new Error(`Unknown agent type: ${agentType}`);
    }
    return invoker(message, sessionId, existingMessages, agentState);
}

