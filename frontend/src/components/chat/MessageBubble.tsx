'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AgentType } from '@/types';
import { cn, formatDate } from '@/lib/utils';

interface MessageBubbleProps {
    message: Message;
}

const agentIcons: Record<AgentType, string> = {
    meta: '🤖',
    travel: '✈️',
    news: '📰',
    health: '🏃',
    stock: '📈',
    interview: '💼',
};

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;

    return (
        <div
            className={cn(
                'flex gap-3 animate-message-enter',
                isUser ? 'flex-row-reverse' : 'flex-row'
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                )}
            >
                {isUser ? '👤' : (message.agentType ? agentIcons[message.agentType] : '🤖')}
            </div>

            {/* Message Content */}
            <div
                className={cn(
                    'flex-1 max-w-[85%]',
                    isUser ? 'text-right' : 'text-left'
                )}
            >
                <div
                    className={cn(
                        'inline-block p-4 rounded-2xl',
                        isUser
                            ? 'bg-primary text-primary-foreground rounded-tr-md'
                            : 'bg-secondary text-secondary-foreground rounded-tl-md',
                        isStreaming && 'relative overflow-hidden'
                    )}
                >
                    {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    // Custom link handling
                                    a: ({ href, children }) => (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {children}
                                        </a>
                                    ),
                                    // Better code blocks
                                    code: ({ className, children }) => {
                                        const isInline = !className;
                                        return isInline ? (
                                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                                                {children}
                                            </code>
                                        ) : (
                                            <code className={cn('block p-3 rounded-lg bg-muted overflow-x-auto', className)}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    // Better lists
                                    ul: ({ children }) => (
                                        <ul className="list-disc list-inside space-y-1 my-2">
                                            {children}
                                        </ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="list-decimal list-inside space-y-1 my-2">
                                            {children}
                                        </ol>
                                    ),
                                    // Better headings
                                    h1: ({ children }) => (
                                        <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>
                                    ),
                                    // Paragraphs
                                    p: ({ children }) => (
                                        <p className="my-2 leading-relaxed">{children}</p>
                                    ),
                                    // Horizontal rules
                                    hr: () => (
                                        <hr className="my-4 border-border" />
                                    ),
                                    // Blockquotes
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-primary pl-4 my-2 italic">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {message.content || ' '}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Streaming indicator */}
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                    )}
                </div>

                {/* Timestamp */}
                <p className={cn(
                    'text-xs text-muted-foreground mt-1',
                    isUser ? 'text-right' : 'text-left'
                )}>
                    {formatDate(message.timestamp)}
                </p>
            </div>
        </div>
    );
}
