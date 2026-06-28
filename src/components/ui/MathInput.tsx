import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cleanMathContent, normalizeMath, stripLatexFormatting } from '@/lib/mathFormat';
import { motion, AnimatePresence } from 'framer-motion';
import 'mathlive';
import '@/types/mathlive.d';
import type { MathfieldElement } from 'mathlive';

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
}

const MathInput: React.FC<MathInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  multiline = false,
  rows = 3,
}) => {
  const [showMathPopup, setShowMathPopup] = useState(false);
  const [mathValue, setMathValue] = useState('');
  const mathFieldRef = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    if (showMathPopup && mathFieldRef.current) {
      mathFieldRef.current.mathVirtualKeyboardPolicy = 'manual';
      mathFieldRef.current.value = '';
      setTimeout(() => {
        mathFieldRef.current?.focus();
        window.mathVirtualKeyboard?.show();
      }, 150);
    }
    if (!showMathPopup) {
      window.mathVirtualKeyboard?.hide();
    }
  }, [showMathPopup]);

  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;
    const onInput = () => setMathValue(mf.value);
    mf.addEventListener('input', onInput);
    return () => mf.removeEventListener('input', onInput);
  }, [showMathPopup]);

  const handleInsert = () => {
    if (!mathValue.trim()) return;
    const unicode = normalizeMath(stripLatexFormatting(mathValue));
    const newValue = value ? `${value} ${unicode}` : unicode;
    onChange(newValue);
    setShowMathPopup(false);
    setMathValue('');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (pasted && /\\[a-zA-Z([]/.test(pasted)) {
      e.preventDefault();
      onChange(normalizeMath(stripLatexFormatting(cleanMathContent(pasted))));
    }
  };

  const mathIcon = (
    <button
      type="button"
      onClick={() => !disabled && setShowMathPopup(true)}
      disabled={disabled}
      className={cn(
        "absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center",
        "text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
        "text-xs font-bold",
        disabled && "opacity-40 pointer-events-none"
      )}
      title="Insert equation"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4l10-10a2.83 2.83 0 0 0-4-4L4 16v4z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 text-[8px] leading-none font-bold text-primary">∑</span>
    </button>
  );

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={cn("pr-9", className)}
          disabled={disabled}
          rows={rows}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={cn("pr-9", className)}
          disabled={disabled}
        />
      )}
      {mathIcon}

      <AnimatePresence>
        {showMathPopup && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMathPopup(false)}
            />
            <motion.div
              className="fixed z-50 left-1/2 -translate-x-1/2 top-[15vh] w-full max-w-md bg-background border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h4 className="text-sm font-semibold">Insert Equation</h4>
                <button
                  onClick={() => setShowMathPopup(false)}
                  className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <math-field
                  ref={mathFieldRef}
                  virtual-keyboard-mode="manual"
                  smart-mode="true"
                  smart-superscript="true"
                  remove-extraneous-parentheses="true"
                  onFocus={() => window.mathVirtualKeyboard?.show()}
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: '52px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                    fontSize: '18px',
                    '--caret-color': 'hsl(var(--primary))',
                    '--selection-background-color': 'hsl(var(--primary) / 0.2)',
                  } as React.CSSProperties}
                />

                {mathValue && (
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Preview (Unicode)</p>
                    <p className="text-sm font-medium">
                      {normalizeMath(stripLatexFormatting(mathValue))}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowMathPopup(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-[2] gap-1"
                    onClick={handleInsert}
                    disabled={!mathValue.trim()}
                  >
                    <Check className="w-4 h-4" />
                    Insert
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MathInput;
