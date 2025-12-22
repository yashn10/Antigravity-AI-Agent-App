'use client';

import React from 'react';
import { CheckCircle2, Circle, Loader2, Wrench } from 'lucide-react';
import { ReasoningStep, ToolExecution } from '@/types';
import { cn } from '@/lib/utils';

interface ReasoningStepsProps {
    steps: ReasoningStep[];
    tools: ToolExecution[];
}

export default function ReasoningSteps({ steps, tools }: ReasoningStepsProps) {
    if (steps.length === 0 && tools.length === 0) return null;

    return (
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3 animate-message-enter">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Working on your request...</span>
            </div>

            {/* Reasoning Steps */}
            {steps.length > 0 && (
                <div className="space-y-2">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className={cn(
                                'flex items-start gap-2 text-sm',
                                step.status === 'completed' && 'text-muted-foreground'
                            )}
                        >
                            {step.status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : step.status === 'in_progress' ? (
                                <Loader2 className="w-4 h-4 animate-spin mt-0.5 flex-shrink-0" />
                            ) : (
                                <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <span className="font-medium">{step.title}</span>
                                {step.description && (
                                    <span className="text-muted-foreground ml-1">- {step.description}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tool Executions */}
            {tools.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Wrench className="w-3 h-3" />
                        <span>Tools used</span>
                    </div>
                    {tools.map((tool, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 text-xs bg-background/50 rounded px-2 py-1"
                        >
                            {tool.status === 'completed' ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                            ) : tool.status === 'running' ? (
                                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                            ) : (
                                <Circle className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="font-mono">{tool.toolName}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
