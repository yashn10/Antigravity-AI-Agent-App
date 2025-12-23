'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import AgentSelector from '@/components/sidebar/AgentSelector';
import ChatInterface from '@/components/chat/ChatInterface';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const {
        messages,
        isLoading,
        currentAgent,
        reasoningSteps,
        toolExecutions,
        sendMessage,
        setAgent,
        clearMessages,
    } = useChat();

    const handleNewChat = () => {
        clearMessages();
    };

    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <Header
                onNewChat={handleNewChat}
                onToggleSidebar={handleToggleSidebar}
                isSidebarOpen={sidebarOpen}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={cn(
                        'w-72 border-r border-border bg-background flex-shrink-0 transition-all duration-300 ease-in-out',
                        'fixed md:relative inset-y-0 left-0 z-40 pt-14 md:pt-0',
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-0'
                    )}
                >
                    <AgentSelector
                        currentAgent={currentAgent}
                        onSelectAgent={(agent) => {
                            setAgent(agent);
                            // Close sidebar on mobile after selection
                            if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                            }
                        }}
                        disabled={isLoading}
                    />
                </aside>

                {/* Backdrop for mobile sidebar */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-hidden">
                    <ChatInterface
                        messages={messages}
                        isLoading={isLoading}
                        onSendMessage={sendMessage}
                        currentAgent={currentAgent}
                        reasoningSteps={reasoningSteps}
                        toolExecutions={toolExecutions}
                    />
                </main>
            </div>
        </div>
    );
}
