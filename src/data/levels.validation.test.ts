/**
 * Level data validation tests.
 *
 * Verifies that every level JSON file satisfies the BriefScenario schema.
 * Uses Zod, which is already a production dependency of the project.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schema mirroring src/types/index.ts
// ---------------------------------------------------------------------------

const BucketTypeSchema = z.enum(['must', 'should', 'could', 'remove', 'pool']);
const CorrectBucketSchema = z.enum(['must', 'should', 'could', 'remove']);
const DifficultySchema = z.enum(['intro', 'easy', 'medium', 'hard']);
const MechanicTypeSchema = z.enum([
  'triage',
  'contradictions',
  'goal_kpi',
  'audience_message',
  'missing_info',
]);

const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correctBucket: CorrectBucketSchema,
  contradicts: z.array(z.string()).optional(),
  connectsToGoal: z.string().optional(),
  connectsToKPI: z.string().optional(),
  connectsToAudience: z.string().optional(),
  isMissingInfo: z.boolean().optional(),
  explanation: z.string(),
});

const GoalSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const KPISchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  goalId: z.string().min(1),
});

const AudienceSegmentSchema = z.object({
  id: z.string().min(1),
  segment: z.string().min(1),
});

const RubricSchema = z.object({
  bucketScorePerCorrect: z.number().nonnegative(),
  contradictionBonus: z.number().nonnegative(),
  goalKpiMatchBonus: z.number().nonnegative(),
  audienceMatchBonus: z.number().nonnegative(),
  missingInfoBonus: z.number().nonnegative(),
  bucketPenaltyPerWrong: z.number().nonnegative(),
  passingScore: z.number().nonnegative(),
  maxScore: z.number().positive(),
});

const BriefScenarioSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().nonnegative(),
  actNumber: z.number().int().nonnegative(),
  title: z.string().min(1),
  context: z.string().min(1),
  difficulty: DifficultySchema,
  activeMechanics: z.array(MechanicTypeSchema).min(1),
  requirements: z.array(RequirementSchema).min(1),
  goals: z.array(GoalSchema).optional(),
  kpis: z.array(KPISchema).optional(),
  audienceSegments: z.array(AudienceSegmentSchema).optional(),
  rubric: RubricSchema,
  unlockCondition: z.object({
    requiredLevelIds: z.array(z.string()),
    minScore: z.number().optional(),
  }),
  teachingMoment: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Cross-reference validators
// ---------------------------------------------------------------------------

function validateContradictionsReference(data: z.infer<typeof BriefScenarioSchema>): string[] {
  const errors: string[] = [];
  const ids = new Set(data.requirements.map(r => r.id));
  for (const req of data.requirements) {
    for (const ref of req.contradicts ?? []) {
      if (!ids.has(ref)) {
        errors.push(`Req "${req.id}" contradicts unknown id "${ref}"`);
      }
    }
  }
  return errors;
}

function validateKpiGoalReferences(data: z.infer<typeof BriefScenarioSchema>): string[] {
  const errors: string[] = [];
  if (!data.kpis || !data.goals) return errors;
  const goalIds = new Set(data.goals.map(g => g.id));
  for (const kpi of data.kpis) {
    if (!goalIds.has(kpi.goalId)) {
      errors.push(`KPI "${kpi.id}" references unknown goalId "${kpi.goalId}"`);
    }
  }
  return errors;
}

function validateGoalKpiMechanicConsistency(data: z.infer<typeof BriefScenarioSchema>): string[] {
  const errors: string[] = [];
  if (data.activeMechanics.includes('goal_kpi')) {
    if (!data.goals?.length) errors.push('goal_kpi mechanic active but no goals defined');
    if (!data.kpis?.length) errors.push('goal_kpi mechanic active but no kpis defined');
  }
  if (data.activeMechanics.includes('contradictions')) {
    const hasContradiction = data.requirements.some(r => r.contradicts?.length);
    if (!hasContradiction) {
      errors.push('contradictions mechanic active but no requirements have contradicts arrays');
    }
  }
  if (data.activeMechanics.includes('missing_info')) {
    const hasMissingInfo = data.requirements.some(r => r.isMissingInfo === true);
    if (!hasMissingInfo) {
      errors.push('missing_info mechanic active but no requirements have isMissingInfo: true');
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Level files under test
// ---------------------------------------------------------------------------

const LEVEL_FILES: Record<string, unknown>[] = [
  (await import('./levels/level-000-tutorial.json')).default as Record<string, unknown>,
  (await import('./levels/level-001-bakery-logo.json')).default as Record<string, unknown>,
  (await import('./levels/level-002-startup-launch.json')).default as Record<string, unknown>,
  (await import('./levels/level-003-app-launch.json')).default as Record<string, unknown>,
  (await import('./levels/level-004-hotel-rebrand.json')).default as Record<string, unknown>,
  (await import('./levels/level-005-ngo-campaign.json')).default as Record<string, unknown>,
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Level data validation', () => {
  it('all 6 level files are present', () => {
    expect(LEVEL_FILES).toHaveLength(6);
  });

  for (const raw of LEVEL_FILES) {
    const levelId = typeof raw.id === 'string' ? raw.id : 'unknown';

    describe(`${levelId}`, () => {
      it('matches BriefScenario schema', () => {
        const result = BriefScenarioSchema.safeParse(raw);
        if (!result.success) {
          // Surface Zod errors as readable assertion failure
          throw new Error(result.error.toString());
        }
        expect(result.success).toBe(true);
      });

      it('has unique requirement ids', () => {
        const parsed = BriefScenarioSchema.parse(raw);
        const ids = parsed.requirements.map(r => r.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
      });

      it('contradicts arrays reference valid requirement ids', () => {
        const parsed = BriefScenarioSchema.parse(raw);
        const errors = validateContradictionsReference(parsed);
        expect(errors).toHaveLength(0);
      });

      it('KPI goalId references valid goal ids', () => {
        const parsed = BriefScenarioSchema.parse(raw);
        const errors = validateKpiGoalReferences(parsed);
        expect(errors).toHaveLength(0);
      });

      it('active mechanics are consistent with data fields', () => {
        const parsed = BriefScenarioSchema.parse(raw);
        const errors = validateGoalKpiMechanicConsistency(parsed);
        expect(errors).toHaveLength(0);
      });

      it('rubric maxScore >= passingScore', () => {
        const parsed = BriefScenarioSchema.parse(raw);
        expect(parsed.rubric.maxScore).toBeGreaterThanOrEqual(parsed.rubric.passingScore);
      });
    });
  }
});
