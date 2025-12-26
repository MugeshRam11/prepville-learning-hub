import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropZone {
  id: string;
  x: number; // percentage from left
  y: number; // percentage from top
  correctLabel: string;
}

interface DraggableLabel {
  id: string;
  content: string;
}

interface ImageDropZoneProps {
  imageUrl?: string;
  dropZones: DropZone[];
  draggableLabels: DraggableLabel[];
  onPlacementsChange?: (placements: Record<string, string>) => void;
  showFeedback?: boolean;
}

const ImageDropZone: React.FC<ImageDropZoneProps> = ({
  imageUrl,
  dropZones,
  draggableLabels,
  onPlacementsChange,
  showFeedback = false
}) => {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const handleDragStart = (labelId: string) => {
    setDraggingLabel(labelId);
  };

  const handleDragEnd = () => {
    setDraggingLabel(null);
    setHoveredZone(null);
  };

  const handleDrop = (zoneId: string) => {
    if (draggingLabel) {
      const newPlacements = { ...placements };
      
      // Remove label from old zone if exists
      Object.keys(newPlacements).forEach(key => {
        if (newPlacements[key] === draggingLabel) {
          delete newPlacements[key];
        }
      });

      newPlacements[zoneId] = draggingLabel;
      setPlacements(newPlacements);
      onPlacementsChange?.(newPlacements);
    }
    setDraggingLabel(null);
    setHoveredZone(null);
  };

  const handleRemovePlacement = (zoneId: string) => {
    const newPlacements = { ...placements };
    delete newPlacements[zoneId];
    setPlacements(newPlacements);
    onPlacementsChange?.(newPlacements);
  };

  const handleReset = () => {
    setPlacements({});
    onPlacementsChange?.({});
  };

  const getUnplacedLabels = () => {
    const placedLabelIds = Object.values(placements);
    return draggableLabels.filter(label => !placedLabelIds.includes(label.id));
  };

  const getPlacedLabel = (zoneId: string) => {
    const labelId = placements[zoneId];
    return draggableLabels.find(label => label.id === labelId);
  };

  const isCorrectPlacement = (zoneId: string) => {
    const zone = dropZones.find(z => z.id === zoneId);
    const label = getPlacedLabel(zoneId);
    return zone && label && label.content === zone.correctLabel;
  };

  const unplacedLabels = getUnplacedLabels();
  const allPlaced = unplacedLabels.length === 0;
  const correctCount = dropZones.filter(z => isCorrectPlacement(z.id)).length;

  return (
    <div className="space-y-4">
      {/* Draggable Labels Pool */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              Drag angle labels to the triangle:
            </h4>
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
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {unplacedLabels.map((label) => (
                <motion.div
                  key={label.id}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  draggable
                  onDragStart={() => handleDragStart(label.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "px-4 py-2 rounded-full cursor-grab active:cursor-grabbing",
                    "bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg",
                    "hover:shadow-xl transition-shadow",
                    "select-none text-lg",
                    draggingLabel === label.id && "opacity-50"
                  )}
                >
                  {label.content}
                </motion.div>
              ))}
            </AnimatePresence>
            {allPlaced && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-600 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                All angles placed!
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Image with Drop Zones */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            className="relative aspect-square max-h-[400px] mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
          >
            {/* Triangle SVG */}
            <svg 
              viewBox="0 0 100 100" 
              className="absolute inset-0 w-full h-full p-8"
              style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
            >
              {/* Triangle shape */}
              <polygon 
                points="50,10 15,85 85,85" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className="text-primary"
              />
              
              {/* Vertex labels */}
              <text x="50" y="6" textAnchor="middle" className="text-xs fill-muted-foreground font-medium">A</text>
              <text x="10" y="90" textAnchor="middle" className="text-xs fill-muted-foreground font-medium">B</text>
              <text x="90" y="90" textAnchor="middle" className="text-xs fill-muted-foreground font-medium">C</text>
            </svg>

            {/* Drop Zones */}
            {dropZones.map((zone) => {
              const placedLabel = getPlacedLabel(zone.id);
              const isCorrect = showFeedback && placedLabel && isCorrectPlacement(zone.id);
              const isIncorrect = showFeedback && placedLabel && !isCorrectPlacement(zone.id);

              return (
                <motion.div
                  key={zone.id}
                  className={cn(
                    "absolute w-16 h-16 rounded-full -translate-x-1/2 -translate-y-1/2",
                    "flex items-center justify-center transition-all",
                    !placedLabel && "border-2 border-dashed border-primary/50 bg-primary/10",
                    hoveredZone === zone.id && !placedLabel && "border-primary bg-primary/20 scale-110",
                    placedLabel && !showFeedback && "bg-gradient-to-r from-amber-400 to-orange-500",
                    isCorrect && "bg-green-500 ring-4 ring-green-300",
                    isIncorrect && "bg-red-500 ring-4 ring-red-300 animate-shake"
                  )}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoveredZone(zone.id);
                  }}
                  onDragLeave={() => setHoveredZone(null)}
                  onDrop={() => handleDrop(zone.id)}
                  onClick={() => placedLabel && !showFeedback && handleRemovePlacement(zone.id)}
                  whileHover={{ scale: placedLabel && !showFeedback ? 1.1 : 1 }}
                  animate={{
                    scale: hoveredZone === zone.id ? 1.1 : 1
                  }}
                >
                  {placedLabel ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-white font-bold text-lg cursor-pointer"
                      title={showFeedback ? undefined : "Click to remove"}
                    >
                      {placedLabel.content}
                      {showFeedback && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          {isCorrect ? (
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-green-500" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-red-500" />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.span
                      animate={{ 
                        opacity: hoveredZone === zone.id ? 1 : 0.5 
                      }}
                      className="text-xs text-primary font-medium"
                    >
                      Drop
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Score Display */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-center p-4 rounded-xl",
            correctCount === dropZones.length 
              ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30"
              : "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30"
          )}
        >
          <div className="text-lg font-bold text-foreground">
            Score: {correctCount} / {dropZones.length} correct
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {correctCount === dropZones.length 
              ? '🎉 All angles placed correctly!' 
              : 'Some angles are misplaced. The largest angle goes opposite the longest side.'}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Marks: {((correctCount / dropZones.length) * 4).toFixed(1)} / 4
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ImageDropZone;
