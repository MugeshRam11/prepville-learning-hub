import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Shuffle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SortableStepItem from './SortableStepItem';

interface Step {
  id: string;
  content: string;
  correctOrder: number;
}

interface NormalizedStep extends Step {
  dndId: string;
  sourceId: string;
}

interface StepBuilderProps {
  steps: Step[];
  onOrderChange?: (orderedStepIds: string[]) => void;
  showFeedback?: boolean;
  initialOrder?: string[];
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const createStepSignature = (steps: Step[]) =>
  steps.map((step, index) => `${step.id ?? `missing-${index}`}::${step.content}::${step.correctOrder}`).join('||');

const normalizeSteps = (steps: Step[]): NormalizedStep[] => {
  const idCounts = new Map<string, number>();

  return steps.map((step, index) => {
    const sourceId = String(step.id ?? `step-${index + 1}`);
    const duplicateCount = idCounts.get(sourceId) ?? 0;
    idCounts.set(sourceId, duplicateCount + 1);

    return {
      ...step,
      id: sourceId,
      sourceId,
      dndId: duplicateCount === 0 ? sourceId : `${sourceId}__${index}`,
    };
  });
};

const orderBySavedIds = (normalized: NormalizedStep[], savedIds?: string[]): NormalizedStep[] => {
  if (!savedIds || savedIds.length === 0) return shuffleArray(normalized);
  const remaining = [...normalized];
  const result: NormalizedStep[] = [];
  for (const id of savedIds) {
    const idx = remaining.findIndex((s) => s.sourceId === id);
    if (idx >= 0) result.push(remaining.splice(idx, 1)[0]);
  }
  // Append any unmatched at the end (shouldn't happen normally)
  return [...result, ...remaining];
};

const StepBuilder: React.FC<StepBuilderProps> = ({
  steps,
  onOrderChange,
  showFeedback = false,
  initialOrder,
}) => {
  const stepsSignature = useMemo(() => createStepSignature(steps), [steps]);
  const normalizedSteps = useMemo(() => normalizeSteps(steps), [stepsSignature]);
  const [orderedSteps, setOrderedSteps] = useState<NormalizedStep[]>(() => orderBySavedIds(normalizedSteps, initialOrder));
  const [activeId, setActiveId] = useState<string | null>(null);
  const previousSignatureRef = useRef(stepsSignature);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (previousSignatureRef.current === stepsSignature) return;

    previousSignatureRef.current = stepsSignature;
    setOrderedSteps(orderBySavedIds(normalizedSteps, initialOrder));
    setActiveId(null);
  }, [normalizedSteps, stepsSignature, initialOrder]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      setOrderedSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s.dndId === String(active.id));
        const newIndex = prev.findIndex((s) => s.dndId === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prev;
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        onOrderChange?.(newOrder.map((s) => s.sourceId));
        return newOrder;
      });
    },
    [onOrderChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleShuffle = () => {
    const shuffled = shuffleArray(orderedSteps);
    setOrderedSteps(shuffled);
    onOrderChange?.(shuffled.map((s) => s.sourceId));
  };

  const handleReset = () => {
    const shuffled = shuffleArray(normalizedSteps);
    setOrderedSteps(shuffled);
    onOrderChange?.(shuffled.map((s) => s.sourceId));
  };

  const correctCount = orderedSteps.filter((step, i) => step.correctOrder === i + 1).length;
  const allCorrect = correctCount === steps.length;

  const activeStep = activeId ? orderedSteps.find((s) => s.dndId === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GripVertical className="w-4 h-4" />
              <span>Drag and drop to arrange the steps in the correct order</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleShuffle} className="text-muted-foreground hover:text-foreground">
                <Shuffle className="w-4 h-4 mr-1" />
                Shuffle
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sortable Steps */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToVerticalAxis]}
        measuring={{
          droppable: { strategy: MeasuringStrategy.Always },
        }}
      >
        <SortableContext items={orderedSteps.map((s) => s.dndId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedSteps.map((step, index) => (
              <SortableStepItem
                key={step.dndId}
                step={step}
                dragId={step.dndId}
                index={index}
                totalSteps={orderedSteps.length}
                showFeedback={showFeedback}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeStep ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border-2 border-primary shadow-2xl scale-[1.02]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary/10 text-primary">
                ⋮
              </div>
              <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 font-medium text-foreground">{activeStep.content}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Score Display */}
      {showFeedback && (
        <div
          className={cn(
            'text-center p-4 rounded-xl',
            allCorrect
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30'
              : 'bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30'
          )}
        >
          <div className="text-lg font-bold text-foreground">
            {correctCount} / {steps.length} steps in correct order
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {allCorrect
              ? '🎉 Excellent! This is exactly how IB examiners mark method marks!'
              : 'Think about the logical sequence of solving this equation.'}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Marks: {correctCount + (allCorrect ? 1 : 0)} / 5
          </div>
        </div>
      )}
    </div>
  );
};

export default StepBuilder;
