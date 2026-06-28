import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cleanMathContent, normalizeMath, stripLatexFormatting } from '@/lib/mathFormat';

interface Step {
  id: string;
  content: string;
  correctOrder: number;
}

interface SortableStepItemProps {
  step: Step;
  dragId?: string;
  index: number;
  totalSteps: number;
  showFeedback: boolean;
}

const renderContent = (content: string) => {
  return normalizeMath(stripLatexFormatting(cleanMathContent(content)));
};

const SortableStepItem: React.FC<SortableStepItemProps> = ({
  step,
  dragId,
  index,
  totalSteps,
  showFeedback,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId ?? step.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 200ms ease',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  };

  const isCorrect = showFeedback && step.correctOrder === index + 1;
  const isIncorrect = showFeedback && step.correctOrder !== index + 1;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          'relative flex items-center gap-3 p-4 rounded-xl',
          'bg-card border-2 shadow-md',
          isDragging && 'shadow-xl ring-2 ring-primary',
          !showFeedback && 'border-border hover:border-primary/50 hover:shadow-lg',
          isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
          isIncorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30'
        )}
      >
        {/* Step Number */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
            !showFeedback && 'bg-primary/10 text-primary',
            isCorrect && 'bg-green-500 text-white',
            isIncorrect && 'bg-red-500 text-white'
          )}
        >
          {index + 1}
        </div>

        {/* Grip Handle — this is the drag handle */}
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Step Content */}
        <div className="flex-1 font-medium text-foreground select-none">
          {renderContent(step.content)}
        </div>

        {/* Feedback Icon */}
        {showFeedback && (
          <div className="flex-shrink-0">
            {isCorrect ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Correct Position Indicator */}
        {showFeedback && isIncorrect && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2">
            <Badge variant="outline" className="bg-background text-xs">
              Should be #{step.correctOrder}
            </Badge>
          </div>
        )}
      </div>

      {/* Arrow between steps */}
      {index < totalSteps - 1 && (
        <div className="flex justify-center py-1 opacity-50">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default SortableStepItem;
