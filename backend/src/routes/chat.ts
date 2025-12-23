import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
    invokeAgent,
    invokeMetaAgent,
    AgentType,
    ChatMessage,
    ChatRequest
} from '../agents/index.js';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

const router = Router();

// In-memory session storage (replace with Redis/DB in production)
const sessions = new Map<string, {
    messages: BaseMessage[];
    currentAgent: AgentType;
    agentState: Record<string, unknown>;  // Agent-specific state (travelDetails, stockQuery, etc.)
    createdAt: Date;
    updatedAt: Date;
}>();

// Session cleanup (remove sessions older than 24 hours)
setInterval(() => {
    const now = new Date();
    for (const [sessionId, session] of sessions) {
        const hoursDiff = (now.getTime() - session.updatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
            sessions.delete(sessionId);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// POST /api/chat - Send a message to an agent
router.post('/', async (req: Request, res: Response) => {
    try {
        const { message, sessionId, agentType, userId } = req.body as ChatRequest;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string'
            });
        }

        // Get or create session
        const currentSessionId = sessionId || uuidv4();
        let session = sessions.get(currentSessionId);

        if (!session) {
            session = {
                messages: [],
                currentAgent: (agentType as AgentType) || 'meta',
                agentState: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            sessions.set(currentSessionId, session);
        }

        // Clear session if agent changed (start fresh conversation per agent)
        if (agentType && session.currentAgent !== agentType) {
            session.messages = [];
            session.agentState = {};
        }

        // Determine which agent to use
        const targetAgent: AgentType = (agentType as AgentType) || session.currentAgent || 'meta';

        // Invoke the agent with existing state
        const result = await invokeAgent(
            targetAgent,
            message,
            currentSessionId,
            session.messages,
            session.agentState
        );

        // Update session with new messages and agent state
        session.messages.push(new HumanMessage(message));
        session.messages.push(new AIMessage(result.response));
        session.currentAgent = targetAgent;
        session.agentState = result.state as Record<string, unknown>;  // Persist agent state
        session.updatedAt = new Date();

        // Prepare response
        const chatMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: result.response,
            timestamp: new Date(),
            agentType: targetAgent,
            reasoningSteps: (result.state as { reasoningSteps?: unknown[] })?.reasoningSteps as ChatMessage['reasoningSteps'],
            toolExecutions: (result.state as { toolExecutions?: unknown[] })?.toolExecutions as ChatMessage['toolExecutions'],
        };

        return res.json({
            sessionId: currentSessionId,
            message: chatMessage,
            isComplete: true,
            needsClarification: (result.state as { needsClarification?: boolean })?.needsClarification || false,
        });

    } catch (error) {
        console.error('Chat error:', error);
        return res.status(500).json({
            error: 'Failed to process message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// POST /api/chat/stream - Stream a response from an agent
router.post('/stream', async (req: Request, res: Response) => {
    try {
        const { message, sessionId, agentType } = req.body as ChatRequest;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string'
            });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Get or create session
        const currentSessionId = sessionId || uuidv4();
        let session = sessions.get(currentSessionId);

        if (!session) {
            session = {
                messages: [],
                currentAgent: (agentType as AgentType) || 'meta',
                agentState: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            sessions.set(currentSessionId, session);
        }

        // Clear session if agent changed (start fresh conversation per agent)
        if (agentType && session.currentAgent !== agentType) {
            session.messages = [];
            session.agentState = {};
        }

        const targetAgent: AgentType = (agentType as AgentType) || session.currentAgent || 'meta';

        // Send initial event
        res.write(`data: ${JSON.stringify({
            type: 'message_start',
            sessionId: currentSessionId,
            agentType: targetAgent,
        })}\n\n`);

        // Invoke agent with existing state
        const result = await invokeAgent(
            targetAgent,
            message,
            currentSessionId,
            session.messages,
            session.agentState
        );

        // Send reasoning steps
        const state = result.state as { reasoningSteps?: unknown[]; toolExecutions?: unknown[] };
        if (state.reasoningSteps && Array.isArray(state.reasoningSteps)) {
            for (const step of state.reasoningSteps) {
                res.write(`data: ${JSON.stringify({
                    type: 'reasoning_step',
                    data: step,
                })}\n\n`);
            }
        }

        // Send tool executions
        if (state.toolExecutions && Array.isArray(state.toolExecutions)) {
            for (const tool of state.toolExecutions) {
                res.write(`data: ${JSON.stringify({
                    type: 'tool_complete',
                    data: tool,
                })}\n\n`);
            }
        }

        // Stream the response in chunks (simulated for non-streaming LLM)
        const responseChunks = result.response.match(/.{1,100}/gs) || [result.response];
        for (const chunk of responseChunks) {
            res.write(`data: ${JSON.stringify({
                type: 'message_delta',
                content: chunk,
            })}\n\n`);
            // Small delay for realistic streaming feel
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        // Update session with new messages and agent state
        session.messages.push(new HumanMessage(message));
        session.messages.push(new AIMessage(result.response));
        session.currentAgent = targetAgent;
        session.agentState = result.state as Record<string, unknown>;
        session.updatedAt = new Date();

        // Send completion event
        res.write(`data: ${JSON.stringify({
            type: 'message_complete',
            sessionId: currentSessionId,
            messageId: uuidv4(),
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`);
        res.end();
    }
});

// GET /api/chat/:sessionId - Get chat history
router.get('/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const messages: ChatMessage[] = session.messages.map((msg, index) => ({
        id: `${sessionId}-${index}`,
        role: msg._getType() === 'human' ? 'user' : 'assistant',
        content: String(msg.content),
        timestamp: session.createdAt,
        agentType: session.currentAgent,
    }));

    return res.json({
        sessionId,
        messages,
        currentAgent: session.currentAgent,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    });
});

// DELETE /api/chat/:sessionId - Clear chat history
router.delete('/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const deleted = sessions.delete(sessionId);

    if (!deleted) {
        return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({ success: true, message: 'Session deleted' });
});

export default router;
