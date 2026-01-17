import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  await prisma.$disconnect();
  await redis.quit();
  
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 LBChat server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
});
