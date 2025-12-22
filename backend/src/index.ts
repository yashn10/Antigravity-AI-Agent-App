import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';

// Import routes
import chatRoutes from './routes/chat.js';
import agentsRoutes from './routes/agents.js';
import historyRoutes from './routes/history.js';

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    });
});

// API routes
app.use('/api/chat', chatRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/history', historyRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🤖 AI Agent Platform Backend                            ║
║                                                           ║
║   Server running on http://localhost:${PORT}               ║
║   Environment: ${env.NODE_ENV.padEnd(41)}║
║                                                           ║
║   Available endpoints:                                    ║
║   - GET  /health          Health check                    ║
║   - GET  /api/agents      List all agents                 ║
║   - POST /api/chat        Send message to agent           ║
║   - POST /api/chat/stream Stream response from agent      ║
║   - GET  /api/history     Get chat history                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
