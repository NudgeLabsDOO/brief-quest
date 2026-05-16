import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, signUpWithEmail, signInWithEmail, signOut, getCurrentUser, getSession } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Actions
  initializeAuth: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initializeAuth: async () => {
    try {
      set({ loading: true, error: null });
      const session = await getSession();
      const user = await getCurrentUser();

      set({
        session,
        user,
        loading: false,
      });

      // Listen for auth changes (subscription cleanup happens in listener)
      supabase.auth.onAuthStateChange((_event, newSession) => {
        set({ session: newSession, user: newSession?.user ?? null });
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Auth initialization failed',
        loading: false,
      });
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await signUpWithEmail(email, password, fullName);

      if (error) {
        throw error;
      }

      set({
        user: data.user,
        session: data.session,
        loading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      set({ error: errorMessage, loading: false });
      throw err;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        throw error;
      }

      set({
        user: data.user,
        session: data.session,
        loading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      set({ error: errorMessage, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await signOut();

      if (error) {
        throw error;
      }

      set({
        user: null,
        session: null,
        loading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      set({ error: errorMessage, loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
