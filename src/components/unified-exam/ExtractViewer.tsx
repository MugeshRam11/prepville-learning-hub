import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Pin, 
  PinOff,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Extract {
  id: string;
  title: string;
  type: 'text' | 'image' | 'diagram';
  content?: string;
  imageUrl?: string;
}

interface ExtractViewerProps {
  extract: Extract | null;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

const ExtractViewer: React.FC<ExtractViewerProps> = ({
  extract,
  onClose,
  isPinned = false,
  onTogglePin,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  if (!extract) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "bg-card border rounded-xl shadow-lg overflow-hidden",
          isExpanded ? "fixed inset-4 z-50" : "relative",
          isPinned && "border-primary/50",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{extract.title}</span>
            {isPinned && (
              <span className="text-xs text-muted-foreground">(Pinned)</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Zoom controls for images */}
            {(extract.type === 'image' || extract.type === 'diagram') && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-mono"
                  onClick={handleResetZoom}
                >
                  {Math.round(zoom * 100)}%
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {/* Pin toggle */}
            {onTogglePin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onTogglePin}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {/* Expand toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            
            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className={cn(
          "overflow-auto",
          isExpanded ? "h-[calc(100%-48px)]" : "max-h-[400px]"
        )}>
          <div className="p-4">
            {extract.type === 'text' && extract.content && (
              <div className="prose prose-sm max-w-none">
                {extract.content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {(extract.type === 'image' || extract.type === 'diagram') && extract.imageUrl && (
              <div 
                className="flex items-center justify-center overflow-auto cursor-move"
                style={{ 
                  minHeight: isExpanded ? '100%' : '200px',
                }}
              >
                <motion.img
                  src={extract.imageUrl}
                  alt={extract.title}
                  className="max-w-none"
                  style={{ transform: `scale(${zoom})` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  draggable={false}
                />
              </div>
            )}

            {extract.type === 'diagram' && !extract.imageUrl && extract.content && (
              <div className="bg-muted/50 p-4 rounded-lg border text-center">
                <p className="text-sm text-muted-foreground italic">
                  📊 {extract.content}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Expanded overlay backdrop */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ExtractViewer;
