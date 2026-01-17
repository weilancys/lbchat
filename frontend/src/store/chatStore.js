import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
    conversations: [],
    activeConversation: null,
    messages: {},
    typingUsers: {},
    onlineUsers: new Set(),

    // Set conversations
    setConversations: (conversations) => {
        set({ conversations });
    },

    // Add or update conversation
    updateConversation: (conversation) => {
        set((state) => {
            const exists = state.conversations.find(c => c.id === conversation.id);
            if (exists) {
                return {
                    conversations: state.conversations.map(c =>
                        c.id === conversation.id ? { ...c, ...conversation } : c
                    )
                };
            }
            return {
                conversations: [conversation, ...state.conversations]
            };
        });
    },

    // Set active conversation
    setActiveConversation: (conversation) => {
        set({ activeConversation: conversation });
    },

    // Set messages for a conversation
    setMessages: (conversationId, messages) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: messages
            }
        }));
    },

    // Add new message
    addMessage: (conversationId, message) => {
        set((state) => {
            const existing = state.messages[conversationId] || [];
            // Avoid duplicates
            if (existing.find(m => m.id === message.id)) {
                return state;
            }
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, message]
                }
            };
        });

        // Update conversation's last message
        get().updateConversation({
            id: conversationId,
            messages: [message],
            updatedAt: new Date().toISOString()
        });
    },

    // Update message
    updateMessage: (conversationId, messageId, updates) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map(m =>
                    m.id === messageId ? { ...m, ...updates } : m
                )
            }
        }));
    },

    // Delete message
    deleteMessage: (conversationId, messageId) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map(m =>
                    m.id === messageId ? { ...m, isDeleted: true } : m
                )
            }
        }));
    },

    // Set typing users
    setTypingUser: (conversationId, user, isTyping) => {
        set((state) => {
            const typing = { ...state.typingUsers };
            if (!typing[conversationId]) {
                typing[conversationId] = {};
            }

            if (isTyping) {
                typing[conversationId][user.id] = user;
            } else {
                delete typing[conversationId][user.id];
            }

            return { typingUsers: typing };
        });
    },

    // Set user online status
    setUserOnline: (userId, isOnline) => {
        set((state) => {
            const onlineUsers = new Set(state.onlineUsers);
            if (isOnline) {
                onlineUsers.add(userId);
            } else {
                onlineUsers.delete(userId);
            }
            return { onlineUsers };
        });
    },

    // Clear store
    clear: () => {
        set({
            conversations: [],
            activeConversation: null,
            messages: {},
            typingUsers: {},
            onlineUsers: new Set()
        });
    }
}));
