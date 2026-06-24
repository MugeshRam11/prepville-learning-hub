import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Maximize, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExamLockdownProps {
  enabled: boolean;
  onViolation?: (type: string, count: number) => void;
  maxViolations?: number;
  onMaxViolations?: () => void;
  children: React.ReactNode;
}

const ExamLockdown: React.FC<ExamLockdownProps> = ({
  enabled,
  onViolation,
  maxViolations = 3,
  onMaxViolations,
  children,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState('');
  const [violations, setViolations] = useState(0);
  const [showEntryScreen, setShowEntryScreen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowEntryScreen(false);
    } catch {
      toast.error('Fullscreen is required to take this exam');
    }
  }, []);

  const triggerWarning = useCallback((type: string) => {
    setViolations(prev => {
      const next = prev + 1;
      onViolation?.(type, next);
      if (next >= maxViolations) {
        onMaxViolations?.();
      }
      return next;
    });
    setWarningType(type);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
  }, [maxViolations, onViolation, onMaxViolations]);

  useEffect(() => {
    if (!enabled) return;

    const onFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && !showEntryScreen) {
        triggerWarning('Exited fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [enabled, showEntryScreen, triggerWarning]);

  // Block tab switching / window blur
  useEffect(() => {
    if (!enabled || showEntryScreen) return;

    const onBlur = () => {
      triggerWarning('Switched tab or window');
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning('Tab hidden');
      }
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, showEntryScreen, triggerWarning]);

  // Block right-click, copy, cut, print
  useEffect(() => {
    if (!enabled) return;

    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'p', 'a', 's', 'u'].includes(e.key.toLowerCase())
      ) {
        // Allow paste (v) inside input/textarea for typing answers
        if (e.key.toLowerCase() === 'v') {
          const el = document.activeElement;
          if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || (el as HTMLElement)?.isContentEditable) {
            return;
          }
        }
        e.preventDefault();
      }
      // Block F12, Ctrl+Shift+I (dev tools)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
      // Block Alt+Tab warning (can't truly block but we detect blur)
      // Block Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerWarning('Screenshot attempt');
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, triggerWarning]);

  // Block back/forward navigation
  useEffect(() => {
    if (!enabled || showEntryScreen) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled, showEntryScreen]);

  if (!enabled) return <>{children}</>;

  // Entry screen — user must click to enter fullscreen
  if (showEntryScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Secure Exam Mode</h2>
            <p className="text-primary-foreground/80 mt-1 text-sm">
              This exam requires fullscreen lockdown
            </p>
          </div>

          {/* Rules */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Maximize className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Fullscreen Required</p>
                  <p className="text-xs text-muted-foreground">
                    The exam will run in fullscreen. Exiting counts as a violation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tab Switching Monitored</p>
                  <p className="text-xs text-muted-foreground">
                    Switching tabs or windows will be recorded as a violation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Max {maxViolations} Violations</p>
                  <p className="text-xs text-muted-foreground">
                    After {maxViolations} violations your exam may be auto-submitted.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Copy, paste, right-click, and developer tools are disabled during the exam.
              </p>
            </div>

            <Button onClick={enterFullscreen} className="w-full h-12 text-base gap-2">
              <Maximize className="w-5 h-5" />
              Enter Fullscreen & Start Exam
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Violation warning overlay */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-md w-full mx-4"
          >
            <div className="bg-red-600 text-white rounded-xl shadow-2xl px-5 py-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{warningType}</p>
                <p className="text-xs text-red-100">
                  Violation {violations}/{maxViolations} — return to the exam immediately
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-enter fullscreen prompt */}
      <AnimatePresence>
        {!isFullscreen && !showEntryScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm text-center space-y-4"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold">Fullscreen Exited</h3>
              <p className="text-sm text-muted-foreground">
                Violation {violations}/{maxViolations} recorded. Please re-enter fullscreen to continue your exam.
              </p>
              <Button onClick={enterFullscreen} className="w-full gap-2">
                <Maximize className="w-4 h-4" />
                Re-enter Fullscreen
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Violation badge — persistent indicator */}
      {violations > 0 && (
        <div className="fixed top-3 right-3 z-[100]">
          <div className="bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded-full px-3 py-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">
              {violations}/{maxViolations}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default ExamLockdown;
