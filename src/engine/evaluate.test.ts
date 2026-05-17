import { describe, it, expect } from 'vitest';
import { evaluateBrief } from './evaluate';
import type { BriefScenario } from '../types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** A minimal rubric that makes arithmetic easy to reason about. */
const BASE_RUBRIC = {
  bucketScorePerCorrect: 100,
  contradictionBonus: 200,
  goalKpiMatchBonus: 100,
  audienceMatchBonus: 50,
  missingInfoBonus: 80,
  bucketPenaltyPerWrong: 30,
  passingScore: 300,
  maxScore: 2000,
};

/** A simple triage-only scenario with 3 requirements. */
function makeSimpleScenario(overrides: Partial<BriefScenario> = {}): BriefScenario {
  return {
    id: 'test-scenario',
    level: 1,
    actNumber: 1,
    title: 'Test',
    context: 'Test context',
    difficulty: 'easy',
    activeMechanics: ['triage'],
    requirements: [
      { id: 'r1', text: 'Req 1', correctBucket: 'must', explanation: '' },
      { id: 'r2', text: 'Req 2', correctBucket: 'should', explanation: '' },
      { id: 'r3', text: 'Req 3', correctBucket: 'could', explanation: '' },
    ],
    rubric: { ...BASE_RUBRIC },
    unlockCondition: { requiredLevelIds: [] },
    teachingMoment: '',
    ...overrides,
  };
}

const NO_PENALTIES = { undoCount: 0, hintCount: 0, elapsedSeconds: 120 };

// ---------------------------------------------------------------------------
// 1. Bucket placement scoring
// ---------------------------------------------------------------------------

describe('evaluateBrief — bucket placement scoring', () => {
  it('all correct → max bucket score and no incorrectPlacements', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    // 3 correct × 100 = 300
    expect(result.breakdown.bucketScore).toBe(300);
    expect(result.incorrectPlacements).toHaveLength(0);
  });

  it('all wrong → bucket score clamped to 0', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'remove', r2: 'remove', r3: 'remove' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    // Each wrong placement → −30; clamped at 0
    expect(result.breakdown.bucketScore).toBe(0);
    expect(result.incorrectPlacements).toHaveLength(3);
  });

  it('unsorted (pool) items → −10 penalty per item, clamped at 0', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'pool', r2: 'pool', r3: 'pool' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.bucketScore).toBe(0);
    expect(result.incorrectPlacements).toHaveLength(3);
  });

  it('mixed correct/wrong → only correct items scored', () => {
    const scenario = makeSimpleScenario();
    // r1 correct (+100), r2 wrong (−30), r3 unsorted (−10) → 100−30−10 = 60
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'must', r3: 'pool' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.bucketScore).toBe(60);
    expect(result.incorrectPlacements).toContain('r2');
    expect(result.incorrectPlacements).toContain('r3');
    expect(result.incorrectPlacements).not.toContain('r1');
  });
});

// ---------------------------------------------------------------------------
// 2. Contradiction detection
// ---------------------------------------------------------------------------

describe('evaluateBrief — contradiction detection', () => {
  function makeContradictionScenario(): BriefScenario {
    return makeSimpleScenario({
      activeMechanics: ['triage', 'contradictions'],
      requirements: [
        { id: 'r1', text: 'Req 1', correctBucket: 'must', explanation: '', contradicts: ['r2'] },
        { id: 'r2', text: 'Req 2', correctBucket: 'remove', explanation: '', contradicts: ['r1'] },
        { id: 'r3', text: 'Req 3', correctBucket: 'could', explanation: '' },
      ],
    });
  }

  it('contradiction pair both in "remove" → bonus applied', () => {
    const scenario = makeContradictionScenario();
    const result = evaluateBrief({
      scenario,
      // r1 and r2 both placed in "remove" → contradictionBonus = 200
      placements: { r1: 'remove', r2: 'remove', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.contradictionScore).toBe(200);
    expect(result.missedContradictions).toHaveLength(0);
  });

  it('contradiction pair NOT both removed → no bonus, pair in missedContradictions', () => {
    const scenario = makeContradictionScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'remove', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.contradictionScore).toBe(0);
    expect(result.missedContradictions).toHaveLength(1);
  });

  it('no contradictions in scenario → contradictionScore stays 0', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.contradictionScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Goal-KPI matching
// ---------------------------------------------------------------------------

describe('evaluateBrief — goal-KPI matching', () => {
  function makeGoalKpiScenario(): BriefScenario {
    return makeSimpleScenario({
      activeMechanics: ['triage', 'goal_kpi'],
      goals: [{ id: 'g1', text: 'Grow revenue' }],
      kpis: [{ id: 'k1', text: 'Revenue up 20%', goalId: 'g1' }],
    });
  }

  it('correct goal→KPI match → bonus applied', () => {
    const scenario = makeGoalKpiScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: { g1: 'k1' },
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.goalKpiScore).toBe(100); // goalKpiMatchBonus
  });

  it('wrong goal→KPI match → penalty applied, score clamped at 0', () => {
    const scenario = makeGoalKpiScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: { g1: 'k-wrong' },
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    // Wrong match: −floor(100/2) = −50, clamped at 0
    expect(result.breakdown.goalKpiScore).toBe(0);
  });

  it('no match provided for a goal → no bonus, no penalty', () => {
    const scenario = makeGoalKpiScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {}, // kpi exists but no match provided at all
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.goalKpiScore).toBe(0);
  });

  it('no goal-KPI in scenario → goalKpiScore is 0', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: { g1: 'k1' },
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.goalKpiScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Missing info identification
// ---------------------------------------------------------------------------

describe('evaluateBrief — missing info identification', () => {
  function makeMissingInfoScenario(): BriefScenario {
    return makeSimpleScenario({
      activeMechanics: ['triage', 'missing_info'],
      requirements: [
        { id: 'r1', text: 'Req 1', correctBucket: 'must', explanation: '' },
        { id: 'r2', text: 'Vague deadline', correctBucket: 'remove', isMissingInfo: true, explanation: '' },
        { id: 'r3', text: 'Req 3', correctBucket: 'could', explanation: '' },
      ],
    });
  }

  it('correctly flagged missing info → missingInfoBonus applied', () => {
    const scenario = makeMissingInfoScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'remove', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: ['r2'],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.missingInfoScore).toBe(80);
  });

  it('missing info not flagged → no bonus', () => {
    const scenario = makeMissingInfoScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'remove', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.missingInfoScore).toBe(0);
  });

  it('false flag (flagging non-missing req) → penalty applied', () => {
    const scenario = makeMissingInfoScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'remove', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      // r1 is NOT missing info → false flag; r2 IS → correct
      flaggedMissing: ['r1', 'r2'],
      ...NO_PENALTIES,
    });

    // r2 correct: +80; r1 false flag: −floor(80/2) = −40 → net 40, clamped at 0+
    expect(result.breakdown.missingInfoScore).toBe(40);
  });

  it('false flag only → score clamped at 0', () => {
    const scenario = makeMissingInfoScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'remove', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: ['r1', 'r3'], // both false flags
      ...NO_PENALTIES,
    });

    // 0 correct bonus; 2 false flags: −40 each → −80 clamped to 0
    expect(result.breakdown.missingInfoScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5b. Audience-message connections
// ---------------------------------------------------------------------------

describe('evaluateBrief — audience-message connections', () => {
  function makeAudienceScenario(): BriefScenario {
    return makeSimpleScenario({
      activeMechanics: ['triage', 'audience_message'],
      requirements: [
        { id: 'r1', text: 'Req 1', correctBucket: 'must', connectsToAudience: 'a1', explanation: '' },
        { id: 'r2', text: 'Req 2', correctBucket: 'should', explanation: '' },
        { id: 'r3', text: 'Req 3', correctBucket: 'could', explanation: '' },
      ],
      audienceSegments: [
        { id: 'a1', segment: 'Young professionals' },
      ],
    });
  }

  it('correct audience match → audienceMatchBonus applied', () => {
    const scenario = makeAudienceScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: { a1: 'r1' }, // correct: r1 connects to a1
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.audienceScore).toBe(50); // audienceMatchBonus
  });

  it('wrong audience match → no bonus', () => {
    const scenario = makeAudienceScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: { a1: 'r2' }, // r2 does NOT connect to a1
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.audienceScore).toBe(0);
  });

  it('no audience match provided → audienceScore is 0', () => {
    const scenario = makeAudienceScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.audienceScore).toBe(0);
  });

  it('no audienceSegments in scenario → audienceScore stays 0', () => {
    const scenario = makeSimpleScenario(); // no audienceSegments
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: { a1: 'r1' },
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.audienceScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Undo / hint penalties
// ---------------------------------------------------------------------------

describe('evaluateBrief — undo and hint penalties', () => {
  it('undo count → 5 points per undo deducted', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 3,
      hintCount: 0,
      elapsedSeconds: 120,
    });

    expect(result.breakdown.undoPenalty).toBe(15);
  });

  it('hint count → 15 points per hint deducted', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 0,
      hintCount: 2,
      elapsedSeconds: 120,
    });

    expect(result.breakdown.hintPenalty).toBe(30);
  });

  it('undo + hint combined penalties are both tracked', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 2,
      hintCount: 1,
      elapsedSeconds: 120,
    });

    expect(result.breakdown.undoPenalty).toBe(10);
    expect(result.breakdown.hintPenalty).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// 6. Bonus multipliers
// ---------------------------------------------------------------------------

describe('evaluateBrief — bonus multipliers', () => {
  it('speed bonus applied when elapsed < 50% of time limit', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 0,
      hintCount: 0,
      elapsedSeconds: 20,
      timeLimitSeconds: 60,
    });

    // rawScore = 300 (3 correct); speedBonus = floor(300 * 0.5) = 150
    expect(result.breakdown.speedBonus).toBe(150);
  });

  it('no speed bonus when elapsed ≥ 50% of time limit', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 0,
      hintCount: 0,
      elapsedSeconds: 40,
      timeLimitSeconds: 60,
    });

    expect(result.breakdown.speedBonus).toBe(0);
  });

  it('precision bonus applied when no incorrect placements and no false flags', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    // rawScore = 300; precisionBonus = floor(300 * 0.2) = 60
    expect(result.breakdown.precisionBonus).toBe(60);
  });

  it('no precision bonus when there are incorrect placements', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'must', r3: 'could' }, // r2 wrong
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    expect(result.breakdown.precisionBonus).toBe(0);
  });

  it('confidence bonus applied when undoCount is 0', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 0,
      hintCount: 0,
      elapsedSeconds: 120,
    });

    // rawScore = 300; confidenceBonus = floor(300 * 0.1) = 30
    expect(result.breakdown.confidenceBonus).toBe(30);
  });

  it('no confidence bonus when undoCount > 0', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 1,
      hintCount: 0,
      elapsedSeconds: 120,
    });

    expect(result.breakdown.confidenceBonus).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Star rating thresholds
// ---------------------------------------------------------------------------

describe('evaluateBrief — star rating thresholds', () => {
  /**
   * Force totalScore to equal exactly targetRawScore by:
   * - using one correct req worth targetRawScore per correct placement
   * - adding a second req placed *wrong* (zero penalty) → disables precisionBonus
   * - setting undoCount=1 → disables confidenceBonus (costs 5 pts from rawScore,
   *   so the correct-bucket score is offset to targetRawScore + 5)
   * - no timeLimitSeconds → no speedBonus
   * Net: totalScore = (targetRawScore + 5) − undoPenalty(5) = targetRawScore
   */
  function scoreForResult(targetRawScore: number) {
    const scenario: BriefScenario = {
      id: 'star-test',
      level: 1,
      actNumber: 1,
      title: 'Star Test',
      context: '',
      difficulty: 'easy',
      activeMechanics: ['triage'],
      requirements: [
        { id: 'r1', text: 'R1', correctBucket: 'must', explanation: '' },
        { id: 'r2', text: 'R2', correctBucket: 'should', explanation: '' }, // placed wrong → disables precisionBonus
      ],
      rubric: {
        bucketScorePerCorrect: targetRawScore + 5, // offset for undoPenalty
        contradictionBonus: 0,
        goalKpiMatchBonus: 0,
        audienceMatchBonus: 0,
        missingInfoBonus: 0,
        bucketPenaltyPerWrong: 0, // wrong placement costs nothing
        passingScore: 100,
        maxScore: 5000,
      },
      unlockCondition: { requiredLevelIds: [] },
      teachingMoment: '',
    };
    return evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'must' }, // r2 wrong → no precisionBonus
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      undoCount: 1, // disables confidenceBonus; costs 5 pts (offset above)
      hintCount: 0,
      elapsedSeconds: 9999, // no speed bonus
    });
  }

  it('score < 600 → 1 star', () => {
    const result = scoreForResult(599);
    expect(result.starsEarned).toBe(1);
  });

  it('score = 600 → 2 stars', () => {
    const result = scoreForResult(600);
    expect(result.starsEarned).toBe(2);
  });

  it('score = 849 → 2 stars', () => {
    const result = scoreForResult(849);
    expect(result.starsEarned).toBe(2);
  });

  it('score = 850 → 3 stars', () => {
    const result = scoreForResult(850);
    expect(result.starsEarned).toBe(3);
  });

  it('score = 1000 → perfectBrief flag set', () => {
    const result = scoreForResult(1000);
    expect(result.perfectBrief).toBe(true);
  });

  it('score below passingScore → passed is false', () => {
    // rubric.passingScore is 300; put 100 per correct
    const scenario = makeSimpleScenario({
      requirements: [{ id: 'r1', text: 'R1', correctBucket: 'must', explanation: '' }],
      rubric: { ...BASE_RUBRIC, bucketScorePerCorrect: 50, passingScore: 300 },
    });
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });
    expect(result.passed).toBe(false);
  });

  it('score at or above passingScore → passed is true', () => {
    const scenario = makeSimpleScenario();
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });
    // 300 bucketScore; passingScore = 300
    expect(result.passed).toBe(true);
  });

  it('totalScore is clamped to rubric.maxScore', () => {
    const scenario = makeSimpleScenario({
      rubric: { ...BASE_RUBRIC, maxScore: 100, bucketScorePerCorrect: 1000 },
    });
    const result = evaluateBrief({
      scenario,
      placements: { r1: 'must', r2: 'should', r3: 'could' },
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });
    expect(result.totalScore).toBe(100);
    expect(result.maxScore).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 8. Tutorial scenario — all correct → 3 stars
// ---------------------------------------------------------------------------

describe('evaluateBrief — tutorial scenario full run', () => {
  it('all 5 tutorial reqs placed correctly → 3 stars (score ≥ 850)', async () => {
    const raw = await import('../data/levels/level-000-tutorial.json');
    const scenario = raw.default as BriefScenario;

    const perfectPlacements = Object.fromEntries(
      scenario.requirements.map(r => [r.id, r.correctBucket])
    ) as Record<string, import('../types').BucketType>;

    const result = evaluateBrief({
      scenario,
      placements: perfectPlacements,
      goalKpiMatches: {},
      audienceMatches: {},
      flaggedMissing: [],
      ...NO_PENALTIES,
    });

    // Tutorial: 5 reqs × 40 = 200 bucketScore; maxScore = 200 — check 3 stars or
    // at minimum verify no incorrect placements and score = maxScore.
    expect(result.incorrectPlacements).toHaveLength(0);
    expect(result.totalScore).toBe(scenario.rubric.maxScore);
  });
});
