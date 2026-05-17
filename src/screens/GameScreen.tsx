import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { getScenarioById } from '../data/scenarios';
import { useGameStore } from '../store/gameStore';
import { useProgressStore } from '../store/progressStore';
import { evaluateBrief } from '../engine/evaluate';
import { RequirementCard } from '../components/RequirementCard';
import { DropBucket } from '../components/DropBucket';
import { GoalKpiMatcher } from '../components/GoalKpiMatcher';
import type { BucketType, Requirement } from '../types';

const BUCKETS: { bucket: Exclude<BucketType, 'pool'>; label: string; description: string }[] = [
  { bucket: 'must', label: 'MUST HAVE', description: 'Non-negotiable' },
  { bucket: 'should', label: 'SHOULD HAVE', description: 'Important but flexible' },
  { bucket: 'could', label: 'COULD HAVE', description: 'Nice to have' },
  { bucket: 'remove', label: 'REMOVE', description: 'Contradictory or vague' },
];

export function GameScreen() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const [activeReq, setActiveReq] = useState<Requirement | null>(null);

  const {
    scenario,
    placements,
    goalKpiMatches,
    flaggedMissing,
    undoCount,
    hintCount,
    startedAt,
    loadScenario,
    placeRequirement,
    undoPlacement,
    setGoalKpiMatch,
    toggleMissingFlag,
    useHint: applyHint,
    submitBrief,
  } = useGameStore();

  const { recordCompletion, syncToServer } = useProgressStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    // Keyboard accessibility: Space/Enter to pick up, Arrow keys to navigate, Space/Enter to drop
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const s = getScenarioById(scenarioId ?? '');
    if (!s) return;
    loadScenario(s);
  }, [scenarioId, loadScenario]);

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const poolRequirements = scenario.requirements.filter((r) => placements[r.id] === 'pool');
  const allPlaced = scenario.requirements.every((r) => placements[r.id] !== 'pool');

  function handleDragStart(event: DragStartEvent) {
    const req = event.active.data.current?.requirement as Requirement | undefined;
    if (req) setActiveReq(req);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveReq(null);
    const { active, over } = event;
    if (!over) return;

    const bucket = over.id as BucketType;
    if (!['must', 'should', 'could', 'remove'].includes(bucket)) return;

    placeRequirement(active.id as string, bucket);
  }

  function handleSubmit() {
    if (!scenario) return;
    const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    const result = evaluateBrief({
      scenario,
      placements,
      goalKpiMatches,
      audienceMatches: {},
      flaggedMissing,
      undoCount,
      hintCount,
      elapsedSeconds: elapsed,
    });

    submitBrief(result);
    recordCompletion({
      scenarioId: scenario.id,
      score: result.totalScore,
      starsEarned: result.starsEarned,
      completedAt: new Date().toISOString(),
    });

    // Fire-and-forget: upsert progress to Supabase if authenticated
    syncToServer().catch(err => console.error('[Supabase] Sync failed:', err));

    navigate(`/game/${scenario.id}/result`);
  }

  const showGoalKpi =
    scenario.activeMechanics.includes('goal_kpi') && scenario.goals && scenario.kpis;
  const showMissingFlag = scenario.activeMechanics.includes('missing_info');

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/*
        Thumb-zone layout for portrait mobile:
        - Header + pool at top (scrollable)
        - Drop buckets pinned in the lower ~60% viewport so thumbs reach them easily
        - On wider screens the layout stays natural
      */}
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button
            onClick={() => navigate(`/game/${scenario.id}`)}
            aria-label="Back to level intro"
            className="text-gray-500 hover:text-gray-800"
          >
            ←
          </button>
          <span className="font-semibold text-sm text-gray-900 flex-1 truncate">
            {scenario.title}
          </span>
          <button
            onClick={() => {
              const hinted = applyHint();
              if (!hinted) alert('All requirements are already placed!');
            }}
            aria-label="Get a hint"
            className="text-xs px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
          >
            💡 Hint
          </button>
        </div>

        {/*
          Content area: flex-col on mobile so pool is above buckets.
          On sm+ screens the grid handles spacing naturally.
        */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Requirements Pool — scrollable, appears at top */}
          <div className="overflow-y-auto px-3 pt-3 space-y-3 flex-shrink-0 max-h-[38vh] sm:max-h-none">
            <AnimatePresence>
              {poolRequirements.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-xl border-2 border-dashed border-indigo-200 p-3"
                >
                  <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                    Requirements to Sort ({poolRequirements.length} remaining)
                  </div>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {poolRequirements.map((req) => (
                      <RequirementCard
                        key={req.id}
                        requirement={req}
                        currentBucket="pool"
                        showMissingFlag={showMissingFlag}
                        isFlagged={flaggedMissing.includes(req.id)}
                        onToggleFlag={() => toggleMissingFlag(req.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {poolRequirements.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border-2 border-green-200 rounded-xl p-3 text-center text-sm text-green-700 font-medium"
              >
                ✓ All requirements sorted!
              </motion.div>
            )}
          </div>

          {/*
            Drop Buckets — occupy the lower portion so thumbs reach comfortably.
            On portrait mobile this fills ~60% of the remaining height.
          */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
            <div
              className="grid grid-cols-2 gap-2"
              /* Accessible label for the drop zone region */
              role="region"
              aria-label="Drop buckets — drag cards here to sort them"
            >
              {BUCKETS.map(({ bucket, label, description }) => {
                const reqs = scenario.requirements.filter((r) => placements[r.id] === bucket);
                return (
                  <DropBucket
                    key={bucket}
                    bucket={bucket}
                    label={label}
                    description={description}
                    requirements={reqs}
                    allPlacements={placements}
                    onUndo={undoPlacement}
                    showMissingFlag={showMissingFlag}
                    flaggedMissing={flaggedMissing}
                    onToggleFlag={showMissingFlag ? toggleMissingFlag : undefined}
                  />
                );
              })}
            </div>

            {/* Goal-KPI Matcher */}
            {showGoalKpi && scenario.goals && scenario.kpis && (
              <div className="mt-2">
                <GoalKpiMatcher
                  goals={scenario.goals}
                  kpis={scenario.kpis}
                  matches={goalKpiMatches}
                  onMatch={setGoalKpiMatch}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer / Submit — sticky at bottom (thumb zone) */}
        <div className="p-4 bg-white border-t border-gray-200 sticky bottom-0 z-10">
          <motion.button
            onClick={handleSubmit}
            disabled={!allPlaced}
            whileTap={allPlaced ? { scale: 0.98 } : {}}
            className={`
              w-full rounded-xl py-4 font-semibold text-sm transition-colors
              ${allPlaced
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {allPlaced
              ? 'Submit Brief →'
              : `Sort all requirements first (${poolRequirements.length} left)`}
          </motion.button>
        </div>
      </div>

      {/* Drag Overlay — visible ghost card while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeReq && (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ scale: 1.06, rotate: 2 }}
            className="p-3 bg-white rounded-lg border-2 border-indigo-400 shadow-2xl text-sm text-gray-800 max-w-xs"
            style={{ pointerEvents: 'none' }}
          >
            {activeReq.text}
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
