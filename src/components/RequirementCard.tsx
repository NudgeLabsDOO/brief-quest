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
  remove: 'border-gray-300 bg-gray-100',
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
    zIndex: isDragging ? 50 : undefined,
  };

  const colorClass = currentBucket !== 'pool' ? bucketColors[currentBucket] : 'border-gray-200 bg-white';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.4 : 1,
        scale: isDragging ? 1.05 : 1,
      }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`
        requirement-card
        relative p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing
        shadow-sm select-none touch-none
        ${colorClass}
        ${isDragging ? 'shadow-xl' : 'hover:shadow-md hover:-translate-y-0.5 transition-transform duration-100'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Requirement: ${requirement.text}. Press Enter to move.`}
      onKeyDown={(e) => {
        // Keyboard accessibility: Enter to announce, arrows handled by parent
        if (e.key === 'Backspace' && onUndo) {
          e.preventDefault();
          onUndo();
        }
      }}
    >
      <p className="text-sm text-gray-800 leading-snug pr-8">{requirement.text}</p>

      <div className="absolute top-2 right-2 flex gap-1">
        {showMissingFlag && onToggleFlag && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFlag();
            }}
            title={isFlagged ? 'Unflag as missing info' : 'Flag as missing info'}
            aria-pressed={isFlagged}
            aria-label="Toggle missing information flag"
            className={`
              w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold
              transition-all duration-150
              ${isFlagged
                ? 'bg-purple-500 text-white shadow-sm'
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
            title="Return to unsorted pile (Backspace)"
            aria-label="Undo placement"
            className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 text-xs flex items-center justify-center transition-colors"
          >
            ↩
          </button>
        )}
      </div>
    </motion.div>
  );
}
