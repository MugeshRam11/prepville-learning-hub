import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, GripVertical, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropZone {
  id: string;
  x: number;      // percentage from left
  y: number;      // percentage from top
  width?: number;  // percentage width (optional, defaults to point-style circle)
  height?: number; // percentage height
  label?: string;
  correctLabel: string;
}

interface DraggableLabel {
  id: string;
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
}

interface ImageDropZoneProps {
  imageUrl?: string;
  dropZones: DropZone[];
  draggableLabels: DraggableLabel[];
  onPlacementsChange?: (placements: Record<string, string>) => void;
  showFeedback?: boolean;
}

// Helper: render element content as JSX (not just string)
const renderElementContent = (label: DraggableLabel, size: 'sm' | 'md' = 'md') => {
  const imgSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  
  // Priority 1: image element with imageUrl
  if (label.imageUrl) {
    return (
      <div className="flex items-center gap-1">
        <img src={label.imageUrl} alt={label.content || 'element'} className={`${imgSize} object-contain rounded`} />
        {label.content ? <span>{label.content}</span> : null}
      </div>
    );
  }
  
  // Priority 2: text content
  if (label.content && label.content.trim()) {
    return <span>{label.content}</span>;
  }
  
  // Fallback
  return <span className="italic opacity-70">Missing label</span>;
};

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

  // Determine if zones use rectangular (width/height) or point-style (circle) layout
  const hasRectZones = dropZones.some(z => z.width && z.height);

  return (
    <div className="space-y-4">
      {/* Draggable Labels Pool */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              Drag labels to the correct positions:
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
                    "bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg text-white font-bold",
                    "hover:shadow-xl transition-shadow",
                    "select-none text-base",
                    draggingLabel === label.id && "opacity-50"
                  )}
                >
                  {renderElementContent(label)}
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
                All labels placed!
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Image with Drop Zones */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            {/* Render the actual uploaded image */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Question diagram"
                className="w-full h-auto max-h-[500px] object-contain mx-auto"
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">No image available</p>
                <p className="text-sm">Image not configured for this question</p>
              </div>
            )}

            {/* Drop Zones overlaid on the image */}
            {imageUrl && dropZones.map((zone) => {
              const placedLabel = getPlacedLabel(zone.id);
              const isCorrect = showFeedback && placedLabel && isCorrectPlacement(zone.id);
              const isIncorrect = showFeedback && placedLabel && !isCorrectPlacement(zone.id);

              // Rectangular zones (admin-defined width/height)
              if (zone.width && zone.height) {
                return (
                  <motion.div
                    key={zone.id}
                    className={cn(
                      "absolute flex items-center justify-center transition-all",
                      !placedLabel && "border-2 border-dashed border-primary/60 bg-primary/10 rounded-md",
                      hoveredZone === zone.id && !placedLabel && "border-primary bg-primary/25 scale-105",
                      placedLabel && !showFeedback && "bg-gradient-to-r from-amber-400/90 to-orange-500/90 rounded-md",
                      isCorrect && "bg-green-500/90 ring-2 ring-green-300 rounded-md",
                      isIncorrect && "bg-red-500/90 ring-2 ring-red-300 rounded-md"
                    )}
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.width}%`,
                      height: `${zone.height}%`
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoveredZone(zone.id);
                    }}
                    onDragLeave={() => setHoveredZone(null)}
                    onDrop={() => handleDrop(zone.id)}
                    onClick={() => placedLabel && !showFeedback && handleRemovePlacement(zone.id)}
                    whileHover={{ scale: placedLabel && !showFeedback ? 1.03 : 1 }}
                  >
                    {placedLabel ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="cursor-pointer relative flex items-center justify-center gap-1 px-2 py-0.5 w-full h-full"
                      >
                        {placedLabel.type === 'image' && placedLabel.imageUrl && (
                          <img src={placedLabel.imageUrl} alt="" className="w-6 h-6 object-contain rounded" />
                        )}
                        <span className="text-white font-bold text-sm leading-tight text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                          {getElementDisplayContent(placedLabel)}
                        </span>
                        {showFeedback && (
                          <div className="absolute -top-1 -right-3">
                            {isCorrect ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <span className="text-xs text-primary/70 font-medium">
                        {zone.label || 'Drop'}
                      </span>
                    )}
                  </motion.div>
                );
              }

              // Point-style circular zones (legacy)
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
                    isIncorrect && "bg-red-500 ring-4 ring-red-300"
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
                >
                  {placedLabel ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-white font-bold text-base cursor-pointer flex items-center justify-center gap-1"
                    >
                      {placedLabel.type === 'image' && placedLabel.imageUrl && (
                        <img src={placedLabel.imageUrl} alt="" className="w-6 h-6 object-contain rounded" />
                      )}
                      <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                        {getElementDisplayContent(placedLabel)}
                      </span>
                    </motion.div>
                  ) : (
                    <span className="text-xs text-primary font-medium">
                      {zone.label || 'Drop'}
                    </span>
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
        </motion.div>
      )}
    </div>
  );
};

export default ImageDropZone;