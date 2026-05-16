import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LevelCompletion, PlayerProgress } from '../types';

interface ProgressStore {
  userId?: string;
  completedLevels: LevelCompletion[];

  // Actions
  recordCompletion: (completion: LevelCompletion) => void;
  isLevelCompleted: (scenarioId: string) => boolean;
  getLevelCompletion: (scenarioId: string) => LevelCompletion | undefined;
  getTotalStars: () => number;
  setUserId: (userId: string) => void;
  loadFromServer: (progress: PlayerProgress) => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      userId: undefined,
      completedLevels: [],

      recordCompletion: (completion) => {
        set(state => {
          const existing = state.completedLevels.findIndex(
            c => c.scenarioId === completion.scenarioId
          );
          if (existing >= 0) {
            // Only update if new score is better
            const prev = state.completedLevels[existing];
            if (completion.score <= prev.score) return state;
            const updated = [...state.completedLevels];
            updated[existing] = completion;
            return { completedLevels: updated };
          }
          return { completedLevels: [...state.completedLevels, completion] };
        });
      },

      isLevelCompleted: (scenarioId) => {
        return get().completedLevels.some(c => c.scenarioId === scenarioId);
      },

      getLevelCompletion: (scenarioId) => {
        return get().completedLevels.find(c => c.scenarioId === scenarioId);
      },

      getTotalStars: () => {
        return get().completedLevels.reduce((sum, c) => sum + c.starsEarned, 0);
      },

      setUserId: (userId) => set({ userId }),

      loadFromServer: (progress) => {
        set({
          userId: progress.userId,
          completedLevels: progress.completedLevels,
        });
      },
    }),
    {
      name: 'brief-quest-progress',
    }
  )
);
