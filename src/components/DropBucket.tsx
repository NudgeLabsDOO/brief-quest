import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
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

const bucketStyles: Record<Exclude<BucketType, 'pool'>, {
  header: string;
  border: string;
  bg: string;
  ring: string;
}> = {
  must: {
    header: 'bg-red-500 text-white',
    border: 'border-red-300',
    bg: 'bg-red-50/60',
    ring: 'ring-red-400',
  },
  should: {
    header: 'bg-amber-500 text-white',
    border: 'border-amber-300',
    bg: 'bg-amber-50/60',
    ring: 'ring-amber-400',
  },
  could: {
    header: 'bg-blue-500 text-white',
    border: 'border-blue-300',
    bg: 'bg-blue-50/60',
    ring: 'ring-blue-400',
  },
  remove: {
    header: 'bg-gray-500 text-white',
    border: 'border-gray-300',
    bg: 'bg-gray-100/60',
    ring: 'ring-gray-400',
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
      animate={{
        scale: isOver ? 1.025 : 1,
      }}
      transition={{ duration: 0.1 }}
      className={`
        flex flex-col rounded-xl border-2 overflow-hidden transition-shadow duration-150
        ${styles.border}
        ${isOver ? `ring-2 ring-offset-1 ${styles.ring} shadow-md` : ''}
      `}
    >
      <div className={`px-3 py-2 ${styles.header}`}>
        <div className="font-semibold text-sm tracking-wide">{label}</div>
        <div className="text-xs opacity-80">{description}</div>
      </div>

      <div className={`
        flex-1 min-h-[80px] p-2 space-y-2 transition-colors duration-150
        ${styles.bg}
        ${isOver ? 'opacity-90' : ''}
      `}>
        <AnimatePresence mode="popLayout">
          {requirements.map(req => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
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
          <motion.div
            initial={false}
            animate={{ opacity: isOver ? 0.6 : 0.4 }}
            className="h-10 flex items-center justify-center text-xs text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg"
          >
            {isOver ? 'Drop here' : 'Empty'}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
