'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sun, Plus, Menu, X, Github } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderProps {
    onNewChat: () => void;
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export default function Header({ onNewChat, onToggleSidebar, isSidebarOpen }: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <TooltipProvider>
            <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    {/* Sidebar Toggle */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleSidebar}
                                className="md:hidden"
                            >
                                {isSidebarOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                        </TooltipContent>
                    </Tooltip>

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
                            A
                        </div>
                        <span className="font-semibold text-lg hidden sm:block">Agent Platform</span>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    {/* New Chat Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onNewChat}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">New Chat</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Start a new conversation</TooltipContent>
                    </Tooltip>

                    {/* Theme Toggle */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            >
                                {mounted && (theme === 'dark' ? (
                                    <Sun className="h-5 w-5" />
                                ) : (
                                    <Moon className="h-5 w-5" />
                                ))}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle theme</TooltipContent>
                    </Tooltip>

                    {/* GitHub Link */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                asChild
                            >
                                <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Github className="h-5 w-5" />
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>View on GitHub</TooltipContent>
                    </Tooltip>
                </div>
            </header>
        </TooltipProvider>
    );
}
