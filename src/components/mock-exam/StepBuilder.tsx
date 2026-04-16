import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
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

interface StepBuilderProps {
  steps: Step[];
  onOrderChange?: (orderedStepIds: string[]) => void;
  showFeedback?: boolean;
}

const shuffleArray = (array: Step[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const StepBuilder: React.FC<StepBuilderProps> = ({
  steps,
  onOrderChange,
  showFeedback = false,
}) => {
  const [orderedSteps, setOrderedSteps] = useState<Step[]>(() => shuffleArray(steps));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setOrderedSteps(shuffleArray(steps));
  }, [steps]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      setOrderedSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === String(active.id));
        const newIndex = prev.findIndex((s) => s.id === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prev;
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        onOrderChange?.(newOrder.map((s) => s.id));
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
    onOrderChange?.(shuffled.map((s) => s.id));
  };

  const handleReset = () => {
    const shuffled = shuffleArray(steps);
    setOrderedSteps(shuffled);
    onOrderChange?.(shuffled.map((s) => s.id));
  };

  const correctCount = orderedSteps.filter((step, i) => step.correctOrder === i + 1).length;
  const allCorrect = correctCount === steps.length;

  const activeStep = activeId ? orderedSteps.find((s) => s.id === activeId) : null;

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
        <SortableContext items={orderedSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedSteps.map((step, index) => (
              <SortableStepItem
                key={step.id}
                step={step}
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
