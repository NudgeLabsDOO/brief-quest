import { useNavigate } from 'react-router-dom';
import { SCENARIOS } from '../data/scenarios';
import { useProgressStore } from '../store/progressStore';

const ACT_LABELS: Record<number, string> = {
  0: 'Tutorial',
  1: 'Act 1 — Entry Level Chaos',
  2: 'Act 2 — Agency Life',
};

export function LevelSelectScreen() {
  const navigate = useNavigate();
  const { isLevelCompleted, getLevelCompletion, getTotalStars } = useProgressStore();

  const acts = [0, 1, 2];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 p-4">
      {/* Header */}
      <div className="text-center mb-6 pt-4">
        <h1 className="text-3xl font-bold text-indigo-900">Brief Quest</h1>
        <p className="text-indigo-600 text-sm mt-1">
          Can you fix the brief? ⭐ {getTotalStars()} total stars
        </p>
      </div>

      {acts.map(actNum => {
        const levels = SCENARIOS.filter(s => s.actNumber === actNum);
        if (levels.length === 0) return null;

        return (
          <div key={actNum} className="mb-6">
            <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 px-1">
              {ACT_LABELS[actNum] ?? `Act ${actNum}`}
            </h2>

            <div className="space-y-2">
              {levels.map(scenario => {
                const completion = getLevelCompletion(scenario.id);
                const completed = isLevelCompleted(scenario.id);

                // Check unlock conditions
                const isUnlocked =
                  scenario.unlockCondition.requiredLevelIds.length === 0 ||
                  scenario.unlockCondition.requiredLevelIds.every(id => isLevelCompleted(id));

                return (
                  <button
                    key={scenario.id}
                    onClick={() => isUnlocked && navigate(`/game/${scenario.id}`)}
                    disabled={!isUnlocked}
                    className={`
                      w-full text-left rounded-xl p-4 border-2 transition-all
                      ${isUnlocked
                        ? completed
                          ? 'bg-white border-green-200 hover:border-green-400 hover:shadow-md active:scale-[0.99]'
                          : 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md active:scale-[0.99]'
                        : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                          ${completed ? 'bg-green-100 text-green-700' : isUnlocked ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-400'}
                        `}>
                          {completed ? '✓' : isUnlocked ? scenario.level : '🔒'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{scenario.title}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {scenario.difficulty} · {scenario.activeMechanics.join(', ')}
                          </div>
                        </div>
                      </div>

                      {completion && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map(star => (
                            <span
                              key={star}
                              className={star <= completion.starsEarned ? 'text-yellow-400' : 'text-gray-200'}
                            >
                              ⭐
                            </span>
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{completion.score}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
