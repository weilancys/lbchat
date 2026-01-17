import { redis } from '../config/redis.js';

// WebRTC signaling handlers
export const handleWebRTC = (socket, io) => {
    const userId = socket.user.id;

    // Initiate a call
    socket.on('call:offer', async ({ targetUserId, offer, callType }) => {
        try {
            const targetSocketId = await redis.get(`user:${targetUserId}:socket`);

            if (!targetSocketId) {
                socket.emit('call:error', { message: 'User is offline' });
                return;
            }

            io.to(targetSocketId).emit('call:incoming', {
                callerId: userId,
                caller: socket.user,
                offer,
                callType // 'audio' or 'video'
            });

            console.log(`Call offer from ${socket.user.username} to ${targetUserId}`);
        } catch (error) {
            console.error('Error handling call offer:', error);
            socket.emit('call:error', { message: 'Failed to initiate call' });
        }
    });

    // Answer a call
    socket.on('call:answer', async ({ targetUserId, answer }) => {
        try {
            const targetSocketId = await redis.get(`user:${targetUserId}:socket`);

            if (targetSocketId) {
                io.to(targetSocketId).emit('call:answered', {
                    userId,
                    answer
                });
            }

            console.log(`Call answered by ${socket.user.username}`);
        } catch (error) {
            console.error('Error handling call answer:', error);
        }
    });

    // Reject a call
    socket.on('call:reject', async ({ targetUserId }) => {
        try {
            const targetSocketId = await redis.get(`user:${targetUserId}:socket`);

            if (targetSocketId) {
                io.to(targetSocketId).emit('call:rejected', {
                    userId,
                    user: socket.user
                });
            }

            console.log(`Call rejected by ${socket.user.username}`);
        } catch (error) {
            console.error('Error handling call reject:', error);
        }
    });

    // ICE candidate exchange
    socket.on('call:ice-candidate', async ({ targetUserId, candidate }) => {
        try {
            const targetSocketId = await redis.get(`user:${targetUserId}:socket`);

            if (targetSocketId) {
                io.to(targetSocketId).emit('call:ice-candidate', {
                    userId,
                    candidate
                });
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    });

    // End call
    socket.on('call:end', async ({ targetUserId }) => {
        try {
            const targetSocketId = await redis.get(`user:${targetUserId}:socket`);

            if (targetSocketId) {
                io.to(targetSocketId).emit('call:ended', {
                    userId,
                    user: socket.user
                });
            }

            console.log(`Call ended by ${socket.user.username}`);
        } catch (error) {
            console.error('Error handling call end:', error);
        }
    });
};
