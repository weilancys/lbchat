import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import fileRoutes from './routes/files.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TURN server credentials for WebRTC
app.get('/api/turn', (req, res) => {
    const turnHost = process.env.TURN_SERVER_URL?.replace('turn:', '') || '';
    const turnUser = process.env.TURN_USERNAME || '';
    const turnPass = process.env.TURN_PASSWORD || '';

    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];

    // Add TURN servers with multiple transports if configured
    if (turnHost && turnUser && turnPass) {
        // Extract just the host:port from turnHost
        const hostPort = turnHost.split('?')[0]; // Remove any query params
        const host = hostPort.split(':')[0]; // Just the IP/hostname
        const port = hostPort.split(':')[1] || '3478';

        iceServers.push({
            urls: [
                `turn:${host}:${port}?transport=udp`,
                `turn:${host}:${port}?transport=tcp`
            ],
            username: turnUser,
            credential: turnPass
        });
    }

    res.json({
        iceServers,
        // Force relay mode if direct connections are failing
        // iceTransportPolicy: 'relay'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);

// Error handler
app.use(errorHandler);

export default app;
