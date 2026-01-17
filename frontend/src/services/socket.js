import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';

const WS_URL = import.meta.env.VITE_WS_URL || '';

let socket = null;

export const connectSocket = () => {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
        console.error('No auth token for socket connection');
        return null;
    }

    if (socket?.connected) {
        return socket;
    }

    socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
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
        // Handle in WebRTC service
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
};

export const getSocket = () => socket;

// Helper functions
export const sendMessage = (conversationId, content, type = 'TEXT', fileId = null) => {
    socket?.emit('message:send', { conversationId, content, type, fileId });
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
