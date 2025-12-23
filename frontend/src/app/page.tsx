'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Bot,
    Plane,
    Newspaper,
    Heart,
    TrendingUp,
    Briefcase,
    Sparkles,
    CheckCircle2,
    ArrowRight,
    Shield,
    Zap
} from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-600">
                            Antigravity Agents
                        </span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                        <a href="#agents" className="hover:text-foreground transition-colors">Agents</a>
                        <a href="#about" className="hover:text-foreground transition-colors">About</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">Log In</Button>
                        </Link>
                        <Link href="/chat">
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Launch App</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 md:pt-36 md:pb-36 overflow-hidden">
                    {/* Background Elements */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full -z-10" />
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] -z-10" />

                    <div className="container mx-auto px-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6 animate-fade-in-up">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Powered by Advanced LLMs</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up md:max-w-4xl mx-auto">
                            Autonomous AI Agents for <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                Complex Real-World Tasks
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-100">
                            Orchestrate specialized agents in a unified workspace. From travel planning to market analysis, execute workflows seamlessly with intelligent context sharing.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
                            <Link href="/chat">
                                <Button size="lg" className="h-12 px-8 text-lg bg-white text-black hover:bg-gray-100 rounded-full transition-all duration-300 hover:scale-105">
                                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full border-zinc-700 hover:bg-zinc-800">
                                    View Features
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Agents Grid */}
                <section id="agents" className="py-24 bg-background relative">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Meet Your Intelligent Squad</h2>
                            <p className="text-muted-foreground max-w-xl mx-auto">
                                Specialized agents working together. Switch context instantly without losing state.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Meta Agent */}
                            <AgentCard
                                icon={<Bot className="h-6 w-6 text-indigo-400" />}
                                title="Meta Orchestrator"
                                description="Intelligently routes your requests to the right specialist and manages cross-agent workflows."
                                color="indigo"
                            />
                            {/* Travel Agent */}
                            <AgentCard
                                icon={<Plane className="h-6 w-6 text-blue-400" />}
                                title="Travel Specialist"
                                description="Plans complex trips, finds flights, and manages itineraries using Amadeus API."
                                color="blue"
                            />
                            {/* Stock Agent */}
                            <AgentCard
                                icon={<TrendingUp className="h-6 w-6 text-green-400" />}
                                title="Market Analyst"
                                description="Real-time stock data, technical analysis, and market news aggregation via Tavily."
                                color="green"
                            />
                            {/* News Agent */}
                            <AgentCard
                                icon={<Newspaper className="h-6 w-6 text-orange-400" />}
                                title="News Aggregator"
                                description="Curates top headlines and deep-dives into specific topics with personalized summaries."
                                color="orange"
                            />
                            {/* Health Agent */}
                            <AgentCard
                                icon={<Heart className="h-6 w-6 text-red-400" />}
                                title="Health Advisor"
                                description="Provides fitness advice, caloric tracking, and wellness plans based on your goals."
                                color="red"
                            />
                            {/* Interview Agent */}
                            <AgentCard
                                icon={<Briefcase className="h-6 w-6 text-purple-400" />}
                                title="Career Coach"
                                description="Conducts mock interviews, reviews resumes, and provides actionable career feedback."
                                color="purple"
                            />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-24 border-t border-border/40 bg-zinc-900/30">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8">
                                <h2 className="text-3xl md:text-4xl font-bold">
                                    Enterprise-Grade <br />
                                    <span className="text-indigo-400">Architecture</span>
                                </h2>
                                <p className="text-lg text-muted-foreground">
                                    Built on LangGraph and Next.js, our platform ensures robust state management and seamless execution.
                                </p>

                                <div className="space-y-4">
                                    <FeatureItem
                                        icon={<Zap className="h-5 w-5 text-yellow-400" />}
                                        title="Real-time Streaming"
                                        description="Low-latency responses streamed directly from Groq-powered LLMs."
                                    />
                                    <FeatureItem
                                        icon={<Shield className="h-5 w-5 text-emerald-400" />}
                                        title="State Persistence"
                                        description="Intelligent memory retains context across agent switches."
                                    />
                                    <FeatureItem
                                        icon={<Sparkles className="h-5 w-5 text-pink-400" />}
                                        title="Tool Integration"
                                        description="Direct access to live APIs for accurate, up-to-date information."
                                    />
                                </div>
                            </div>

                            {/* Visual representation */}
                            <div className="relative rounded-2xl border border-border/50 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -z-10" />
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                        <div className="bg-indigo-600 p-2 rounded-md">
                                            <Bot className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-indigo-100">Meta Agent</p>
                                            <p className="text-sm text-indigo-200/70">Routing request to Stock Agent...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 ml-8">
                                        <div className="bg-emerald-600 p-2 rounded-md">
                                            <TrendingUp className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-emerald-100">Stock Agent</p>
                                            <p className="text-sm text-emerald-200/70">Fetching AAPL data from Tavily API...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 ml-8">
                                        <div className="bg-zinc-700 p-2 rounded-md">
                                            <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-100">System</p>
                                            <p className="text-sm text-zinc-400">Analysis complete. Rendering chart.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/40 py-12 bg-black">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Bot className="h-6 w-6 text-indigo-500" />
                            <span className="font-bold text-lg">Antigravity Agents</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            © 2025 Antigravity Projects. All rights reserved.
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-muted-foreground hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="text-muted-foreground hover:text-white transition-colors">Terms</a>
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">Staff Login</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function AgentCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
    return (
        <div className="group p-6 rounded-2xl border border-border/50 bg-card hover:bg-card/80 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 cursor-default">
            <div className="mb-4 inline-block p-3 rounded-lg bg-background border border-border group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-400 transition-colors">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
