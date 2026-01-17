import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';

const WS_URL = import.meta.env.VITE_WS_URL || '';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const connectSocket = () => {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
        console.error('No auth token for socket connection');
        return null;
    }

    if (socket?.connected) {
        return socket;
    }

    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
    }

    socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
        console.log('Socket connected');
        reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', async (error) => {
        console.error('Socket connection error:', error.message);

        // If authentication error, try to refresh token and reconnect
        if (error.message === 'Invalid token' || error.message === 'Authentication required') {
            reconnectAttempts++;

            if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
                console.log('Attempting token refresh and reconnect...');
                const refreshed = await useAuthStore.getState().refreshAccessToken();

                if (refreshed) {
                    // Reconnect with new token
                    socket.auth.token = useAuthStore.getState().accessToken;
                    socket.connect();
                } else {
                    console.error('Token refresh failed, logging out');
                    useAuthStore.getState().logout();
                }
            }
        }
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Message handlers
    socket.on('message:new', ({ message }) => {
        useChatStore.getState().addMessage(message.conversationId, message);
    });

    // Typing handlers
    socket.on('typing:start', ({ conversationId, user }) => {
        useChatStore.getState().setTypingUser(conversationId, user, true);
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
        useChatStore.getState().setTypingUser(conversationId, { id: userId }, false);
    });

    // Presence handlers
    socket.on('user:online', ({ userId }) => {
        useChatStore.getState().setUserOnline(userId, true);
    });

    socket.on('user:offline', ({ userId }) => {
        useChatStore.getState().setUserOnline(userId, false);
    });

    // Call handlers
    socket.on('call:incoming', ({ callerId, caller, offer, callType }) => {
        useCallStore.getState().setIncomingCall(caller, offer, callType);
    });

    socket.on('call:answered', ({ userId, answer }) => {
        window.dispatchEvent(new CustomEvent('call:answered', { detail: { userId, answer } }));
    });

    socket.on('call:rejected', ({ userId, user }) => {
        useCallStore.getState().endCall();
    });

    socket.on('call:ice-candidate', ({ userId, candidate }) => {
        window.dispatchEvent(new CustomEvent('call:ice-candidate', { detail: { userId, candidate } }));
    });

    socket.on('call:ended', ({ userId }) => {
        useCallStore.getState().endCall();
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    reconnectAttempts = 0;
};

export const getSocket = () => socket;

// Reconnect with fresh token (call after token refresh)
export const reconnectSocket = () => {
    if (socket) {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            socket.auth.token = token;
            if (!socket.connected) {
                socket.connect();
            }
        }
    }
};

// Helper functions
export const sendMessage = (conversationId, content, type = 'TEXT', fileId = null) => {
    if (socket?.connected) {
        socket.emit('message:send', { conversationId, content, type, fileId });
    } else {
        console.error('Socket not connected, cannot send message');
        // Try to reconnect
        reconnectSocket();
    }
};

export const startTyping = (conversationId) => {
    socket?.emit('typing:start', { conversationId });
};

export const stopTyping = (conversationId) => {
    socket?.emit('typing:stop', { conversationId });
};

export const joinConversation = (conversationId) => {
    socket?.emit('conversation:join', { conversationId });
};

export const leaveConversation = (conversationId) => {
    socket?.emit('conversation:leave', { conversationId });
};

// Call functions
export const sendCallOffer = (targetUserId, offer, callType) => {
    socket?.emit('call:offer', { targetUserId, offer, callType });
};

export const sendCallAnswer = (targetUserId, answer) => {
    socket?.emit('call:answer', { targetUserId, answer });
};

export const sendCallReject = (targetUserId) => {
    socket?.emit('call:reject', { targetUserId });
};

export const sendIceCandidate = (targetUserId, candidate) => {
    socket?.emit('call:ice-candidate', { targetUserId, candidate });
};

export const sendCallEnd = (targetUserId) => {
    socket?.emit('call:end', { targetUserId });
};
