// Core game types for Brief Quest

export type BucketType = 'must' | 'should' | 'could' | 'remove' | 'pool';

export interface Requirement {
  id: string;
  text: string;
  correctBucket: Exclude<BucketType, 'pool'>;
  contradicts?: string[];     // ids of conflicting requirements
  connectsToGoal?: string;
  connectsToKPI?: string;
  connectsToAudience?: string;
  isMissingInfo?: boolean;
  explanation: string;
}

export interface Goal {
  id: string;
  text: string;
}

export interface KPI {
  id: string;
  text: string;
  goalId: string;
}

export interface AudienceSegment {
  id: string;
  segment: string;
}

export interface Rubric {
  bucketScorePerCorrect: number;
  contradictionBonus: number;
  goalKpiMatchBonus: number;
  audienceMatchBonus: number;
  missingInfoBonus: number;
  bucketPenaltyPerWrong: number;
  passingScore: number;
  maxScore: number;
}

export interface BriefScenario {
  id: string;
  level: number;
  actNumber: number;
  title: string;
  context: string;
  difficulty: 'intro' | 'easy' | 'medium' | 'hard';
  activeMechanics: MechanicType[];
  requirements: Requirement[];
  goals?: Goal[];
  kpis?: KPI[];
  audienceSegments?: AudienceSegment[];
  rubric: Rubric;
  unlockCondition: {
    requiredLevelIds: string[];
    minScore?: number;
  };
  teachingMoment: string;
}

export type MechanicType =
  | 'triage'
  | 'contradictions'
  | 'goal_kpi'
  | 'audience_message'
  | 'missing_info';

export interface EvaluationResult {
  totalScore: number;
  maxScore: number;
  starsEarned: 1 | 2 | 3;
  perfectBrief: boolean;
  passed: boolean;
  breakdown: {
    bucketScore: number;
    contradictionScore: number;
    goalKpiScore: number;
    audienceScore: number;
    missingInfoScore: number;
    undoPenalty: number;
    hintPenalty: number;
    speedBonus: number;
    precisionBonus: number;
    confidenceBonus: number;
  };
  incorrectPlacements: string[];
  missedContradictions: string[];
}

export interface LevelCompletion {
  scenarioId: string;
  score: number;
  starsEarned: 1 | 2 | 3;
  completedAt: string;
}

export interface PlayerProgress {
  userId?: string;
  completedLevels: LevelCompletion[];
}
