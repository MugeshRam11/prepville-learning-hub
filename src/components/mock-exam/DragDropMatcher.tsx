import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface DragItem {
  id: string;
  content: string;
  isLatex?: boolean;
}

interface DropTarget {
  id: string;
  label: string;
  image?: string;
  correctItemId: string;
}

interface DragDropMatcherProps {
  items: DragItem[];
  targets: DropTarget[];
  onMatchesChange?: (matches: Record<string, string>) => void;
  showFeedback?: boolean;
}

const DragDropMatcher: React.FC<DragDropMatcherProps> = ({
  items,
  targets,
  onMatchesChange,
  showFeedback = false
}) => {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);

  const renderLatex = (content: string, isLatex?: boolean) => {
    if (!isLatex) return content;
    try {
      const html = katex.renderToString(content, {
        displayMode: false,
        throwOnError: false
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return content;
    }
  };

  const handleDragStart = (itemId: string) => {
    setDraggingItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setHoveredTarget(null);
  };

  const handleDrop = (targetId: string) => {
    if (draggingItem) {
      // Remove item from previous match if exists
      const newMatches = { ...matches };
      
      // Remove from old position if this item was already placed
      Object.keys(newMatches).forEach(key => {
        if (newMatches[key] === draggingItem) {
          delete newMatches[key];
        }
      });

      // Remove old item from this target if exists
      if (newMatches[targetId]) {
        // Old item goes back to pool - handled by filtering unmatchedItems
      }

      newMatches[targetId] = draggingItem;
      setMatches(newMatches);
      onMatchesChange?.(newMatches);
    }
    setDraggingItem(null);
    setHoveredTarget(null);
  };

  const handleRemoveMatch = (targetId: string) => {
    const newMatches = { ...matches };
    delete newMatches[targetId];
    setMatches(newMatches);
    onMatchesChange?.(newMatches);
  };

  const getUnmatchedItems = () => {
    const matchedItemIds = Object.values(matches);
    return items.filter(item => !matchedItemIds.includes(item.id));
  };

  const getMatchedItem = (targetId: string) => {
    const itemId = matches[targetId];
    return items.find(item => item.id === itemId);
  };

  const isCorrectMatch = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    return target && matches[targetId] === target.correctItemId;
  };

  const unmatchedItems = getUnmatchedItems();

  return (
    <div className="space-y-6">
      {/* Draggable Items Pool */}
      <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Drag these equations to match:
          </h4>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {unmatchedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "px-4 py-2 rounded-lg cursor-grab active:cursor-grabbing",
                    "bg-card border-2 border-primary/30 shadow-md",
                    "hover:border-primary hover:shadow-lg transition-all",
                    "select-none font-medium text-foreground",
                    draggingItem === item.id && "opacity-50"
                  )}
                >
                  {renderLatex(item.content, item.isLatex)}
                </motion.div>
              ))}
            </AnimatePresence>
            {unmatchedItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-600 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                All equations matched!
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drop Targets */}
      <div className="grid gap-4 md:grid-cols-2">
        {targets.map((target) => {
          const matchedItem = getMatchedItem(target.id);
          const isCorrect = showFeedback && matchedItem && isCorrectMatch(target.id);
          const isIncorrect = showFeedback && matchedItem && !isCorrectMatch(target.id);

          return (
            <motion.div
              key={target.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onDragOver={(e) => {
                e.preventDefault();
                setHoveredTarget(target.id);
              }}
              onDragLeave={() => setHoveredTarget(null)}
              onDrop={() => handleDrop(target.id)}
              className={cn(
                "relative p-4 rounded-xl border-2 border-dashed transition-all min-h-[100px]",
                "flex flex-col gap-3",
                !matchedItem && "border-muted-foreground/30 bg-muted/20",
                hoveredTarget === target.id && !matchedItem && "border-primary bg-primary/10 scale-[1.02]",
                matchedItem && !showFeedback && "border-primary/50 bg-primary/5",
                isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                isIncorrect && "border-red-500 bg-red-50 dark:bg-red-950/30"
              )}
            >
              {/* Target Label */}
              <div className="flex items-center gap-2">
                {target.image && (
                  <img 
                    src={target.image} 
                    alt={target.label}
                    className="w-12 h-12 object-contain rounded"
                  />
                )}
                <span className="text-sm font-medium text-foreground">
                  {target.label}
                </span>
                {showFeedback && matchedItem && (
                  <Badge className={cn(
                    "ml-auto",
                    isCorrect && "bg-green-500",
                    isIncorrect && "bg-red-500"
                  )}>
                    {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </Badge>
                )}
              </div>

              {/* Drop Zone / Matched Item */}
              <div className="flex-1 flex items-center justify-center">
                {matchedItem ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium",
                      "bg-card border-2 shadow-sm cursor-pointer",
                      "hover:border-red-400 transition-colors",
                      isCorrect && "border-green-400",
                      isIncorrect && "border-red-400",
                      !showFeedback && "border-primary/30"
                    )}
                    onClick={() => !showFeedback && handleRemoveMatch(target.id)}
                    title="Click to remove"
                  >
                    {renderLatex(matchedItem.content, matchedItem.isLatex)}
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ 
                      scale: hoveredTarget === target.id ? 1.05 : 1,
                      opacity: hoveredTarget === target.id ? 1 : 0.5
                    }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Drop equation here
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Score Display */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10"
        >
          <div className="text-lg font-bold text-foreground">
            Score: {targets.filter(t => isCorrectMatch(t.id)).length} / {targets.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {targets.filter(t => isCorrectMatch(t.id)).length === targets.length 
              ? '🎉 Perfect! All matches are correct!' 
              : 'Keep trying! Check the incorrect matches.'}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DragDropMatcher;
