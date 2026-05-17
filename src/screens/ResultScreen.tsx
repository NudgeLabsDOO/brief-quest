import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getScenarioById } from '../data/scenarios';

/** Counts from 0 to `target` over `durationMs` ms. */
function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

export function ResultScreen() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const { result, scenario } = useGameStore();
  const scenarioData = getScenarioById(scenarioId ?? '');

  const animatedScore = useCountUp(result?.totalScore ?? 0);

  if (!result || !scenario || !scenarioData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-gray-500">No result found.</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 underline">
          Back to menu
        </button>
      </div>
    );
  }

  const starLabel =
    result.starsEarned === 3
      ? 'Excellent Brief!'
      : result.starsEarned === 2
      ? 'Good Brief!'
      : 'Needs Work';

  const breakdownItems = [
    { label: 'Requirements sorted', score: result.breakdown.bucketScore, emoji: '📋' },
    result.breakdown.contradictionScore > 0
      ? { label: 'Contradictions removed', score: result.breakdown.contradictionScore, emoji: '⚠️' }
      : null,
    result.breakdown.goalKpiScore > 0
      ? { label: 'Goals matched to KPIs', score: result.breakdown.goalKpiScore, emoji: '🎯' }
      : null,
    result.breakdown.missingInfoScore > 0
      ? { label: 'Missing info identified', score: result.breakdown.missingInfoScore, emoji: '🔍' }
      : null,
    result.breakdown.speedBonus > 0
      ? { label: 'Speed bonus', score: result.breakdown.speedBonus, emoji: '⚡' }
      : null,
    result.breakdown.precisionBonus > 0
      ? { label: 'Precision bonus', score: result.breakdown.precisionBonus, emoji: '🎯' }
      : null,
    result.breakdown.undoPenalty > 0
      ? { label: 'Undo penalty', score: -result.breakdown.undoPenalty, emoji: '↩' }
      : null,
    result.breakdown.hintPenalty > 0
      ? { label: 'Hint penalty', score: -result.breakdown.hintPenalty, emoji: '💡' }
      : null,
  ].filter(Boolean) as { label: string; score: number; emoji: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col">
      {/* Stars + score */}
      <div className="text-center py-8 px-4">
        {/* Star award sequence — staggered spring reveal */}
        <div
          className="text-4xl mb-2 flex justify-center gap-1"
          aria-label={`${result.starsEarned} out of 3 stars`}
        >
          <AnimatePresence>
            {[1, 2, 3].map((s) => (
              <motion.span
                key={s}
                initial={{ scale: 0, opacity: 0, y: -16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  delay: 0.15 + s * 0.2,
                  type: 'spring',
                  stiffness: 340,
                  damping: 14,
                }}
                aria-hidden="true"
                className={s <= result.starsEarned ? 'text-yellow-400' : 'text-gray-200'}
              >
                ⭐
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-2xl font-bold text-indigo-900"
        >
          {starLabel}
        </motion.h1>

        {/* Score counter — counts up from 0 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-4xl font-bold text-indigo-600 mt-2"
          aria-label={`Score: ${result.totalScore} out of ${result.maxScore}`}
        >
          {animatedScore}{' '}
          <span className="text-lg text-gray-400">/ {result.maxScore}</span>
        </motion.p>

        {result.perfectBrief && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 14 }}
            className="mt-2 inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full"
          >
            🏆 Perfect Brief!
          </motion.div>
        )}
      </div>

      {/* Breakdown */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          {breakdownItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.06 }}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="text-sm text-gray-700">
                <span className="mr-2" aria-hidden="true">{item.emoji}</span>
                {item.label}
              </div>
              <span
                className={`font-semibold text-sm ${
                  item.score >= 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {item.score >= 0 ? '+' : ''}
                {item.score}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Teaching moment */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"
        >
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            💡 Key Lesson
          </div>
          <p className="text-sm text-indigo-900 leading-relaxed">{scenarioData.teachingMoment}</p>
        </motion.div>

        {/* Per-requirement breakdown */}
        {result.incorrectPlacements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white rounded-xl border border-red-100 overflow-hidden"
          >
            <div className="px-4 py-3 bg-red-50 border-b border-red-100">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                Missed requirements
              </div>
            </div>
            {result.incorrectPlacements.map((reqId) => {
              const req = scenarioData.requirements.find((r) => r.id === reqId);
              if (!req) return null;
              return (
                <div
                  key={reqId}
                  className="px-4 py-3 border-b border-gray-100 last:border-0"
                >
                  <p className="text-sm text-gray-700 mb-1">{req.text}</p>
                  <p className="text-xs text-gray-500">
                    Correct:{' '}
                    <span className="font-medium capitalize text-green-600">
                      {req.correctBucket}
                    </span>
                    {' — '}
                    {req.explanation}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* CTA */}
      <div className="p-4 bg-white/70 backdrop-blur border-t border-indigo-100 flex gap-3">
        <button
          onClick={() => navigate(`/game/${scenario.id}/play`)}
          className="flex-1 border-2 border-indigo-300 text-indigo-600 font-semibold rounded-xl py-3 hover:bg-indigo-50 transition-colors text-sm active:scale-[0.98]"
        >
          Replay
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 transition-colors text-sm active:scale-[0.98]"
        >
          Next Level →
        </button>
      </div>
    </div>
  );
}
