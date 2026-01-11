import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, Sparkles, Undo2, Volume2 } from 'lucide-react';
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
  targetValue?: string; // What the puzzle represents (e.g., "16:24" for equivalent ratio)
}

interface PuzzleDragDropProps {
  items: PuzzleItem[];
  slots: PuzzleSlot[];
  onMatchesChange?: (matches: Record<string, string>) => void;
  showFeedback?: boolean;
  puzzleTitle?: string;
  showMatchedValues?: boolean; // Show "Matched ratio: 6:4 = 16:24" style feedback
}

// Rich, vibrant puzzle piece colors matching the reference image
const PUZZLE_COLORS = {
  red: {
    bg: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
    bgHex: '#dc2626',
    border: 'border-red-800',
    shadow: 'shadow-red-600/50',
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    ring: 'ring-red-400/60',
    text: 'text-white',
    highlight: 'from-red-400/40'
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700',
    bgHex: '#2563eb',
    border: 'border-blue-800',
    shadow: 'shadow-blue-600/50',
    glow: 'shadow-[0_0_25px_rgba(59,130,246,0.6)]',
    ring: 'ring-blue-400/60',
    text: 'text-white',
    highlight: 'from-blue-400/40'
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
    bgHex: '#10b981',
    border: 'border-emerald-800',
    shadow: 'shadow-emerald-600/50',
    glow: 'shadow-[0_0_25px_rgba(16,185,129,0.6)]',
    ring: 'ring-emerald-400/60',
    text: 'text-white',
    highlight: 'from-emerald-400/40'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700',
    bgHex: '#ea580c',
    border: 'border-orange-800',
    shadow: 'shadow-orange-600/50',
    glow: 'shadow-[0_0_25px_rgba(234,88,12,0.6)]',
    ring: 'ring-orange-400/60',
    text: 'text-white',
    highlight: 'from-orange-400/40'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700',
    bgHex: '#9333ea',
    border: 'border-purple-800',
    shadow: 'shadow-purple-600/50',
    glow: 'shadow-[0_0_25px_rgba(147,51,234,0.6)]',
    ring: 'ring-purple-400/60',
    text: 'text-white',
    highlight: 'from-purple-400/40'
  }
};

const PuzzleDragDrop: React.FC<PuzzleDragDropProps> = ({
  items,
  slots,
  onMatchesChange,
  showFeedback = false,
  puzzleTitle = "Drag to complete each puzzle",
  showMatchedValues = true
}) => {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<{ slotId: string; itemId: string; correct?: boolean; matchText?: string } | null>(null);
  const [showCorrectAnimation, setShowCorrectAnimation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Assign colors to items
  const coloredItems = items.map((item, idx) => ({
    ...item,
    color: item.color || (['red', 'blue', 'green', 'orange', 'purple'] as const)[idx % 5]
  }));

  const renderLatex = (content: string, isLatex?: boolean) => {
    if (!isLatex) return <span className="text-xl font-black tracking-wide">{content}</span>;
    try {
      const html = katex.renderToString(content, {
        displayMode: false,
        throwOnError: false
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} className="text-xl" />;
    } catch {
      return <span className="text-xl font-black">{content}</span>;
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
    const item = coloredItems.find(i => i.id === draggingItem);
    const isCorrect = slot?.correctItemId === draggingItem;
    
    // Create match text for feedback (e.g., "6:4 = 16:24")
    const matchText = item && slot?.targetValue 
      ? `${item.content} = ${slot.targetValue}`
      : undefined;
    
    setLastMatch({ slotId, itemId: draggingItem, correct: isCorrect, matchText });
    
    if (isCorrect) {
      setShowCorrectAnimation(true);
      setTimeout(() => setShowCorrectAnimation(false), 2000);
    }
  };

  const handleRemoveMatch = (slotId: string) => {
    if (showFeedback) return;
    
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

  // Puzzle piece with interlocking shape (notch on left, tab on right)
  const PuzzlePiece = ({ 
    item, 
    isDragging, 
    isInSlot = false,
    slotColor
  }: { 
    item: PuzzleItem & { color: 'red' | 'blue' | 'green' | 'orange' | 'purple' }; 
    isDragging?: boolean;
    isInSlot?: boolean;
    slotColor?: 'red' | 'blue' | 'green' | 'orange' | 'purple';
  }) => {
    const colorKey = slotColor || item.color || 'blue';
    const colorStyle = PUZZLE_COLORS[colorKey] || PUZZLE_COLORS.blue;
    
    return (
      <div 
        className={cn(
          "relative",
          isDragging && colorStyle.glow
        )}
        style={{ 
          filter: isDragging ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : undefined 
        }}
      >
        {/* Main puzzle body with interlocking shape */}
        <svg 
          viewBox="0 0 160 80" 
          className={cn(
            "w-36 h-18",
            isInSlot ? "w-32 h-16" : "w-36 h-18"
          )}
          style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}
        >
          <defs>
            <linearGradient id={`puzzle-gradient-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: colorStyle.bgHex, stopOpacity: 0.9 }} />
              <stop offset="50%" style={{ stopColor: colorStyle.bgHex, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: colorStyle.bgHex, stopOpacity: 0.8 }} />
            </linearGradient>
            <linearGradient id={`shine-${item.id}`} x1="0%" y1="0%" x2="50%" y2="50%">
              <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.4 }} />
              <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          
          {/* Puzzle piece path with notch (left) and tab (right) */}
          <path 
            d="M 25 5 
               L 130 5 
               L 130 25 
               C 145 25 155 40 145 40 
               C 155 40 145 55 130 55 
               L 130 75 
               L 25 75 
               L 25 55 
               C 10 55 0 40 10 40 
               C 0 40 10 25 25 25 
               Z"
            fill={`url(#puzzle-gradient-${item.id})`}
            stroke={colorStyle.bgHex}
            strokeWidth="2"
          />
          
          {/* Shine overlay */}
          <path 
            d="M 25 5 
               L 130 5 
               L 130 25 
               C 145 25 155 40 145 40 
               C 155 40 145 55 130 55 
               L 130 75 
               L 25 75 
               L 25 55 
               C 10 55 0 40 10 40 
               C 0 40 10 25 25 25 
               Z"
            fill={`url(#shine-${item.id})`}
            opacity="0.5"
          />
          
          {/* Inner border highlight */}
          <path 
            d="M 28 8 
               L 127 8 
               L 127 26 
               C 140 26 148 40 140 40 
               C 148 40 140 54 127 54 
               L 127 72 
               L 28 72 
               L 28 54 
               C 15 54 7 40 15 40 
               C 7 40 15 26 28 26 
               Z"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
        </svg>
        
        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-center text-white font-black text-xl drop-shadow-lg">
          {renderLatex(item.content, item.isLatex)}
        </div>
      </div>
    );
  };

  // Empty puzzle slot with notch shape
  const EmptyPuzzleSlot = ({ isHovered, slotLabel }: { isHovered: boolean; slotLabel?: string }) => (
    <div className="relative">
      <svg 
        viewBox="0 0 160 80" 
        className="w-32 h-16"
      >
        <defs>
          <linearGradient id="slot-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: isHovered ? '#3b82f6' : '#94a3b8', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: isHovered ? '#3b82f6' : '#94a3b8', stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>
        
        {/* Slot outline with matching puzzle shape */}
        <path 
          d="M 25 5 
             L 130 5 
             L 130 25 
             C 145 25 155 40 145 40 
             C 155 40 145 55 130 55 
             L 130 75 
             L 25 75 
             L 25 55 
             C 10 55 0 40 10 40 
             C 0 40 10 25 25 25 
             Z"
          fill="url(#slot-gradient)"
          stroke={isHovered ? '#3b82f6' : '#94a3b8'}
          strokeWidth="2"
          strokeDasharray={isHovered ? "0" : "8 4"}
          className="transition-all duration-200"
        />
      </svg>
      
      {/* Slot label */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center transition-all",
        isHovered ? "text-primary font-medium" : "text-muted-foreground"
      )}>
        <span className="text-sm">{slotLabel || 'Drop here'}</span>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-6 py-4">
      {/* Header with title and reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-semibold text-foreground">Draggable:</h4>
        </div>
        {Object.keys(matches).length > 0 && !showFeedback && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
            <Undo2 className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Draggable Items Pool - Gradient background */}
      <Card className="bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-inner overflow-visible">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-6 min-h-[100px] items-center justify-center">
            <AnimatePresence mode="popLayout">
              {unmatchedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ scale: 0.8, opacity: 0, rotate: -5, y: 20 }}
                  animate={{ 
                    scale: draggingItem === item.id ? 1.1 : 1, 
                    opacity: 1, 
                    rotate: 0,
                    y: 0,
                    zIndex: draggingItem === item.id ? 50 : 1
                  }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 10, y: -20 }}
                  whileHover={{ 
                    scale: 1.05,
                    y: -4,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  drag
                  dragConstraints={containerRef}
                  dragElastic={0.8}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }}
                >
                  <PuzzlePiece 
                    item={item as PuzzleItem & { color: 'red' | 'blue' | 'green' | 'orange' | 'purple' }} 
                    isDragging={draggingItem === item.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {unmatchedItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 text-green-600 dark:text-green-400 font-semibold py-4"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
                <span className="text-lg">All pieces placed!</span>
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
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

      {/* Match Feedback Toast with matched values */}
      <AnimatePresence>
        {lastMatch && lastMatch.correct !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
              "px-6 py-3 rounded-2xl shadow-2xl",
              "flex items-center gap-3 font-semibold",
              lastMatch.correct
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
            )}
          >
            {lastMatch.correct ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 3, duration: 0.3 }}
                >
                  <Check className="w-5 h-5" />
                </motion.div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold">Correct!</span>
                  {showMatchedValues && lastMatch.matchText && (
                    <span className="text-xs opacity-90">
                      Matched: {lastMatch.matchText}
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
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
