import { useNavigate, useParams } from 'react-router-dom';
import { getScenarioById } from '../data/scenarios';

const MECHANIC_LABELS: Record<string, string> = {
  triage: 'Sort requirements (must / should / could / remove)',
  contradictions: 'Remove contradictory requirements',
  goal_kpi: 'Match goals to KPIs',
  audience_message: 'Connect audiences to messages',
  missing_info: 'Flag missing information',
};

export function LevelIntroScreen() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const scenario = getScenarioById(scenarioId ?? '');

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Level not found.{' '}
        <button className="text-indigo-600 underline ml-1" onClick={() => navigate('/')}>
          Back to menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-indigo-100 bg-white/70 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="text-indigo-600 hover:text-indigo-800 text-lg"
        >
          ←
        </button>
        <span className="font-semibold text-gray-900">{scenario.title}</span>
        <span className="ml-auto text-xs text-gray-500 capitalize bg-indigo-100 px-2 py-0.5 rounded-full">
          Level {scenario.level}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Brief card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-600 px-4 py-3">
            <div className="text-white text-xs font-semibold uppercase tracking-wider">📋 The Brief</div>
          </div>
          <div className="p-4">
            <p className="text-gray-700 leading-relaxed text-sm">{scenario.context}</p>
          </div>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 px-4 py-3">
            <div className="text-indigo-700 text-xs font-semibold uppercase tracking-wider">🎯 Your Mission</div>
          </div>
          <div className="p-4 space-y-2">
            {scenario.activeMechanics.map(mechanic => (
              <div key={mechanic} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{MECHANIC_LABELS[mechanic]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring preview */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-xs text-gray-500 text-center">
          Passing score: {scenario.rubric.passingScore} pts · Max score: {scenario.rubric.maxScore} pts
        </div>
      </div>

      {/* CTA */}
      <div className="p-4 bg-white/70 backdrop-blur border-t border-indigo-100">
        <button
          onClick={() => navigate(`/game/${scenario.id}/play`)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl py-4 transition-colors text-center"
        >
          Start Sorting →
        </button>
      </div>
    </div>
  );
}
