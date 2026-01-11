import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, Sparkles, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface PuzzleItem {
  id: string;
  content: string;
  isLatex?: boolean;
  color?: 'red' | 'blue' | 'green' | 'orange' | 'purple';
}

interface PuzzleSlot {
  id: string;
  label?: string;
  shape?: 'notch' | 'tab' | 'square';
  correctItemId: string;
  image?: string;
}

interface PuzzleDragDropProps {
  items: PuzzleItem[];
  slots: PuzzleSlot[];
  onMatchesChange?: (matches: Record<string, string>) => void;
  showFeedback?: boolean;
  puzzleTitle?: string;
}

const PUZZLE_COLORS = {
  red: {
    bg: 'from-red-500 to-red-600',
    border: 'border-red-700',
    shadow: 'shadow-red-500/40',
    glow: 'shadow-red-400/60',
    text: 'text-white'
  },
  blue: {
    bg: 'from-blue-500 to-blue-600',
    border: 'border-blue-700',
    shadow: 'shadow-blue-500/40',
    glow: 'shadow-blue-400/60',
    text: 'text-white'
  },
  green: {
    bg: 'from-green-500 to-green-600',
    border: 'border-green-700',
    shadow: 'shadow-green-500/40',
    glow: 'shadow-green-400/60',
    text: 'text-white'
  },
  orange: {
    bg: 'from-orange-500 to-orange-600',
    border: 'border-orange-700',
    shadow: 'shadow-orange-500/40',
    glow: 'shadow-orange-400/60',
    text: 'text-white'
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    border: 'border-purple-700',
    shadow: 'shadow-purple-500/40',
    glow: 'shadow-purple-400/60',
    text: 'text-white'
  }
};

const PuzzleDragDrop: React.FC<PuzzleDragDropProps> = ({
  items,
  slots,
  onMatchesChange,
  showFeedback = false,
  puzzleTitle = "Drag to complete each puzzle"
}) => {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<{ slotId: string; itemId: string; correct?: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Assign colors to items
  const coloredItems = items.map((item, idx) => ({
    ...item,
    color: item.color || (['red', 'blue', 'green', 'orange', 'purple'] as const)[idx % 5]
  }));

  const renderLatex = (content: string, isLatex?: boolean) => {
    if (!isLatex) return <span className="text-lg font-bold">{content}</span>;
    try {
      const html = katex.renderToString(content, {
        displayMode: false,
        throwOnError: false
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} className="text-lg" />;
    } catch {
      return <span className="text-lg font-bold">{content}</span>;
    }
  };

  const handleDragStart = (itemId: string) => {
    setDraggingItem(itemId);
    setLastMatch(null);
  };

  const handleDragEnd = () => {
    if (draggingItem && hoveredSlot) {
      handleDrop(hoveredSlot);
    }
    setDraggingItem(null);
    setHoveredSlot(null);
  };

  const handleDrop = (slotId: string) => {
    if (!draggingItem) return;

    const newMatches = { ...matches };
    
    // Remove item from any previous slot
    Object.keys(newMatches).forEach(key => {
      if (newMatches[key] === draggingItem) {
        delete newMatches[key];
      }
    });

    // Add to new slot
    newMatches[slotId] = draggingItem;
    setMatches(newMatches);
    onMatchesChange?.(newMatches);

    // Check if correct for feedback
    const slot = slots.find(s => s.id === slotId);
    const isCorrect = slot?.correctItemId === draggingItem;
    setLastMatch({ slotId, itemId: draggingItem, correct: showFeedback ? isCorrect : undefined });
  };

  const handleRemoveMatch = (slotId: string) => {
    if (showFeedback) return; // Don't allow removal in feedback mode
    
    const newMatches = { ...matches };
    delete newMatches[slotId];
    setMatches(newMatches);
    onMatchesChange?.(newMatches);
    setLastMatch(null);
  };

  const handleReset = () => {
    setMatches({});
    onMatchesChange?.({});
    setLastMatch(null);
  };

  const getUnmatchedItems = () => {
    const matchedItemIds = Object.values(matches);
    return coloredItems.filter(item => !matchedItemIds.includes(item.id));
  };

  const getMatchedItem = (slotId: string) => {
    const itemId = matches[slotId];
    return coloredItems.find(item => item.id === itemId);
  };

  const isCorrectMatch = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    return slot && matches[slotId] === slot.correctItemId;
  };

  const unmatchedItems = getUnmatchedItems();
  const correctCount = slots.filter(s => isCorrectMatch(s.id)).length;

  // Puzzle piece shape SVG path for notch/tab
  const PuzzlePieceSVG = ({ type, filled }: { type: 'notch' | 'tab'; filled?: boolean }) => {
    if (type === 'tab') {
      return (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-8">
          <div className={cn(
            "w-6 h-8 rounded-r-full",
            filled ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-muted border-2 border-dashed border-muted-foreground/40"
          )} />
        </div>
      );
    }
    return (
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-8">
        <div className={cn(
          "w-6 h-8 rounded-l-full",
          filled ? "bg-gradient-to-l from-red-500 to-red-600" : "bg-background border-2 border-dashed border-muted-foreground/40"
        )} />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <GripVertical className="w-4 h-4" />
          Draggable:
        </h4>
        {Object.keys(matches).length > 0 && !showFeedback && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
            <Undo2 className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Draggable Items Pool */}
      <Card className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-2 overflow-visible">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 min-h-[80px] items-center justify-center">
            <AnimatePresence mode="popLayout">
              {unmatchedItems.map((item) => {
                const colorStyle = PUZZLE_COLORS[item.color || 'blue'];
                
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                    animate={{ 
                      scale: draggingItem === item.id ? 1.15 : 1, 
                      opacity: 1, 
                      rotate: 0,
                      zIndex: draggingItem === item.id ? 50 : 1
                    }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                    whileHover={{ 
                      scale: 1.08, 
                      rotate: [-1, 1, -1, 0],
                      transition: { rotate: { repeat: 0, duration: 0.3 } }
                    }}
                    whileTap={{ scale: 0.95 }}
                    drag
                    dragConstraints={containerRef}
                    dragElastic={0.9}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "relative px-6 py-4 rounded-xl cursor-grab active:cursor-grabbing",
                      "bg-gradient-to-br", colorStyle.bg,
                      "border-2", colorStyle.border,
                      "shadow-lg", colorStyle.shadow,
                      colorStyle.text,
                      "select-none font-bold",
                      draggingItem === item.id && [
                        "shadow-2xl",
                        "ring-4 ring-white/50",
                        colorStyle.glow
                      ]
                    )}
                    style={{ touchAction: 'none' }}
                  >
                    {/* Puzzle tab (right side notch) */}
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-gradient-to-r from-transparent to-white/20 rounded-r-full" />
                    
                    {renderLatex(item.content, item.isLatex)}
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {unmatchedItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium"
              >
                <Sparkles className="w-5 h-5" />
                All pieces placed!
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drop Slots Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot, idx) => {
          const matchedItem = getMatchedItem(slot.id);
          const isCorrect = showFeedback && matchedItem && isCorrectMatch(slot.id);
          const isIncorrect = showFeedback && matchedItem && !isCorrectMatch(slot.id);
          const isHovered = hoveredSlot === slot.id && draggingItem && !matchedItem;
          const wasJustMatched = lastMatch?.slotId === slot.id;
          const colorStyle = matchedItem ? PUZZLE_COLORS[matchedItem.color || 'blue'] : null;

          return (
            <motion.div
              key={slot.id}
              ref={(el) => { slotRefs.current[slot.id] = el; }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!matchedItem) setHoveredSlot(slot.id);
              }}
              onDragLeave={() => setHoveredSlot(null)}
              onDrop={() => handleDrop(slot.id)}
              className={cn(
                "relative p-4 rounded-2xl border-3 transition-all duration-300 min-h-[100px]",
                "flex flex-col items-center justify-center gap-2",
                
                // Empty slot
                !matchedItem && !isHovered && [
                  "border-dashed border-slate-300 dark:border-slate-600",
                  "bg-slate-50/50 dark:bg-slate-800/50"
                ],
                
                // Hovered (glowing)
                isHovered && [
                  "border-solid border-primary",
                  "bg-primary/10",
                  "shadow-lg shadow-primary/30",
                  "ring-4 ring-primary/20",
                  "scale-105"
                ],
                
                // Filled
                matchedItem && !showFeedback && [
                  "border-solid border-slate-400 dark:border-slate-500",
                  "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800"
                ],
                
                // Correct
                isCorrect && [
                  "border-solid border-green-500",
                  "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30",
                  "shadow-lg shadow-green-500/30",
                  "ring-2 ring-green-400/50"
                ],
                
                // Incorrect
                isIncorrect && [
                  "border-solid border-red-500",
                  "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30",
                  "shadow-lg shadow-red-500/30"
                ]
              )}
            >
              {/* Slot label */}
              {slot.label && (
                <span className="text-xs font-medium text-muted-foreground mb-1">
                  {slot.label}
                </span>
              )}
              
              {/* Slot image preview */}
              {slot.image && (
                <img 
                  src={slot.image} 
                  alt="" 
                  className="w-16 h-16 object-contain rounded-lg mb-2 opacity-60"
                />
              )}

              {/* Matched Item or Placeholder */}
              {matchedItem ? (
                <motion.div
                  initial={{ scale: 0.5, rotate: -20 }}
                  animate={{ 
                    scale: wasJustMatched ? [1, 1.1, 1] : 1, 
                    rotate: 0 
                  }}
                  className={cn(
                    "relative px-6 py-4 rounded-xl font-bold",
                    "bg-gradient-to-br", colorStyle?.bg,
                    "border-2", colorStyle?.border,
                    "shadow-md",
                    colorStyle?.text,
                    !showFeedback && "cursor-pointer hover:scale-105 transition-transform"
                  )}
                  onClick={() => handleRemoveMatch(slot.id)}
                  title={!showFeedback ? "Click to remove" : undefined}
                >
                  {/* Puzzle notch (left side) */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-gradient-to-l from-transparent to-black/10 rounded-l-full" />
                  
                  {renderLatex(matchedItem.content, matchedItem.isLatex)}
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ 
                    scale: isHovered ? 1.1 : 1,
                    opacity: isHovered ? 1 : 0.4
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  {/* Empty puzzle slot shape */}
                  <div className={cn(
                    "w-24 h-12 rounded-xl border-2 border-dashed flex items-center justify-center",
                    isHovered 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/30"
                  )}>
                    <span className="text-xs text-muted-foreground">
                      Drop here
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Feedback badges */}
              {showFeedback && matchedItem && (
                <motion.div
                  initial={{ scale: 0, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -top-2 -right-2"
                >
                  <Badge className={cn(
                    "rounded-full w-8 h-8 flex items-center justify-center p-0 shadow-lg",
                    isCorrect && "bg-green-500 hover:bg-green-500",
                    isIncorrect && "bg-red-500 hover:bg-red-500"
                  )}>
                    {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Match Feedback Toast */}
      <AnimatePresence>
        {lastMatch && lastMatch.correct !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
              "px-6 py-3 rounded-full shadow-xl",
              "flex items-center gap-3 font-medium",
              lastMatch.correct
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            )}
          >
            {lastMatch.correct ? (
              <>
                <Check className="w-5 h-5" />
                <span>Correct! Well done!</span>
                <Sparkles className="w-5 h-5" />
              </>
            ) : (
              <>
                <X className="w-5 h-5" />
                <span>Try again!</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score Display */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-center p-6 rounded-2xl",
            correctCount === slots.length
              ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30"
              : "bg-gradient-to-br from-primary/10 to-accent/10"
          )}
        >
          <motion.div 
            className="text-3xl font-bold text-foreground mb-2"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
          >
            {correctCount} / {slots.length}
          </motion.div>
          <div className="text-sm text-muted-foreground">
            {correctCount === slots.length ? (
              <span className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <Sparkles className="w-4 h-4" />
                🎉 Perfect! All puzzles solved correctly!
                <Sparkles className="w-4 h-4" />
              </span>
            ) : (
              'Keep going! Check the incorrect matches.'
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PuzzleDragDrop;
