import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { handleWebRTC } from './webrtc.js';

let io;

export const getIO = () => io;

export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                }
            });

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user.id;
        console.log(`User connected: ${socket.user.username}`);

        // Store socket ID in Redis for multi-server support
        await redis.set(`user:${userId}:socket`, socket.id);

        // Update online status
        await prisma.user.update({
            where: { id: userId },
            data: { isOnline: true, lastSeen: new Date() }
        });

        // Join user's conversation rooms
        const conversations = await prisma.conversationMember.findMany({
            where: { userId },
            select: { conversationId: true }
        });

        conversations.forEach(({ conversationId }) => {
            socket.join(`conversation:${conversationId}`);
        });

        // Broadcast online status to contacts
        socket.broadcast.emit('user:online', { userId, user: socket.user });

        // Handle messages
        socket.on('message:send', async (data) => {
            try {
                const { conversationId, content, type = 'TEXT', fileId } = data;

                // Create message in database
                const message = await prisma.message.create({
                    data: {
                        conversationId,
                        senderId: userId,
                        content,
                        type,
                        fileId
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        },
                        file: {
                            select: {
                                id: true,
                                filename: true,
                                originalName: true,
                                mimeType: true,
                                size: true
                            }
                        }
                    }
                });

                // Update conversation timestamp
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() }
                });

                // Broadcast to conversation room
                io.to(`conversation:${conversationId}`).emit('message:new', {
                    message: {
                        ...message,
                        file: message.file ? {
                            ...message.file,
                            size: Number(message.file.size)
                        } : null
                    }
                });
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicators
        socket.on('typing:start', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:start', {
                conversationId,
                user: socket.user
            });
        });

        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                conversationId,
                userId
            });
        });

        // Join new conversation
        socket.on('conversation:join', ({ conversationId }) => {
            socket.join(`conversation:${conversationId}`);
        });

        // Leave conversation
        socket.on('conversation:leave', ({ conversationId }) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // WebRTC signaling
        handleWebRTC(socket, io);

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.username}`);

            await redis.del(`user:${userId}:socket`);

            await prisma.user.update({
                where: { id: userId },
                data: { isOnline: false, lastSeen: new Date() }
            });

            socket.broadcast.emit('user:offline', { userId });
        });
    });

    console.log('✅ Socket.IO initialized');
    return io;
};
