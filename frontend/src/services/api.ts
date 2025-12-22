import { AgentInfo, AgentType, ChatResponse, ChatHistoryItem, StreamEvent } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Get all available agents
    async getAgents(): Promise<AgentInfo[]> {
        const response = await fetch(`${this.baseUrl}/api/agents`);
        if (!response.ok) {
            throw new Error('Failed to fetch agents');
        }
        const data = await response.json();
        return data.agents;
    }

    // Get specific agent info
    async getAgent(agentId: AgentType): Promise<AgentInfo> {
        const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch agent');
        }
        const data = await response.json();
        return data.agent;
    }

    // Send a message to an agent (non-streaming)
    async sendMessage(
        message: string,
        sessionId?: string,
        agentType?: AgentType
    ): Promise<ChatResponse> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId,
                agentType,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send message');
        }

        return response.json();
    }

    // Send a message and stream the response
    async *streamMessage(
        message: string,
        sessionId?: string,
        agentType?: AgentType
    ): AsyncGenerator<StreamEvent> {
        const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId,
                agentType,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to stream message');
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        yield data as StreamEvent;
                    } catch {
                        // Ignore parse errors
                    }
                }
            }
        }
    }

    // Get chat history
    async getHistory(userId?: string): Promise<ChatHistoryItem[]> {
        const params = userId ? `?userId=${userId}` : '';
        const response = await fetch(`${this.baseUrl}/api/history${params}`);
        if (!response.ok) {
            throw new Error('Failed to fetch history');
        }
        const data = await response.json();
        return data.history;
    }

    // Save to history
    async saveToHistory(
        sessionId: string,
        title: string,
        lastMessage: string,
        agentType: AgentType,
        messageCount: number
    ): Promise<void> {
        await fetch(`${this.baseUrl}/api/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                title,
                lastMessage,
                agentType,
                messageCount,
            }),
        });
    }

    // Delete from history
    async deleteFromHistory(sessionId: string): Promise<void> {
        await fetch(`${this.baseUrl}/api/history/${sessionId}`, {
            method: 'DELETE',
        });
    }

    // Clear all history
    async clearHistory(userId?: string): Promise<void> {
        const params = userId ? `?userId=${userId}` : '';
        await fetch(`${this.baseUrl}/api/history${params}`, {
            method: 'DELETE',
        });
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const apiService = new ApiService();
export default apiService;
