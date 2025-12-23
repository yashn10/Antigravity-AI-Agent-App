import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

// Agent identifiers
export type AgentType =
    | 'meta'
    | 'travel'
    | 'news'
    | 'health'
    | 'stock'
    | 'interview';

// Tool execution status
export interface ToolExecution {
    toolName: string;
    toolInput: Record<string, unknown>;
    toolOutput?: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    startedAt?: Date;
    completedAt?: Date;
}

// Reasoning step for transparency
export interface ReasoningStep {
    step: number;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
}

// Base state for all agents
export interface BaseAgentState {
    messages: BaseMessage[];
    currentAgent: AgentType;
    sessionId: string;
    userId?: string;

    // Tool and reasoning tracking
    toolExecutions: ToolExecution[];
    reasoningSteps: ReasoningStep[];

    // Control flow
    needsClarification: boolean;
    clarificationQuestion?: string;
    isComplete: boolean;

    // Error handling
    error?: string;
}

// Travel agent specific state
export interface TravelAgentState extends BaseAgentState {
    currentAgent: 'travel';
    travelDetails?: {
        origin?: string;
        destination?: string;
        departureDate?: string;
        returnDate?: string;
        travelers?: number;
        budget?: string;
        preferences?: string[];
        tripType?: 'one-way' | 'round-trip';
    };
    searchResults?: {
        flights?: unknown[];
        hotels?: unknown[];
        activities?: unknown[];
    };
    itinerary?: string;
    costBreakdown?: Record<string, number>;
}

// News agent specific state
export interface NewsAgentState extends BaseAgentState {
    currentAgent: 'news';
    newsPreferences?: {
        categories?: string[];
        keywords?: string[];
        sources?: string[];
        timeRange?: 'today' | 'week' | 'month';
    };
    articles?: Array<{
        title: string;
        description: string;
        source: string;
        url: string;
        publishedAt: string;
    }>;
    summary?: string;
    followUpInsights?: string[];
}

// Health agent specific state
export interface HealthAgentState extends BaseAgentState {
    currentAgent: 'health';
    userProfile?: {
        age?: number;
        gender?: string;
        activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
        goals?: string[];
        restrictions?: string[];
        currentIssues?: string[];
    };
    recommendations?: {
        diet?: string;
        exercise?: string;
        stressManagement?: string;
        dailyRoutine?: string;
    };
    disclaimer?: string;
}

// Stock agent specific state
export interface StockAgentState extends BaseAgentState {
    currentAgent: 'stock';
    stockQuery?: {
        symbols?: string[];
        sector?: string;
        analysisType?: 'overview' | 'detailed' | 'comparison';
    };
    marketData?: {
        trends?: string;
        stockSummaries?: Record<string, unknown>;
        analysis?: string;
    };
    disclaimer?: string;
}

// Interview agent specific state
export interface InterviewAgentState extends BaseAgentState {
    currentAgent: 'interview';
    interviewConfig?: {
        role: string;
        experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
        techStack: string[];
        interviewType: 'technical' | 'behavioral' | 'system_design' | 'mixed';
        duration?: number;
    };
    currentQuestion?: {
        question: string;
        expectedTopics: string[];
        difficulty: 'easy' | 'medium' | 'hard';
    };
    answers?: Array<{
        question: string;
        answer: string;
        score: number;
        feedback: string;
    }>;
    overallScore?: number;
    finalFeedback?: string;
}

// Meta agent routing intent types (includes special routing states)
export type MetaRoutingIntent = AgentType | 'greet' | 'clarify';

// Meta orchestrator state
export interface MetaAgentState extends BaseAgentState {
    currentAgent: 'meta';
    detectedIntent?: {
        primaryAgent: MetaRoutingIntent;
        confidence: number;
        reasoning: string;
    };
    routedTo?: AgentType;
    agentResponse?: string;
}

// Union type for all agent states
export type AgentState =
    | TravelAgentState
    | NewsAgentState
    | HealthAgentState
    | StockAgentState
    | InterviewAgentState
    | MetaAgentState;

// Chat message for API
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    agentType?: AgentType;
    toolExecutions?: ToolExecution[];
    reasoningSteps?: ReasoningStep[];
}

// API request/response types
export interface ChatRequest {
    message: string;
    sessionId?: string;
    agentType?: AgentType;
    userId?: string;
}

export interface ChatResponse {
    sessionId: string;
    message: ChatMessage;
    isComplete: boolean;
    needsClarification: boolean;
}

// Streaming event types
export type StreamEventType =
    | 'message_start'
    | 'message_delta'
    | 'message_complete'
    | 'tool_start'
    | 'tool_complete'
    | 'reasoning_step'
    | 'agent_switch'
    | 'error';

export interface StreamEvent {
    type: StreamEventType;
    data: unknown;
    timestamp: Date;
}

// Agent metadata for UI
export interface AgentInfo {
    id: AgentType;
    name: string;
    description: string;
    icon: string;
    capabilities: string[];
    examples: string[];
}

export const AGENT_INFO: Record<AgentType, AgentInfo> = {
    meta: {
        id: 'meta',
        name: 'AI Assistant',
        description: 'Smart orchestrator that routes your queries to the right specialist agent',
        icon: '🤖',
        capabilities: [
            'Understands your intent',
            'Routes to specialized agents',
            'Handles clarifications',
        ],
        examples: [
            'Help me plan a trip to Japan',
            'What\'s happening in tech news today?',
            'I want to improve my daily routine',
        ],
    },
    travel: {
        id: 'travel',
        name: 'Travel Planner',
        description: 'Plans complete trips with flights, hotels, and itineraries',
        icon: '✈️',
        capabilities: [
            'Flight search and booking info',
            'Hotel recommendations',
            'Day-wise itinerary planning',
            'Budget optimization',
            'Travel tips and insights',
        ],
        examples: [
            'Plan a 5-day trip to Paris for 2 people in March',
            'Find affordable flights from NYC to Tokyo',
            'Create a honeymoon itinerary for Maldives',
        ],
    },
    news: {
        id: 'news',
        name: 'News Analyst',
        description: 'Fetches and analyzes the latest news with deep insights',
        icon: '📰',
        capabilities: [
            'Real-time news updates',
            'Category-based filtering',
            'Deep summaries with sources',
            'Follow-up insights',
            'Multi-source verification',
        ],
        examples: [
            'What are the top tech news today?',
            'Summarize the latest in AI developments',
            'What\'s happening in the stock market?',
        ],
    },
    health: {
        id: 'health',
        name: 'Wellness Coach',
        description: 'Provides personalized wellness guidance and lifestyle tips',
        icon: '🏃',
        capabilities: [
            'Personalized diet suggestions',
            'Exercise plan recommendations',
            'Stress management techniques',
            'Daily routine optimization',
            'Sleep improvement tips',
        ],
        examples: [
            'Help me create a morning routine',
            'Suggest exercises for desk workers',
            'How can I manage stress better?',
        ],
    },
    stock: {
        id: 'stock',
        name: 'Market Analyst',
        description: 'Provides market intelligence and stock analysis',
        icon: '📈',
        capabilities: [
            'Market trend analysis',
            'Stock summaries',
            'Bull/bear case reasoning',
            'Sector analysis',
            'Risk assessment',
        ],
        examples: [
            'Analyze the current tech sector trends',
            'Give me an overview of AAPL stock',
            'What are the risks in the crypto market?',
        ],
    },
    interview: {
        id: 'interview',
        name: 'Interview Coach',
        description: 'Conducts mock interviews with real-time feedback',
        icon: '💼',
        capabilities: [
            'Role-specific questions',
            'Experience-level adaptation',
            'Real-time scoring',
            'Detailed feedback',
            'Improvement suggestions',
        ],
        examples: [
            'Practice a React developer interview',
            'Prepare me for a system design interview',
            'Mock behavioral interview for PM role',
        ],
    },
};

// Helper functions
export function createBaseState(
    agentType: AgentType,
    sessionId: string,
    initialMessage?: string
): BaseAgentState {
    const messages: BaseMessage[] = [];
    if (initialMessage) {
        messages.push(new HumanMessage(initialMessage));
    }

    return {
        messages,
        currentAgent: agentType,
        sessionId,
        toolExecutions: [],
        reasoningSteps: [],
        needsClarification: false,
        isComplete: false,
    };
}

export function addReasoningStep(
    state: BaseAgentState,
    title: string,
    description: string
): ReasoningStep {
    const step: ReasoningStep = {
        step: state.reasoningSteps.length + 1,
        title,
        description,
        status: 'pending',
    };
    state.reasoningSteps.push(step);
    return step;
}

export function updateReasoningStep(
    state: BaseAgentState,
    stepIndex: number,
    status: ReasoningStep['status']
): void {
    if (state.reasoningSteps[stepIndex]) {
        state.reasoningSteps[stepIndex].status = status;
    }
}
