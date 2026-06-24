import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Keyboard, ChevronDown, X } from 'lucide-react';
import type { MathfieldElement } from 'mathlive';
import 'mathlive';
import '@/types/mathlive.d';

interface MathLiveKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  showKeyboard?: boolean;
  hideSubmit?: boolean;
}

const MathLiveKeyboard: React.FC<MathLiveKeyboardProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your math expression...",
  className,
  showKeyboard = true,
  hideSubmit = false,
}) => {
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    // Set initial value
    if (value && mf.value !== value) {
      mf.value = value;
    }

    // Configure the math field
    mf.mathVirtualKeyboardPolicy = 'manual';
    
    // Handle input changes
    const handleInput = () => {
      const latex = mf.value;
      onChange(latex);
    };

    // Handle keyboard submission
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeydown);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeydown);
    };
  }, [onChange, onSubmit, value]);

  // Sync external value changes
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (mf && value !== mf.value) {
      mf.value = value;
    }
  }, [value]);

  const toggleKeyboard = () => {
    const mathVirtualKeyboard = window.mathVirtualKeyboard;
    if (mathVirtualKeyboard) {
      if (isKeyboardVisible) {
        mathVirtualKeyboard.hide();
      } else {
        mathVirtualKeyboard.show();
      }
      setIsKeyboardVisible(!isKeyboardVisible);
    }
  };

  const handleClear = () => {
    onChange('');
    if (mathFieldRef.current) {
      mathFieldRef.current.value = '';
      mathFieldRef.current.focus();
    }
  };

  const handleFocus = () => {
    // Do not auto-open keyboard on focus — user controls it via the toggle button.
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Math Field Container */}
      <div className="relative">
        <div className="relative flex items-center">
          <math-field
            ref={mathFieldRef}
            virtual-keyboard-mode="manual"
            smart-mode="true"
            smart-superscript="true"
            remove-extraneous-parentheses="true"
            placeholder={placeholder}
            onFocus={handleFocus}
            className={cn(
              "w-full",
              "focus:outline-none",
              "transition-all duration-200",
              "[&::part(content)]:text-base",
              "[&::part(placeholder)]:text-muted-foreground",
              "[&::part(virtual-keyboard-toggle)]:hidden"
            )}
            style={{
              display: 'block',
              width: '100%',
              minHeight: '52px',
              padding: '12px 52px 12px 16px',
              borderRadius: '12px',
              border: '2px solid hsl(var(--border, 214.3 31.8% 91.4%))',
              backgroundColor: 'hsl(var(--card, 0 0% 100%))',
              color: 'hsl(var(--foreground, 222.2 84% 4.9%))',
              fontSize: '18px',
              boxSizing: 'border-box',
              '--caret-color': 'hsl(var(--primary))',
              '--selection-background-color': 'hsl(var(--primary) / 0.2)',
            } as React.CSSProperties}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {showKeyboard && (
              <Button
                variant={isKeyboardVisible ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={toggleKeyboard}
                type="button"
              >
                {isKeyboardVisible ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <Keyboard className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button (if callback provided and not hidden by parent) */}
      {!hideSubmit && (
        <AnimatePresence>
          {onSubmit && value && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                onClick={onSubmit}
                className="w-full"
                type="button"
              >
                Submit Answer
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default MathLiveKeyboard;
