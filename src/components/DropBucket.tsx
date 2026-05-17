import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import type { BucketType, Requirement } from '../types';
import { RequirementCard } from './RequirementCard';

interface Props {
  bucket: Exclude<BucketType, 'pool'>;
  label: string;
  description: string;
  requirements: Requirement[];
  allPlacements: Record<string, BucketType>;
  onUndo: (reqId: string) => void;
  showMissingFlag?: boolean;
  flaggedMissing?: string[];
  onToggleFlag?: (reqId: string) => void;
}

const bucketStyles: Record<
  Exclude<BucketType, 'pool'>,
  { header: string; border: string; bg: string; glow: string; icon: string; ariaLabel: string }
> = {
  must: {
    header: 'bg-red-500 text-white',
    border: 'border-red-300',
    bg: 'bg-red-50/50',
    glow: 'ring-red-400 bg-red-50',
    icon: '🔴',
    ariaLabel: 'Must have — non-negotiable requirements',
  },
  should: {
    header: 'bg-amber-500 text-white',
    border: 'border-amber-300',
    bg: 'bg-amber-50/50',
    glow: 'ring-amber-400 bg-amber-50',
    icon: '🟡',
    ariaLabel: 'Should have — important but flexible requirements',
  },
  could: {
    header: 'bg-blue-500 text-white',
    border: 'border-blue-300',
    bg: 'bg-blue-50/50',
    glow: 'ring-blue-400 bg-blue-50',
    icon: '🔵',
    ariaLabel: 'Could have — nice-to-have requirements',
  },
  remove: {
    header: 'bg-gray-500 text-white',
    border: 'border-gray-300',
    bg: 'bg-gray-50/50',
    glow: 'ring-gray-400 bg-gray-50',
    icon: '⚫',
    ariaLabel: 'Remove — contradictory or vague requirements',
  },
};

export function DropBucket({
  bucket,
  label,
  description,
  requirements,
  allPlacements,
  onUndo,
  showMissingFlag = false,
  flaggedMissing = [],
  onToggleFlag,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket });
  const styles = bucketStyles[bucket];

  return (
    <motion.div
      ref={setNodeRef}
      aria-label={styles.ariaLabel}
      aria-dropeffect="move"
      role="region"
      animate={isOver ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`
        flex flex-col rounded-xl border-2 overflow-hidden transition-colors duration-150
        ${styles.border}
        ${isOver ? `ring-2 ring-offset-1 ${styles.glow}` : ''}
      `}
    >
      <div className={`px-3 py-2 ${styles.header}`}>
        {/* icon + text so color is never the only cue */}
        <div className="font-semibold text-sm flex items-center gap-1">
          <span aria-hidden="true">{styles.icon}</span>
          {label}
        </div>
        <div className="text-xs opacity-80">{description}</div>
      </div>

      <div
        className={`
          flex-1 min-h-[80px] p-2 space-y-2
          ${styles.bg}
          transition-colors duration-150
        `}
      >
        <AnimatePresence initial={false}>
          {requirements.map((req) => (
            <motion.div
              key={req.id}
              layout
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <RequirementCard
                requirement={req}
                currentBucket={allPlacements[req.id] ?? 'pool'}
                onUndo={() => onUndo(req.id)}
                showMissingFlag={showMissingFlag}
                isFlagged={flaggedMissing.includes(req.id)}
                onToggleFlag={onToggleFlag ? () => onToggleFlag(req.id) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {requirements.length === 0 && (
          <div className="h-10 flex items-center justify-center text-xs text-gray-400 italic">
            {isOver ? 'Release to drop here' : 'Drop here'}
          </div>
        )}
      </div>
    </motion.div>
  );
}
