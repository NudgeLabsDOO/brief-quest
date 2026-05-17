import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SCENARIOS } from '../data/scenarios';
import { useProgressStore } from '../store/progressStore';
import { useAuthStore } from '../store/authStore';

const ACT_LABELS: Record<number, string> = {
  0: 'Tutorial',
  1: 'Act 1 — Entry Level Chaos',
  2: 'Act 2 — Agency Life',
};

export function LevelSelectScreen() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuthStore();
  const { isLevelCompleted, getLevelCompletion, getTotalStars } = useProgressStore();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const acts = [0, 1, 2];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 px-3 sm:px-4 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between pt-5 sm:pt-6 mb-5">
        <div className="flex-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">Brief Quest</h1>
          <p className="text-indigo-600 text-xs sm:text-sm mt-1">
            Can you fix the brief?{' '}
            <span aria-label={`${getTotalStars()} total stars`}>⭐ {getTotalStars()} total stars</span>
          </p>
        </div>
        {user && (
          <div className="text-right text-sm flex-shrink-0 ml-3">
            <p className="text-gray-600 text-xs truncate max-w-[100px]">{user.email}</p>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-700 text-xs mt-0.5 disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {acts.map(actNum => {
        const levels = SCENARIOS.filter(s => s.actNumber === actNum);
        if (levels.length === 0) return null;

        return (
          <div key={actNum} className="mb-5">
            <h2 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2 px-1">
              {ACT_LABELS[actNum] ?? `Act ${actNum}`}
            </h2>

            <div className="space-y-2">
              {levels.map((scenario, i) => {
                const completion = getLevelCompletion(scenario.id);
                const completed = isLevelCompleted(scenario.id);

                const isUnlocked =
                  scenario.unlockCondition.requiredLevelIds.length === 0 ||
                  scenario.unlockCondition.requiredLevelIds.every(id => isLevelCompleted(id));

                return (
                  <motion.button
                    key={scenario.id}
                    onClick={() => isUnlocked && navigate(`/game/${scenario.id}`)}
                    disabled={!isUnlocked}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                    whileTap={isUnlocked ? { scale: 0.98 } : {}}
                    aria-label={
                      isUnlocked
                        ? `${scenario.title} — level ${scenario.level}${completed ? ', completed' : ''}`
                        : `${scenario.title} — locked`
                    }
                    aria-disabled={!isUnlocked}
                    className={`
                      w-full text-left rounded-xl p-3 sm:p-4 border-2 transition-colors
                      ${isUnlocked
                        ? completed
                          ? 'bg-white border-green-200 hover:border-green-400 hover:shadow-md'
                          : 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md'
                        : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div
                          className={`
                            w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold
                            ${completed ? 'bg-green-100 text-green-700'
                              : isUnlocked ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-200 text-gray-400'}
                          `}
                          aria-hidden="true"
                        >
                          {completed ? '✓' : isUnlocked ? scenario.level : '🔒'}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{scenario.title}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium mr-1
                              ${scenario.difficulty === 'intro' ? 'bg-green-100 text-green-700'
                                : scenario.difficulty === 'easy' ? 'bg-blue-100 text-blue-700'
                                : scenario.difficulty === 'medium' ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'}`}
                            >
                              {scenario.difficulty}
                            </span>
                            {scenario.activeMechanics.join(', ')}
                          </div>
                        </div>
                      </div>

                      {completion && (
                        <div
                          className="flex items-center gap-0.5 flex-shrink-0"
                          aria-label={`${completion.starsEarned} stars, score ${completion.score}`}
                        >
                          {[1, 2, 3].map(star => (
                            <span
                              key={star}
                              aria-hidden="true"
                              className={star <= completion.starsEarned ? 'text-yellow-400' : 'text-gray-200'}
                            >
                              ⭐
                            </span>
                          ))}
                          <span className="text-xs text-gray-500 ml-1 hidden sm:inline">{completion.score}</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
