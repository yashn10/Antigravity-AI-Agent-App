'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message, AgentType, ReasoningStep, ToolExecution } from '@/types';
import { cn } from '@/lib/utils';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ReasoningSteps from './ReasoningSteps';

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    currentAgent: AgentType;
    reasoningSteps: ReasoningStep[];
    toolExecutions: ToolExecution[];
}

export default function ChatInterface({
    messages,
    isLoading,
    onSendMessage,
    currentAgent,
    reasoningSteps,
    toolExecutions,
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const agentIcons: Record<AgentType, string> = {
        meta: '🤖',
        travel: '✈️',
        news: '📰',
        health: '🏃',
        stock: '📈',
        interview: '💼',
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                            <div className="text-6xl mb-4">{agentIcons[currentAgent]}</div>
                            <h2 className="text-2xl font-semibold mb-2">
                                {currentAgent === 'meta' ? 'AI Assistant' : `${currentAgent.charAt(0).toUpperCase() + currentAgent.slice(1)} Agent`}
                            </h2>
                            <p className="text-muted-foreground max-w-md">
                                {currentAgent === 'meta'
                                    ? "I'll route your request to the right specialized agent. How can I help you today?"
                                    : `Ready to help you with ${currentAgent} related tasks. What would you like to know?`
                                }
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 w-full max-w-md">
                                {getExamples(currentAgent).map((example, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(example)}
                                        className="p-3 text-left text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}

                            {/* Show reasoning steps while loading */}
                            {isLoading && reasoningSteps.length > 0 && (
                                <ReasoningSteps steps={reasoningSteps} tools={toolExecutions} />
                            )}

                            {/* Typing indicator */}
                            {isLoading && (
                                <TypingIndicator agentIcon={agentIcons[currentAgent]} />
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    <div className="relative flex items-end gap-2">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message ${currentAgent === 'meta' ? 'AI Assistant' : currentAgent + ' agent'}...`}
                            className="min-h-[52px] max-h-[200px] resize-none pr-12"
                            disabled={isLoading}
                            rows={1}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 bottom-2 h-8 w-8"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </form>
            </div>
        </div>
    );
}

function getExamples(agent: AgentType): string[] {
    const examples: Record<AgentType, string[]> = {
        meta: [
            'Plan a trip to Japan',
            'What\'s the tech news today?',
            'Help me prepare for interviews',
            'Analyze the stock market',
        ],
        travel: [
            'Plan a 5-day trip to Paris',
            'Find flights from NYC to Tokyo',
            'Best hotels in Barcelona',
            'Create a honeymoon itinerary',
        ],
        news: [
            'Top tech news today',
            'Latest AI developments',
            'Business headlines this week',
            'What\'s happening in crypto?',
        ],
        health: [
            'Create a morning routine',
            'Exercises for desk workers',
            'Tips for better sleep',
            'How to manage stress',
        ],
        stock: [
            'Analyze AAPL stock',
            'Tech sector overview',
            'Crypto market trends',
            'Today\'s market summary',
        ],
        interview: [
            'Practice React interview',
            'System design questions',
            'Behavioral interview prep',
            'Data structures review',
        ],
    };
    return examples[agent] || examples.meta;
}
