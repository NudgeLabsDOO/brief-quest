import type {
  BriefScenario,
  EvaluationResult,
  BucketType,
} from '../types';

export interface EvaluationInput {
  scenario: BriefScenario;
  placements: Record<string, BucketType>;
  goalKpiMatches: Record<string, string>;
  audienceMatches: Record<string, string>;
  flaggedMissing: string[];
  undoCount: number;
  hintCount: number;
  elapsedSeconds: number;
  timeLimitSeconds?: number;
}

export function evaluateBrief(input: EvaluationInput): EvaluationResult {
  const { scenario, placements, goalKpiMatches, audienceMatches, flaggedMissing, undoCount, hintCount, elapsedSeconds, timeLimitSeconds } = input;
  const { rubric } = scenario;

  // 1. Score bucket placements
  let bucketScore = 0;
  const incorrectPlacements: string[] = [];

  for (const req of scenario.requirements) {
    const placement = placements[req.id];
    if (!placement || placement === 'pool') {
      // Unsorted: −10 per item
      bucketScore -= 10;
      incorrectPlacements.push(req.id);
    } else if (placement === req.correctBucket) {
      bucketScore += rubric.bucketScorePerCorrect;
    } else {
      bucketScore -= rubric.bucketPenaltyPerWrong;
      incorrectPlacements.push(req.id);
    }
  }
  bucketScore = Math.max(0, bucketScore);

  // 2. Score contradiction detection
  let contradictionScore = 0;
  const missedContradictions: string[] = [];
  const allContradictionPairs = new Set<string>();

  for (const req of scenario.requirements) {
    if (!req.contradicts) continue;
    for (const otherId of req.contradicts) {
      const pairKey = [req.id, otherId].sort().join('|');
      allContradictionPairs.add(pairKey);
    }
  }

  for (const pairKey of allContradictionPairs) {
    const [a, b] = pairKey.split('|');
    const aPlaced = placements[a] === 'remove';
    const bPlaced = placements[b] === 'remove';

    if (aPlaced && bPlaced) {
      contradictionScore += rubric.contradictionBonus;
    } else {
      missedContradictions.push(pairKey);
    }
  }

  // 3. Score goal-KPI matching (if applicable)
  let goalKpiScore = 0;
  if (scenario.kpis && scenario.goals) {
    for (const kpi of scenario.kpis) {
      if (goalKpiMatches[kpi.goalId] === kpi.id) {
        goalKpiScore += rubric.goalKpiMatchBonus;
      } else if (goalKpiMatches[kpi.goalId]) {
        goalKpiScore -= Math.floor(rubric.goalKpiMatchBonus / 2);
      }
    }
    goalKpiScore = Math.max(0, goalKpiScore);
  }

  // 4. Score audience-message connections (if applicable)
  let audienceScore = 0;
  if (scenario.audienceSegments) {
    for (const audience of scenario.audienceSegments) {
      // Find requirements that should connect to this audience
      const correctReqs = scenario.requirements.filter(
        r => r.connectsToAudience === audience.id
      );
      const playerMatch = audienceMatches[audience.id];
      if (playerMatch && correctReqs.some(r => r.id === playerMatch)) {
        audienceScore += rubric.audienceMatchBonus;
      }
    }
  }

  // 5. Score missing info identification (if applicable)
  let missingInfoScore = 0;
  const missingInfoReqs = scenario.requirements.filter(r => r.isMissingInfo);
  for (const req of missingInfoReqs) {
    if (flaggedMissing.includes(req.id)) {
      missingInfoScore += rubric.missingInfoBonus;
    }
  }
  // Penalize false flags
  const falseMissingFlags = flaggedMissing.filter(
    id => !missingInfoReqs.some(r => r.id === id)
  );
  missingInfoScore -= falseMissingFlags.length * Math.floor(rubric.missingInfoBonus / 2);
  missingInfoScore = Math.max(0, missingInfoScore);

  // 6. Penalties
  const undoPenalty = undoCount * 5;
  const hintPenalty = hintCount * 15;

  // 7. Bonus multipliers
  const rawScore = bucketScore + contradictionScore + goalKpiScore + audienceScore + missingInfoScore - undoPenalty - hintPenalty;

  let speedBonus = 0;
  let precisionBonus = 0;
  let confidenceBonus = 0;

  if (timeLimitSeconds && elapsedSeconds < timeLimitSeconds * 0.5) {
    speedBonus = Math.floor(rawScore * 0.5);
  }

  if (incorrectPlacements.length === 0 && falseMissingFlags.length === 0) {
    precisionBonus = Math.floor(rawScore * 0.2);
  }

  if (undoCount === 0) {
    confidenceBonus = Math.floor(rawScore * 0.1);
  }

  const totalScore = Math.min(
    rubric.maxScore,
    Math.max(0, rawScore + speedBonus + precisionBonus + confidenceBonus)
  );

  // 8. Star rating
  let starsEarned: 1 | 2 | 3;
  if (totalScore >= 850) starsEarned = 3;
  else if (totalScore >= 600) starsEarned = 2;
  else starsEarned = 1;

  const perfectBrief = totalScore >= 1000;
  const passed = totalScore >= rubric.passingScore;

  return {
    totalScore,
    maxScore: rubric.maxScore,
    starsEarned,
    perfectBrief,
    passed,
    breakdown: {
      bucketScore,
      contradictionScore,
      goalKpiScore,
      audienceScore,
      missingInfoScore,
      undoPenalty,
      hintPenalty,
      speedBonus,
      precisionBonus,
      confidenceBonus,
    },
    incorrectPlacements,
    missedContradictions,
  };
}
