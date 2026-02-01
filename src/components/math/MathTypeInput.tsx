import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import MathTypeEditor from './MathTypeEditor';
import CustomMathKeyboard from './CustomMathKeyboard';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface MathTypeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  wordLimit?: number;
  showPreview?: boolean;
  className?: string;
}

/**
 * MathTypeInput - Complete math input solution
 * 
 * Uses MathType (WIRIS) as the rendering engine with a custom keyboard UI.
 * 
 * Architecture:
 * 1. Custom keyboard outputs MathML
 * 2. MathML is inserted into CKEditor via MathType plugin
 * 3. MathType handles rendering, validation, and storage
 */
const MathTypeInput: React.FC<MathTypeInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter your answer...',
  disabled = false,
  wordLimit,
  showPreview = true,
  className
}) => {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [editorMode, setEditorMode] = useState<'text' | 'math'>('text');
  const editorRef = useRef<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Word count for text mode
  const getWordCount = (text: string): number => {
    if (!text) return 0;
    // Strip HTML tags for word count
    const plainText = text.replace(/<[^>]*>/g, ' ');
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Handle MathML insertion from custom keyboard
  const handleMathMLInsert = useCallback((mathml: string) => {
    // If in text mode, switch to math mode
    if (editorMode === 'text') {
      setEditorMode('math');
    }
    
    // Insert into MathType editor
    if ((window as any).__mathTypeInsert) {
      (window as any).__mathTypeInsert(mathml);
    } else {
      // Fallback: append to value
      onChange(value + mathml);
    }
  }, [editorMode, onChange, value]);

  // Render LaTeX preview
  useEffect(() => {
    if (previewRef.current && value && showPreview) {
      try {
        // Extract LaTeX from MathML or use directly
        let latexValue = value;
        
        // If value contains MathML, try to extract text content
        if (value.includes('<math')) {
          // Simple extraction - in production, use proper MathML to LaTeX converter
          latexValue = value.replace(/<[^>]*>/g, '');
        }
        
        katex.render(latexValue, previewRef.current, {
          throwOnError: false,
          displayMode: false,
          errorColor: '#cc0000',
        });
      } catch (e) {
        if (previewRef.current) {
          previewRef.current.textContent = value.replace(/<[^>]*>/g, '');
        }
      }
    }
  }, [value, showPreview]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showKeyboard ? "default" : "outline"}
            size="sm"
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Math Keyboard
            {showKeyboard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setEditorMode('text')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                editorMode === 'text' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('math')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                editorMode === 'math' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              Equation
            </button>
          </div>
        </div>

        {wordLimit && editorMode === 'text' && (
          <Badge variant={getWordCount(value) > wordLimit ? 'destructive' : 'secondary'}>
            {getWordCount(value)} / {wordLimit} words
          </Badge>
        )}
      </div>

      {/* Live Preview */}
      {showPreview && value && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          <div 
            ref={previewRef} 
            className="text-lg font-medium text-foreground min-h-[28px]"
          />
        </motion.div>
      )}

      {/* Custom Math Keyboard */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CustomMathKeyboard
              onInsert={handleMathMLInsert}
              onClose={() => setShowKeyboard(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Area */}
      {editorMode === 'math' ? (
        <MathTypeEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          hideToolbar={true}
          onMathMLInsert={handleMathMLInsert}
        />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[150px] font-mono text-base resize-y"
        />
      )}
    </div>
  );
};

export default MathTypeInput;
