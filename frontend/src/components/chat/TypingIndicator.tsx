'use client';

import React from 'react';

interface TypingIndicatorProps {
    agentIcon?: string;
}

export default function TypingIndicator({ agentIcon = '🤖' }: TypingIndicatorProps) {
    return (
        <div className="flex gap-3 animate-message-enter">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
                {agentIcon}
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
                </div>
            </div>
        </div>
    );
}
