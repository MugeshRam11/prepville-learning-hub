import React, { useState, useRef, useCallback } from 'react';
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
  targetValue?: string;
}

interface PuzzleDragDropProps {
  items: PuzzleItem[];
  slots: PuzzleSlot[];
  onMatchesChange?: (matches: Record<string, string>) => void;
  showFeedback?: boolean;
  puzzleTitle?: string;
  showMatchedValues?: boolean;
  initialMatches?: Record<string, string>;
}

const PUZZLE_COLORS: Record<string, { bgHex: string; darkHex: string }> = {
  red: { bgHex: '#dc2626', darkHex: '#991b1b' },
  blue: { bgHex: '#2563eb', darkHex: '#1e40af' },
  green: { bgHex: '#10b981', darkHex: '#065f46' },
  orange: { bgHex: '#ea580c', darkHex: '#9a3412' },
  purple: { bgHex: '#9333ea', darkHex: '#6b21a8' },
};

const PUZZLE_PATH = "M 20 5 L 130 5 L 130 22 C 130 22 140 22 140 35 C 140 48 130 48 130 48 L 130 75 L 20 75 L 20 48 C 20 48 10 48 10 35 C 10 22 20 22 20 22 Z";
const PUZZLE_PATH_INNER = "M 23 8 L 127 8 L 127 24 C 127 24 137 24 137 35 C 137 46 127 46 127 46 L 127 72 L 23 72 L 23 46 C 23 46 13 46 13 35 C 13 24 23 24 23 24 Z";

const PuzzleDragDrop: React.FC<PuzzleDragDropProps> = ({
  items,
  slots,
  onMatchesChange,
  showFeedback = false,
  puzzleTitle = "Drag to complete each puzzle",
  showMatchedValues = true,
  initialMatches,
}) => {
  const [matches, setMatches] = useState<Record<string, string>>(initialMatches || {});
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const coloredItems = items.map((item, idx) => ({
    ...item,
    color: item.color || (['red', 'blue', 'green', 'orange', 'purple'] as const)[idx % 5]
  }));

  const renderLatex = (content: string, isLatex?: boolean) => {
    if (!isLatex) return <span className="font-bold text-base">{content}</span>;
    try {
      const html = katex.renderToString(content, { displayMode: false, throwOnError: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} className="text-base" />;
    } catch {
      return <span className="font-bold text-base">{content}</span>;
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    setDraggingItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    // Set a minimal drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingItem(null);
    setHoveredSlot(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData('text/plain') || draggingItem;
    if (!itemId) return;

    setMatches(prev => {
      const newMatches = { ...prev };
      // Remove item from any previous slot
      Object.keys(newMatches).forEach(key => {
        if (newMatches[key] === itemId) delete newMatches[key];
      });
      newMatches[slotId] = itemId;
      onMatchesChange?.(newMatches);
      return newMatches;
    });

    setDraggingItem(null);
    setHoveredSlot(null);
  }, [draggingItem, onMatchesChange]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, slotId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredSlot(slotId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  const handleRemoveMatch = useCallback((slotId: string) => {
    if (showFeedback) return;
    setMatches(prev => {
      const newMatches = { ...prev };
      delete newMatches[slotId];
      onMatchesChange?.(newMatches);
      return newMatches;
    });
  }, [showFeedback, onMatchesChange]);

  const handleReset = useCallback(() => {
    setMatches({});
    onMatchesChange?.({});
  }, [onMatchesChange]);

  const getUnmatchedItems = () => {
    const matchedItemIds = new Set(Object.values(matches));
    return coloredItems.filter(item => !matchedItemIds.has(item.id));
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

  const PuzzlePieceSVG = ({ color, content, isLatex, size = 'normal' }: { color: string; content: string; isLatex?: boolean; size?: 'normal' | 'small' }) => {
    const c = PUZZLE_COLORS[color] || PUZZLE_COLORS.blue;
    const w = size === 'small' ? 'w-28' : 'w-36';
    const h = size === 'small' ? 'h-16' : 'h-20';
    return (
      <div className={cn("relative", w, h)}>
        <svg viewBox="0 0 150 80" className="w-full h-full" style={{ filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.25))' }}>
          <defs>
            <linearGradient id={`pg-${color}-${content}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={c.bgHex} stopOpacity="1" />
              <stop offset="100%" stopColor={c.darkHex} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d={PUZZLE_PATH} fill={`url(#pg-${color}-${content})`} stroke={c.darkHex} strokeWidth="2" />
          <path d={PUZZLE_PATH_INNER} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <path d={PUZZLE_PATH} fill="url(#shine)" opacity="0.15" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md pointer-events-none px-4">
          {renderLatex(content, isLatex)}
        </div>
      </div>
    );
  };

  const EmptySlotSVG = ({ isHovered, label }: { isHovered: boolean; label?: string }) => (
    <div className="relative w-28 h-16">
      <svg viewBox="0 0 150 80" className="w-full h-full">
        <path
          d={PUZZLE_PATH}
          fill={isHovered ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.1)'}
          stroke={isHovered ? '#3b82f6' : '#94a3b8'}
          strokeWidth="2"
          strokeDasharray={isHovered ? '0' : '6 4'}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={cn("text-xs", isHovered ? "text-primary font-medium" : "text-muted-foreground")}>
          {label || 'Drop here'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 py-3">
      {/* Global SVG defs */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <linearGradient id="shine" x1="0%" y1="0%" x2="50%" y2="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-semibold text-foreground text-sm">Drag pieces to their matching slots</h4>
        </div>
        {Object.keys(matches).length > 0 && !showFeedback && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground">
            <Undo2 className="w-4 h-4 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* Draggable Pool */}
      <div className="bg-gradient-to-br from-muted/60 to-muted/30 border-2 border-border rounded-xl p-4 shadow-inner">
        <div className="flex flex-wrap gap-4 min-h-[80px] items-center justify-center">
          {unmatchedItems.length > 0 ? (
            unmatchedItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "cursor-grab active:cursor-grabbing select-none transition-opacity",
                  draggingItem === item.id && "opacity-40"
                )}
                style={{ touchAction: 'none' }}
              >
                <PuzzlePieceSVG
                  color={item.color || 'blue'}
                  content={item.content}
                  isLatex={item.isLatex}
                />
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold py-3">
              <Sparkles className="w-5 h-5" />
              <span>All pieces placed!</span>
              <Sparkles className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>

      {/* Drop Slots Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => {
          const matchedItem = getMatchedItem(slot.id);
          const isCorrect = showFeedback && matchedItem && isCorrectMatch(slot.id);
          const isIncorrect = showFeedback && matchedItem && !isCorrectMatch(slot.id);
          const isHovered = hoveredSlot === slot.id && !!draggingItem;

          return (
            <div
              key={slot.id}
              onDragOver={(e) => handleDragOver(e, slot.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot.id)}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[100px]",
                !matchedItem && !isHovered && "border-dashed border-muted-foreground/30 bg-muted/20",
                isHovered && "border-solid border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.03]",
                matchedItem && !showFeedback && "border-solid border-muted-foreground/40 bg-muted/30",
                isCorrect && "border-solid border-green-500 bg-green-50 dark:bg-green-950/30 shadow-green-500/20 shadow-md",
                isIncorrect && "border-solid border-red-500 bg-red-50 dark:bg-red-950/30 shadow-red-500/20 shadow-md"
              )}
            >
              {/* Slot label */}
              {slot.label && (
                <span className="text-xs font-medium text-muted-foreground">{slot.label}</span>
              )}

              {/* Slot image */}
              {slot.image && (
                <img src={slot.image} alt="" className="w-14 h-14 object-contain rounded-lg opacity-60" />
              )}

              {/* Matched piece or empty slot */}
              {matchedItem ? (
                <div
                  className={cn(!showFeedback && "cursor-pointer")}
                  onClick={() => handleRemoveMatch(slot.id)}
                  title={!showFeedback ? "Click to remove" : undefined}
                >
                  <PuzzlePieceSVG
                    color={matchedItem.color || 'blue'}
                    content={matchedItem.content}
                    isLatex={matchedItem.isLatex}
                    size="small"
                  />
                </div>
              ) : (
                <EmptySlotSVG isHovered={isHovered} />
              )}

              {/* Feedback badge */}
              {showFeedback && matchedItem && (
                <div className="absolute -top-2 -right-2">
                  <Badge className={cn(
                    "rounded-full w-7 h-7 flex items-center justify-center p-0 shadow-lg",
                    isCorrect && "bg-green-500 hover:bg-green-500",
                    isIncorrect && "bg-red-500 hover:bg-red-500"
                  )}>
                    {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score */}
      {showFeedback && (
        <div
          className={cn(
            "text-center p-5 rounded-xl",
            correctCount === slots.length
              ? "bg-green-50 dark:bg-green-950/30"
              : "bg-muted/30"
          )}
        >
          <div className="text-2xl font-bold text-foreground mb-1">{correctCount} / {slots.length}</div>
          <div className="text-sm text-muted-foreground">
            {correctCount === slots.length
              ? '🎉 Perfect! All puzzles solved!'
              : 'Check the incorrect matches.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleDragDrop;
