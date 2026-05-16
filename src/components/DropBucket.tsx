import { useDroppable } from '@dnd-kit/core';
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

const bucketStyles: Record<Exclude<BucketType, 'pool'>, { header: string; border: string; bg: string }> = {
  must: {
    header: 'bg-red-500 text-white',
    border: 'border-red-300',
    bg: 'bg-red-50/50',
  },
  should: {
    header: 'bg-amber-500 text-white',
    border: 'border-amber-300',
    bg: 'bg-amber-50/50',
  },
  could: {
    header: 'bg-blue-500 text-white',
    border: 'border-blue-300',
    bg: 'bg-blue-50/50',
  },
  remove: {
    header: 'bg-gray-500 text-white',
    border: 'border-gray-300',
    bg: 'bg-gray-50/50',
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
    <div
      ref={setNodeRef}
      className={`
        flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-150
        ${styles.border}
        ${isOver ? 'ring-2 ring-offset-1 ring-current scale-[1.02]' : ''}
      `}
    >
      <div className={`px-3 py-2 ${styles.header}`}>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs opacity-80">{description}</div>
      </div>

      <div className={`flex-1 min-h-[80px] p-2 space-y-2 ${styles.bg} ${isOver ? 'opacity-80' : ''}`}>
        {requirements.map(req => (
          <RequirementCard
            key={req.id}
            requirement={req}
            currentBucket={allPlacements[req.id] ?? 'pool'}
            onUndo={() => onUndo(req.id)}
            showMissingFlag={showMissingFlag}
            isFlagged={flaggedMissing.includes(req.id)}
            onToggleFlag={onToggleFlag ? () => onToggleFlag(req.id) : undefined}
          />
        ))}
        {requirements.length === 0 && (
          <div className="h-10 flex items-center justify-center text-xs text-gray-400 italic">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
