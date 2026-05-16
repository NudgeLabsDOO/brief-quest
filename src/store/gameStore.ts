import { create } from 'zustand';
import type { BriefScenario, BucketType, EvaluationResult } from '../types';

interface GameStore {
  // Current game session
  scenario: BriefScenario | null;
  placements: Record<string, BucketType>;
  goalKpiMatches: Record<string, string>;      // goalId → kpiId
  audienceMatches: Record<string, string>;      // audienceId → reqId
  flaggedMissing: string[];                     // reqIds flagged as missing info
  undoCount: number;
  hintCount: number;
  startedAt: number | null;                     // timestamp
  submitted: boolean;
  result: EvaluationResult | null;

  // Actions
  loadScenario: (scenario: BriefScenario) => void;
  placeRequirement: (reqId: string, bucket: BucketType) => void;
  undoPlacement: (reqId: string) => void;
  setGoalKpiMatch: (goalId: string, kpiId: string) => void;
  setAudienceMatch: (audienceId: string, reqId: string) => void;
  toggleMissingFlag: (reqId: string) => void;
  useHint: () => string | null;
  submitBrief: (result: EvaluationResult) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  scenario: null,
  placements: {},
  goalKpiMatches: {},
  audienceMatches: {},
  flaggedMissing: [],
  undoCount: 0,
  hintCount: 0,
  startedAt: null,
  submitted: false,
  result: null,

  loadScenario: (scenario) => {
    // Initialize placements: all requirements start in pool
    const placements: Record<string, BucketType> = {};
    for (const req of scenario.requirements) {
      placements[req.id] = 'pool';
    }
    set({
      scenario,
      placements,
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 0,
      hintCount: 0,
      startedAt: Date.now(),
      submitted: false,
      result: null,
    });
  },

  placeRequirement: (reqId, bucket) => {
    set(state => ({
      placements: { ...state.placements, [reqId]: bucket },
    }));
  },

  undoPlacement: (reqId) => {
    set(state => ({
      placements: { ...state.placements, [reqId]: 'pool' },
      undoCount: state.undoCount + 1,
    }));
  },

  setGoalKpiMatch: (goalId, kpiId) => {
    set(state => ({
      goalKpiMatches: { ...state.goalKpiMatches, [goalId]: kpiId },
    }));
  },

  setAudienceMatch: (audienceId, reqId) => {
    set(state => ({
      audienceMatches: { ...state.audienceMatches, [audienceId]: reqId },
    }));
  },

  toggleMissingFlag: (reqId) => {
    set(state => {
      const already = state.flaggedMissing.includes(reqId);
      return {
        flaggedMissing: already
          ? state.flaggedMissing.filter(id => id !== reqId)
          : [...state.flaggedMissing, reqId],
      };
    });
  },

  useHint: () => {
    const { scenario, placements } = get();
    if (!scenario) return null;

    // Find a requirement still in pool and reveal its correct bucket
    const unplaced = scenario.requirements.find(r => placements[r.id] === 'pool');
    if (!unplaced) return null;

    set(state => ({
      hintCount: state.hintCount + 1,
      placements: { ...state.placements, [unplaced.id]: unplaced.correctBucket },
    }));
    return unplaced.id;
  },

  submitBrief: (result) => {
    set({ submitted: true, result });
  },

  resetGame: () => {
    set({
      scenario: null,
      placements: {},
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 0,
      hintCount: 0,
      startedAt: null,
      submitted: false,
      result: null,
    });
  },
}));
