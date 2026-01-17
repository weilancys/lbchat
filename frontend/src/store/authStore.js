import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Login
            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { user, accessToken, refreshToken } = response.data;

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false
                    });

                    return { success: true };
                } catch (error) {
                    const message = error.response?.data?.error || 'Login failed';
                    set({ error: message, isLoading: false });
                    return { success: false, error: message };
                }
            },

            // Register
            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/register', data);
                    const { user, accessToken, refreshToken } = response.data;

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false
                    });

                    return { success: true };
                } catch (error) {
                    const message = error.response?.data?.error || 'Registration failed';
                    set({ error: message, isLoading: false });
                    return { success: false, error: message };
                }
            },

            // Logout
            logout: async () => {
                try {
                    const { refreshToken } = get();
                    await api.post('/auth/logout', { refreshToken });
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    set({
                        user: null,
                        accessToken: null,
                        refreshToken: null,
                        isAuthenticated: false
                    });
                }
            },

            // Refresh token
            refreshAccessToken: async () => {
                try {
                    const { refreshToken } = get();
                    if (!refreshToken) return false;

                    const response = await api.post('/auth/refresh', { refreshToken });
                    set({ accessToken: response.data.accessToken });
                    return true;
                } catch (error) {
                    get().logout();
                    return false;
                }
            },

            // Update user profile
            updateUser: (userData) => {
                set((state) => ({
                    user: { ...state.user, ...userData }
                }));
            },

            // Clear error
            clearError: () => set({ error: null })
        }),
        {
            name: 'lbchat-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);
