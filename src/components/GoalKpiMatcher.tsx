import type { Goal, KPI } from '../types';

interface Props {
  goals: Goal[];
  kpis: KPI[];
  matches: Record<string, string>; // goalId → kpiId
  onMatch: (goalId: string, kpiId: string) => void;
}

export function GoalKpiMatcher({ goals, kpis, matches, onMatch }: Props) {
  const allMatched = goals.every(g => matches[g.id]);

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
      <div className="px-3 py-2 bg-purple-500 text-white">
        <div className="font-semibold text-sm">Match Goals to KPIs</div>
        <div className="text-xs opacity-80">Connect each business goal to the metric that measures it</div>
      </div>

      <div className="p-3 space-y-3">
        {goals.map(goal => (
          <div key={goal.id} className="space-y-1">
            <div className="text-sm font-medium text-gray-700 bg-purple-50 rounded-lg px-3 py-2">
              🎯 {goal.text}
            </div>
            <div className="pl-4 space-y-1">
              {kpis.map(kpi => {
                const isMatched = matches[goal.id] === kpi.id;
                const isMatchedToOther = Object.entries(matches).some(
                  ([gId, kId]) => gId !== goal.id && kId === kpi.id
                );

                return (
                  <button
                    key={kpi.id}
                    onClick={() => onMatch(goal.id, kpi.id)}
                    disabled={isMatchedToOther}
                    className={`
                      w-full text-left text-xs px-3 py-2 rounded-lg border transition-all
                      ${isMatched
                        ? 'bg-purple-500 text-white border-purple-500'
                        : isMatchedToOther
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }
                    `}
                  >
                    📊 {kpi.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {allMatched && (
          <div className="text-center text-sm text-purple-600 font-medium pt-1">
            ✓ All KPIs matched!
          </div>
        )}
      </div>
    </div>
  );
}
