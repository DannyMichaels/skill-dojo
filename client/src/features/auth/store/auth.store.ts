import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '../types/auth.types';
import * as authService from '../services/auth.service';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

interface AuthStore {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
  clearError: () => void;
}

const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        user: null,
        loading: false,
        error: null,

        login: async (data) => {
          set({ loading: true, error: null });
          try {
            const res = await authService.loginUser(data);
            localStorage.setItem('__dojo-auth-token', res.token);
            set({ token: res.token, user: res.user, loading: false });
          } catch (err: any) {
            set({
              loading: false,
              error: err.response?.data?.error || 'Login failed',
            });
            throw err;
          }
        },

        register: async (data) => {
          set({ loading: true, error: null });
          try {
            const res = await authService.registerUser(data);
            localStorage.setItem('__dojo-auth-token', res.token);
            set({ token: res.token, user: res.user, loading: false });
          } catch (err: any) {
            set({
              loading: false,
              error: err.response?.data?.error || 'Registration failed',
            });
            throw err;
          }
        },

        verifyEmail: async (code) => {
          set({ loading: true, error: null });
          try {
            const user = await authService.verifyEmail(code);
            set({ user, loading: false });
          } catch (err: any) {
            set({
              loading: false,
              error: err.response?.data?.error || 'Verification failed',
            });
            throw err;
          }
        },

        resendVerification: async () => {
          set({ loading: true, error: null });
          try {
            await authService.resendVerificationCode();
            set({ loading: false });
          } catch (err: any) {
            set({
              loading: false,
              error: err.response?.data?.error || 'Failed to resend code',
            });
            throw err;
          }
        },

        fetchMe: async () => {
          try {
            const user = await authService.getMe();
            set({ user });
          } catch {
            set({ token: null, user: null });
            localStorage.removeItem('__dojo-auth-token');
          }
        },

        setUser: (user) => set({ user }),

        logout: () => {
          localStorage.removeItem('__dojo-auth-token');
          set({ token: null, user: null, error: null });
        },

        clearError: () => set({ error: null }),
      }),
      { name: '__dojo-auth-storage', partialize: (state) => ({ token: state.token, user: state.user }) },
    ),
  ),
);

export default useAuthStore;
