import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { Requirement, BucketType } from '../types';

interface Props {
  requirement: Requirement;
  currentBucket: BucketType;
  onUndo?: () => void;
  showMissingFlag?: boolean;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
}

const bucketColors: Record<Exclude<BucketType, 'pool'>, string> = {
  must: 'border-red-300 bg-red-50',
  should: 'border-amber-300 bg-amber-50',
  could: 'border-blue-300 bg-blue-50',
  remove: 'border-gray-300 bg-gray-50',
};

const bucketIcons: Record<Exclude<BucketType, 'pool'>, string> = {
  must: '🔴',
  should: '🟡',
  could: '🔵',
  remove: '⚫',
};

export function RequirementCard({
  requirement,
  currentBucket,
  onUndo,
  showMissingFlag = false,
  isFlagged = false,
  onToggleFlag,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: requirement.id,
    data: { requirement },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    // Prevent scroll hijacking during touch drag
    touchAction: 'none' as const,
  };

  const colorClass =
    currentBucket !== 'pool' ? bucketColors[currentBucket] : 'border-gray-200 bg-white';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Requirement: ${requirement.text}${currentBucket !== 'pool' ? `. Currently in ${currentBucket} bucket` : '. Drag to a bucket'}`}
      aria-grabbed={isDragging}
      animate={
        isDragging
          ? { scale: 1.05, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 50 }
          : { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', zIndex: 0 }
      }
      whileHover={isDragging ? {} : { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`
        requirement-card
        relative p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing
        select-none transition-colors duration-150
        ${colorClass}
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      <p className="text-sm text-gray-800 leading-snug pr-6">{requirement.text}</p>

      {/* Icon badge showing bucket type for non-pool items (icon + text aria equivalent) */}
      {currentBucket !== 'pool' && (
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 left-2 text-[10px] opacity-40"
        >
          {bucketIcons[currentBucket as Exclude<BucketType, 'pool'>]}
        </span>
      )}

      <div className="absolute top-2 right-2 flex gap-1">
        {showMissingFlag && onToggleFlag && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFlag();
            }}
            aria-label={isFlagged ? 'Unflag as missing info' : 'Flag as missing info'}
            title={isFlagged ? 'Unflag as missing info' : 'Flag as missing info'}
            className={`
              w-5 h-5 rounded-full text-xs flex items-center justify-center
              transition-colors
              ${isFlagged
                ? 'bg-purple-500 text-white'
                : 'bg-purple-100 text-purple-500 hover:bg-purple-200'
              }
            `}
          >
            ?
          </button>
        )}

        {currentBucket !== 'pool' && onUndo && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            aria-label="Return to pool"
            title="Return to pool"
            className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 text-xs flex items-center justify-center transition-colors"
          >
            ↩
          </button>
        )}
      </div>
    </motion.div>
  );
}
