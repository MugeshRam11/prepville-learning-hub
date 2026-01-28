import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExamMode } from '@/contexts/ExamModeContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FocusModeToggleProps {
  className?: string;
}

const FocusModeToggle: React.FC<FocusModeToggleProps> = ({ className }) => {
  const { focusMode, toggleFocusMode, config } = useExamMode();

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + Shift + F or F11
    if (
      (e.key === 'F11') ||
      ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f')
    ) {
      e.preventDefault();
      if (config.focusModeAvailable) {
        toggleFocusMode();
      }
    }
    
    // Escape to exit focus mode
    if (e.key === 'Escape' && focusMode.isActive) {
      toggleFocusMode();
    }
  }, [focusMode.isActive, toggleFocusMode, config.focusModeAvailable]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Apply focus mode styles to body
  useEffect(() => {
    if (focusMode.isActive) {
      document.body.classList.add('focus-mode-active');
    } else {
      document.body.classList.remove('focus-mode-active');
    }
    
    return () => {
      document.body.classList.remove('focus-mode-active');
    };
  }, [focusMode.isActive]);

  // Don't render if focus mode isn't available (Study mode)
  if (!config.focusModeAvailable) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("inline-flex", className)}
          >
            <Button
              variant={focusMode.isActive ? "default" : "outline"}
              size="sm"
              onClick={toggleFocusMode}
              className={cn(
                "gap-2 transition-all",
                focusMode.isActive && "bg-primary text-primary-foreground"
              )}
            >
              {focusMode.isActive ? (
                <>
                  <Minimize className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit Focus</span>
                </>
              ) : (
                <>
                  <Maximize className="w-4 h-4" />
                  <span className="hidden sm:inline">Focus Mode</span>
                </>
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {focusMode.isActive 
              ? 'Exit focus mode (Esc)' 
              : 'Enter focus mode (⌘⇧F or F11)'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FocusModeToggle;
