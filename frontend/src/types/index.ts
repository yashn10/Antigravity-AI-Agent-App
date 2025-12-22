// Agent types
export type AgentType = 'meta' | 'travel' | 'news' | 'health' | 'stock' | 'interview';

export interface AgentInfo {
    id: AgentType;
    name: string;
    description: string;
    icon: string;
    capabilities: string[];
    examples: string[];
}

// Message types
export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    agentType?: AgentType;
    isStreaming?: boolean;
    toolExecutions?: ToolExecution[];
    reasoningSteps?: ReasoningStep[];
}

export interface ToolExecution {
    toolName: string;
    toolInput: Record<string, unknown>;
    toolOutput?: string;
    status: 'pending' | 'running' | 'completed' | 'error';
}

export interface ReasoningStep {
    step: number;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
}

// Chat types
export interface ChatSession {
    id: string;
    messages: Message[];
    currentAgent: AgentType;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatHistoryItem {
    id: string;
    sessionId: string;
    title: string;
    lastMessage: string;
    agentType: AgentType;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// API types
export interface ChatRequest {
    message: string;
    sessionId?: string;
    agentType?: AgentType;
}

export interface ChatResponse {
    sessionId: string;
    message: Message;
    isComplete: boolean;
    needsClarification: boolean;
}

// Stream event types
export type StreamEventType =
    | 'message_start'
    | 'message_delta'
    | 'message_complete'
    | 'tool_start'
    | 'tool_complete'
    | 'reasoning_step'
    | 'error';

export interface StreamEvent {
    type: StreamEventType;
    data?: unknown;
    content?: string;
    sessionId?: string;
    agentType?: AgentType;
    error?: string;
}
