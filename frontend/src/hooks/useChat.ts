'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, AgentType, ReasoningStep, ToolExecution, StreamEvent } from '@/types';
import { apiService } from '@/services/api';
import { generateId } from '@/lib/utils';

interface UseChatOptions {
    initialMessages?: Message[];
    sessionId?: string;
    agentType?: AgentType;
    onError?: (error: Error) => void;
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    error: Error | null;
    sessionId: string | null;
    currentAgent: AgentType;
    reasoningSteps: ReasoningStep[];
    toolExecutions: ToolExecution[];
    sendMessage: (content: string) => Promise<void>;
    setAgent: (agent: AgentType) => void;
    clearMessages: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(options.sessionId || null);
    const [currentAgent, setCurrentAgent] = useState<AgentType>(options.agentType || 'meta');
    const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
    const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);

    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setReasoningSteps([]);
        setToolExecutions([]);

        // Add user message
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        // Create placeholder for assistant message
        const assistantMessageId = generateId();
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            agentType: currentAgent,
            isStreaming: true,
        };
        setMessages(prev => [...prev, assistantMessage]);

        try {
            let streamedContent = '';
            const steps: ReasoningStep[] = [];
            const tools: ToolExecution[] = [];
            let newSessionId = sessionId;

            // Use streaming
            for await (const event of apiService.streamMessage(content, sessionId || undefined, currentAgent)) {
                switch (event.type) {
                    case 'message_start':
                        if (event.sessionId) {
                            newSessionId = event.sessionId;
                            setSessionId(event.sessionId);
                        }
                        break;

                    case 'message_delta':
                        if (event.content) {
                            streamedContent += event.content;
                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === assistantMessageId
                                        ? { ...msg, content: streamedContent }
                                        : msg
                                )
                            );
                        }
                        break;

                    case 'reasoning_step':
                        if (event.data) {
                            steps.push(event.data as ReasoningStep);
                            setReasoningSteps([...steps]);
                        }
                        break;

                    case 'tool_complete':
                        if (event.data) {
                            tools.push(event.data as ToolExecution);
                            setToolExecutions([...tools]);
                        }
                        break;

                    case 'message_complete':
                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? {
                                        ...msg,
                                        isStreaming: false,
                                        reasoningSteps: steps,
                                        toolExecutions: tools,
                                    }
                                    : msg
                            )
                        );
                        break;

                    case 'error':
                        throw new Error(event.error || 'Stream error');
                }
            }

            // Save to history
            if (newSessionId) {
                const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
                await apiService.saveToHistory(
                    newSessionId,
                    title,
                    streamedContent.slice(0, 100),
                    currentAgent,
                    messages.length + 2
                );
            }

        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to send message');
            setError(error);
            options.onError?.(error);

            // Update assistant message with error
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
                            isStreaming: false,
                        }
                        : msg
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, sessionId, currentAgent, messages.length, options]);

    const setAgent = useCallback((agent: AgentType) => {
        setCurrentAgent(agent);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setSessionId(null);
        setReasoningSteps([]);
        setToolExecutions([]);
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sessionId,
        currentAgent,
        reasoningSteps,
        toolExecutions,
        sendMessage,
        setAgent,
        clearMessages,
    };
}

export default useChat;
