import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import MathLiveKeyboard from '@/components/mock-exam/MathLiveKeyboard';
import { normalizeMath } from '@/lib/mathFormat';
import type { ImageFillBlanksConfig, FillZone } from './ImageFillBlanksEditor';

interface ImageFillBlanksPlayerProps {
  config: ImageFillBlanksConfig;
  value: Record<string, { value: string; type: string }>;
  onChange: (value: Record<string, { value: string; type: string }>) => void;
  disabled?: boolean;
}

const ImageFillBlanksPlayer: React.FC<ImageFillBlanksPlayerProps> = ({
  config,
  value = {},
  onChange,
  disabled = false,
}) => {
  const [activeZone, setActiveZone] = useState<FillZone | null>(null);
  const [draftValue, setDraftValue] = useState('');

  // Hide MathLive keyboard when modal closes
  useEffect(() => {
    if (!activeZone) {
      window.mathVirtualKeyboard?.hide();
    }
  }, [activeZone]);

  // Close on Escape
  useEffect(() => {
    if (!activeZone) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveZone(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeZone]);

  const openZone = useCallback((zone: FillZone) => {
    if (disabled) return;
    setActiveZone(zone);
    setDraftValue(value[zone.id]?.value || '');
  }, [disabled, value]);

  const handleConfirm = useCallback(() => {
    if (!activeZone) return;
    onChange({
      ...value,
      [activeZone.id]: {
        value: draftValue,
        type: activeZone.inputMode === 'math' ? 'latex' : 'text',
      },
    });
    setActiveZone(null);
  }, [activeZone, draftValue, value, onChange]);

  if (!config.imageUrl) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Image Fill Blanks not configured</p>
        <p className="text-sm">No image has been set for this question.</p>
      </div>
    );
  }

  if (config.zones.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No input zones configured</p>
      </div>
    );
  }

  const totalMarks = config.zones.reduce((sum, z) => sum + z.marks, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">✏️ Image Fill Blanks</Badge>
        <Badge variant="secondary" className="text-xs">
          {config.zones.length} zone{config.zones.length !== 1 ? 's' : ''} · {totalMarks} marks
        </Badge>
      </div>

      {/* Image with clickable blank zones */}
      <div className="relative border rounded-lg overflow-hidden bg-muted/10">
        <img
          src={config.imageUrl}
          alt="Question diagram"
          className="w-full h-auto max-h-[600px] object-contain mx-auto select-none"
          draggable={false}
        />

        {config.zones.map((zone) => {
          const filled = value[zone.id]?.value;
          const isActive = activeZone?.id === zone.id;

          return (
            <button
              key={zone.id}
              onClick={() => openZone(zone)}
              disabled={disabled}
              className={cn(
                'absolute flex items-center justify-center px-1',
                'rounded border-2 font-medium transition-all focus:outline-none',
                'focus:ring-2 focus:ring-offset-1 focus:ring-primary',
                disabled
                  ? 'cursor-default opacity-70 border-border bg-background/80'
                  : isActive
                    ? 'border-primary bg-primary/15 ring-2 ring-primary shadow-lg cursor-pointer'
                    : filled
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 cursor-pointer hover:border-primary hover:bg-primary/10'
                      : 'border-dashed border-muted-foreground/60 bg-background/75 text-muted-foreground/70 cursor-pointer hover:border-primary hover:bg-primary/10 hover:text-primary'
              )}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                fontSize: 'clamp(10px, 1.2vw, 13px)',
              }}
            >
              {filled ? (
                <>
                  <span className="truncate max-w-full">{normalizeMath(filled)}</span>
                  {!disabled && (
                    <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-green-500 bg-background rounded-full shrink-0" />
                  )}
                </>
              ) : (
                <span className="text-[10px] opacity-50 select-none">tap</span>
              )}
            </button>
          );
        })}
      </div>

      {!disabled && (
        <p className="text-xs text-muted-foreground text-center">
          Tap any blank on the diagram to enter your answer
        </p>
      )}

      {/* Answer input modal */}
      <AnimatePresence>
        {activeZone && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveZone(null)}
            />

            {/* Centered dialog */}
            <motion.div
              className={cn(
                'fixed z-50 left-1/2 -translate-x-1/2',
                'w-full max-w-lg mx-auto',
                'bg-background border rounded-2xl shadow-2xl',
                // Sit near the top so the MathLive keyboard (bottom) has room
                'top-[12vh]'
              )}
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Fill in the blank
                    {activeZone.placeholder && (
                      <span className="text-muted-foreground font-normal">
                        {' '}— {activeZone.placeholder}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Type your answer below · toggle{' '}
                    <span className="font-medium text-primary">⌨</span>{' '}
                    for the equation keyboard
                  </p>
                </div>
                <button
                  onClick={() => setActiveZone(null)}
                  className="ml-3 rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MathLive input + keyboard toggle */}
              <div className="px-5 py-4">
                <MathLiveKeyboard
                  value={draftValue}
                  onChange={setDraftValue}
                  onSubmit={handleConfirm}
                  placeholder={activeZone.placeholder || 'Type or use the keyboard…'}
                  showKeyboard={true}
                  hideSubmit
                />
              </div>

              {/* Action row */}
              <div className="flex gap-2 px-5 pb-5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDraftValue('')}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-[2]"
                  onClick={handleConfirm}
                  disabled={!draftValue.trim()}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Confirm answer
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageFillBlanksPlayer;
