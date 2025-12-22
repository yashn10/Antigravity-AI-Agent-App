import { Router, Request, Response } from 'express';
import { getAllAgentsInfo, getAgentInfo, AgentType } from '../agents/index.js';

const router = Router();

// GET /api/agents - Get all available agents
router.get('/', (_req: Request, res: Response) => {
    const agents = getAllAgentsInfo();
    return res.json({ agents });
});

// GET /api/agents/:agentId - Get specific agent info
router.get('/:agentId', (req: Request, res: Response) => {
    const { agentId } = req.params;

    const validAgents: AgentType[] = ['meta', 'travel', 'news', 'health', 'stock', 'interview'];

    if (!validAgents.includes(agentId as AgentType)) {
        return res.status(404).json({
            error: 'Agent not found',
            validAgents
        });
    }

    const agent = getAgentInfo(agentId as AgentType);
    return res.json({ agent });
});

export default router;
