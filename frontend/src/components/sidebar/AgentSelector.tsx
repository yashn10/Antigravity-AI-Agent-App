'use client';

import React from 'react';
import { Plane, Newspaper, Heart, TrendingUp, Briefcase, Bot, Check } from 'lucide-react';
import { AgentType } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentSelectorProps {
    currentAgent: AgentType;
    onSelectAgent: (agent: AgentType) => void;
    disabled?: boolean;
}

interface AgentConfig {
    id: AgentType;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const agents: AgentConfig[] = [
    {
        id: 'meta',
        name: 'AI Assistant',
        description: 'Smart router to specialized agents',
        icon: <Bot className="w-5 h-5" />,
        color: 'bg-gradient-to-br from-violet-500 to-purple-600',
    },
    {
        id: 'travel',
        name: 'Travel Planner',
        description: 'Flights, hotels & itineraries',
        icon: <Plane className="w-5 h-5" />,
        color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    },
    {
        id: 'news',
        name: 'News Analyst',
        description: 'Latest news & insights',
        icon: <Newspaper className="w-5 h-5" />,
        color: 'bg-gradient-to-br from-orange-500 to-amber-600',
    },
    {
        id: 'health',
        name: 'Wellness Coach',
        description: 'Lifestyle & wellness tips',
        icon: <Heart className="w-5 h-5" />,
        color: 'bg-gradient-to-br from-green-500 to-emerald-600',
    },
    {
        id: 'stock',
        name: 'Market Analyst',
        description: 'Stock & market insights',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
        id: 'interview',
        name: 'Interview Coach',
        description: 'Mock interviews & feedback',
        icon: <Briefcase className="w-5 h-5" />,
        color: 'bg-gradient-to-br from-pink-500 to-rose-600',
    },
];

export default function AgentSelector({
    currentAgent,
    onSelectAgent,
    disabled = false,
}: AgentSelectorProps) {
    return (
        <TooltipProvider>
            <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-2">
                        AI Agents
                    </h3>
                    {agents.map((agent) => {
                        const isActive = currentAgent === agent.id;
                        return (
                            <Tooltip key={agent.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            'w-full justify-start gap-3 h-auto py-3 px-3',
                                            isActive && 'bg-accent',
                                            disabled && 'opacity-50 cursor-not-allowed'
                                        )}
                                        onClick={() => !disabled && onSelectAgent(agent.id)}
                                        disabled={disabled}
                                    >
                                        <div
                                            className={cn(
                                                'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg',
                                                agent.color
                                            )}
                                        >
                                            {agent.icon}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{agent.name}</span>
                                                {isActive && (
                                                    <Check className="w-4 h-4 text-primary" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {agent.description}
                                            </p>
                                        </div>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{agent.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </ScrollArea>
        </TooltipProvider>
    );
}
