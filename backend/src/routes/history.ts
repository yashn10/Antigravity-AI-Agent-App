import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory history storage (replace with DB in production)
interface ChatHistoryItem {
    id: string;
    sessionId: string;
    title: string;
    lastMessage: string;
    agentType: string;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const history = new Map<string, ChatHistoryItem[]>();

// GET /api/history - Get all chat history for a user
router.get('/', (req: Request, res: Response) => {
    const userId = req.query.userId as string || 'default';
    const userHistory = history.get(userId) || [];

    // Sort by most recent first
    const sortedHistory = [...userHistory].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    return res.json({ history: sortedHistory });
});

// POST /api/history - Create/update a history entry
router.post('/', (req: Request, res: Response) => {
    const { userId = 'default', sessionId, title, lastMessage, agentType, messageCount } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }

    let userHistory = history.get(userId);
    if (!userHistory) {
        userHistory = [];
        history.set(userId, userHistory);
    }

    // Check if entry exists
    const existingIndex = userHistory.findIndex(h => h.sessionId === sessionId);

    if (existingIndex >= 0) {
        // Update existing
        userHistory[existingIndex] = {
            ...userHistory[existingIndex],
            lastMessage: lastMessage || userHistory[existingIndex].lastMessage,
            messageCount: messageCount || userHistory[existingIndex].messageCount,
            updatedAt: new Date(),
        };
        return res.json({ item: userHistory[existingIndex] });
    } else {
        // Create new
        const newItem: ChatHistoryItem = {
            id: uuidv4(),
            sessionId,
            title: title || 'New Chat',
            lastMessage: lastMessage || '',
            agentType: agentType || 'meta',
            messageCount: messageCount || 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        userHistory.push(newItem);
        return res.json({ item: newItem });
    }
});

// DELETE /api/history/:sessionId - Delete a history entry
router.delete('/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.query.userId as string || 'default';

    const userHistory = history.get(userId);
    if (!userHistory) {
        return res.status(404).json({ error: 'No history found' });
    }

    const index = userHistory.findIndex(h => h.sessionId === sessionId);
    if (index < 0) {
        return res.status(404).json({ error: 'History entry not found' });
    }

    userHistory.splice(index, 1);
    return res.json({ success: true });
});

// DELETE /api/history - Clear all history for a user
router.delete('/', (req: Request, res: Response) => {
    const userId = req.query.userId as string || 'default';
    history.delete(userId);
    return res.json({ success: true });
});

export default router;
