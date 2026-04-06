import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, ArrowDown, Shuffle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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

const StepBuilder: React.FC<StepBuilderProps> = ({
  steps,
  onOrderChange,
  showFeedback = false
}) => {
  // Shuffle steps initially
  const shuffleArray = (array: Step[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [orderedSteps, setOrderedSteps] = useState<Step[]>(() => shuffleArray(steps));

  useEffect(() => {
    // Reshuffle when steps change (new question)
    setOrderedSteps(shuffleArray(steps));
  }, [steps]);

  const handleReorder = (newOrder: Step[]) => {
    setOrderedSteps(newOrder);
    onOrderChange?.(newOrder.map(s => s.id));
  };

  const handleShuffle = () => {
    const shuffled = shuffleArray(orderedSteps);
    setOrderedSteps(shuffled);
    onOrderChange?.(shuffled.map(s => s.id));
  };

  const handleReset = () => {
    const shuffled = shuffleArray(steps);
    setOrderedSteps(shuffled);
    onOrderChange?.(shuffled.map(s => s.id));
  };

  const isStepCorrect = (step: Step, index: number) => {
    return step.correctOrder === index + 1;
  };

  const renderContent = (content: string) => {
    // Check for LaTeX patterns
    if (content.includes('$') || content.includes('\\')) {
      const parts = content.split(/(\$[^$]+\$)/g);
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const equation = part.slice(1, -1);
          try {
            const html = katex.renderToString(equation, {
              displayMode: false,
              throwOnError: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch {
            return <span key={index}>{equation}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      });
    }
    return content;
  };

  const correctCount = orderedSteps.filter((step, i) => isStepCorrect(step, i)).length;
  const allCorrect = correctCount === steps.length;

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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShuffle}
                className="text-muted-foreground hover:text-foreground"
              >
                <Shuffle className="w-4 h-4 mr-1" />
                Shuffle
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reorderable Steps */}
      <Reorder.Group
        axis="y"
        values={orderedSteps}
        onReorder={handleReorder}
        className="space-y-3"
      >
        {orderedSteps.map((step, index) => {
          const isCorrect = showFeedback && isStepCorrect(step, index);
          const isIncorrect = showFeedback && !isStepCorrect(step, index);

          return (
            <Reorder.Item
              key={step.id}
              value={step}
              className="list-none"
            >
              <div
                className={cn(
                  "relative flex items-center gap-3 p-4 rounded-xl cursor-grab active:cursor-grabbing",
                  "bg-card border-2 shadow-md",
                  !showFeedback && "border-border hover:border-primary hover:shadow-lg",
                  isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                  isIncorrect && "border-red-500 bg-red-50 dark:bg-red-950/30"
                )}
              >
                {/* Step Number */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  !showFeedback && "bg-primary/10 text-primary",
                  isCorrect && "bg-green-500 text-white",
                  isIncorrect && "bg-red-500 text-white"
                )}>
                  {index + 1}
                </div>

                {/* Grip Handle */}
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                {/* Step Content */}
                <div className="flex-1 font-medium text-foreground">
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
              {index < orderedSteps.length - 1 && (
                <div className="flex justify-center py-1 opacity-50">
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Score Display */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-center p-4 rounded-xl",
            allCorrect 
              ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30"
              : "bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30"
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
        </motion.div>
      )}
    </div>
  );
};

export default StepBuilder;
