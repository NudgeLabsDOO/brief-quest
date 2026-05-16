import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useProgressStore } from './progressStore';

async function loadProgressForUser(userId: string) {
  const { data, error } = await supabase
    .from('player_progress')
    .select('completed_levels')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Failed to load progress:', error.message);
    return;
  }

  if (data) {
    useProgressStore.getState().loadFromServer({
      userId,
      completedLevels: data.completed_levels ?? [],
    });
  } else {
    useProgressStore.getState().setUserId(userId);
  }
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;

  initializeAuth: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  initializeAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, loading: false });

      if (session?.user) {
        loadProgressForUser(session.user.id);
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          loadProgressForUser(session.user.id);
        }
      });
    } catch (err) {
      console.warn('[Auth] Supabase not configured — offline mode.');
      set({ loading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) throw error;
  },

  signUpWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ loading: false });
    if (error) throw error;
  },

  signInWithMagicLink: async (email) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    set({ loading: false });
    if (error) throw error;
  },

  logout: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
  },
}));
