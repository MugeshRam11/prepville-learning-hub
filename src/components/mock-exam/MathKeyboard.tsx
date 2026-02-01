import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Delete, 
  CornerDownLeft, 
  Keyboard, 
  X,
  ChevronUp,
  ChevronDown,
  Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import MatrixBuilder from './MatrixBuilder';

interface MathKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

interface MathButton {
  label: string;
  latex: string;
  display?: string;
  cursorOffset?: number;
}

const MathKeyboard: React.FC<MathKeyboardProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your answer...",
  className
}) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [activeTab, setActiveTab] = useState('basic');
  const [showMatrixBuilder, setShowMatrixBuilder] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Number pad with space
  const numberButtons: MathButton[] = [
    { label: '7', latex: '7' },
    { label: '8', latex: '8' },
    { label: '9', latex: '9' },
    { label: '÷', latex: '\\div ' },
    { label: '4', latex: '4' },
    { label: '5', latex: '5' },
    { label: '6', latex: '6' },
    { label: '×', latex: '\\times ' },
    { label: '1', latex: '1' },
    { label: '2', latex: '2' },
    { label: '3', latex: '3' },
    { label: '−', latex: '-' },
    { label: '0', latex: '0' },
    { label: '.', latex: '.' },
    { label: '=', latex: '=' },
    { label: '+', latex: '+' },
    { label: '⎵', latex: ' ' }, // Space button
  ];

  // Fractions & Powers - Enhanced with proper cursor positioning
  const fractionButtons: MathButton[] = [
    { label: '□/□', latex: '\\frac{}{}', display: '\\frac{a}{b}', cursorOffset: -3 },
    { label: 'x²', latex: '^{2}' },
    { label: 'x³', latex: '^{3}' },
    { label: 'xⁿ', latex: '^{}', display: 'x^{n}', cursorOffset: -1 },
    { label: '½', latex: '\\frac{1}{2}' },
    { label: '⅓', latex: '\\frac{1}{3}' },
    { label: '¼', latex: '\\frac{1}{4}' },
    { label: '⅔', latex: '\\frac{2}{3}' },
    { label: 'x₁', latex: '_{1}' },
    { label: 'x₂', latex: '_{2}' },
    { label: 'xₙ', latex: '_{}', display: 'x_{n}', cursorOffset: -1 },
    { label: 'x^y', latex: '^{}', display: 'x^{y}', cursorOffset: -1 },
    { label: 'a/b', latex: '/', display: '\\frac{a}{b}' }, // Simple inline division
  ];

  // Roots & Radicals - Fixed cursor offsets
  const rootButtons: MathButton[] = [
    { label: '√', latex: '\\sqrt{}', display: '\\sqrt{x}', cursorOffset: -1 },
    { label: '∛', latex: '\\sqrt[3]{}', display: '\\sqrt[3]{x}', cursorOffset: -1 },
    { label: 'ⁿ√', latex: '\\sqrt[]{}', display: '\\sqrt[n]{x}', cursorOffset: -3 },
    { label: '±', latex: '\\pm ' },
    { label: '|x|', latex: '||', display: '|x|', cursorOffset: -1 },
    { label: '∞', latex: '\\infty ' },
    { label: '≈', latex: '\\approx ' },
    { label: '≠', latex: '\\neq ' },
    { label: '≤', latex: '\\leq ' },
    { label: '≥', latex: '\\geq ' },
    { label: '<', latex: '<' },
    { label: '>', latex: '>' },
  ];

  // Greek & Symbols
  const symbolButtons: MathButton[] = [
    { label: 'π', latex: '\\pi ' },
    { label: 'θ', latex: '\\theta ' },
    { label: 'α', latex: '\\alpha ' },
    { label: 'β', latex: '\\beta ' },
    { label: 'Δ', latex: '\\Delta ' },
    { label: '∑', latex: '\\sum ' },
    { label: '∫', latex: '\\int ' },
    { label: '∂', latex: '\\partial ' },
    { label: '→', latex: '\\rightarrow ' },
    { label: '⇒', latex: '\\Rightarrow ' },
    { label: '∈', latex: '\\in ' },
    { label: '∴', latex: '\\therefore ' },
  ];

  // Trigonometry
  const trigButtons: MathButton[] = [
    { label: 'sin', latex: '\\sin(' },
    { label: 'cos', latex: '\\cos(' },
    { label: 'tan', latex: '\\tan(' },
    { label: '(', latex: '(' },
    { label: 'sin⁻¹', latex: '\\sin^{-1}(' },
    { label: 'cos⁻¹', latex: '\\cos^{-1}(' },
    { label: 'tan⁻¹', latex: '\\tan^{-1}(' },
    { label: ')', latex: ')' },
    { label: 'log', latex: '\\log(' },
    { label: 'ln', latex: '\\ln(' },
    { label: 'e', latex: 'e' },
    { label: ',', latex: ',' },
  ];

  // Brackets
  const bracketButtons: MathButton[] = [
    { label: '( )', latex: '(□)', cursorOffset: -1 },
    { label: '[ ]', latex: '[□]', cursorOffset: -1 },
    { label: '{ }', latex: '\\{□\\}', cursorOffset: -2 },
    { label: '⟨ ⟩', latex: '\\langle □ \\rangle', cursorOffset: -8 },
  ];

  // Matrix buttons
  const matrixButtons: MathButton[] = [
    { label: '2×2', latex: '\\begin{pmatrix} □ & □ \\\\ □ & □ \\end{pmatrix}', display: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: '3×3', latex: '\\begin{pmatrix} □ & □ & □ \\\\ □ & □ & □ \\\\ □ & □ & □ \\end{pmatrix}' },
    { label: 'det', latex: '\\det\\begin{vmatrix} □ & □ \\\\ □ & □ \\end{vmatrix}', display: '\\det\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
    { label: '|A|', latex: '\\begin{vmatrix} □ & □ \\\\ □ & □ \\end{vmatrix}' },
  ];

  // Advanced math buttons
  const advancedButtons: MathButton[] = [
    { label: 'lim', latex: '\\lim_{x \\to □}', display: '\\lim_{x \\to a}', cursorOffset: -1 },
    { label: '∫ᵃᵇ', latex: '\\int_{□}^{□}', display: '\\int_{a}^{b}', cursorOffset: -4 },
    { label: 'logₐ', latex: '\\log_{□}(□)', display: '\\log_{a}(x)', cursorOffset: -4 },
    { label: 'Σ', latex: '\\sum_{i=□}^{□}', display: '\\sum_{i=1}^{n}', cursorOffset: -4 },
    { label: '∏', latex: '\\prod_{i=□}^{□}', display: '\\prod_{i=1}^{n}', cursorOffset: -4 },
    { label: 'd/dx', latex: '\\frac{d}{dx}' },
    { label: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}' },
    { label: 'vec', latex: '\\vec{□}', display: '\\vec{v}', cursorOffset: -1 },
  ];

  const insertAtCursor = (latex: string, cursorOffset: number = 0) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    const newValue = before + latex + after;
    onChange(newValue);
    
    const newPosition = cursorPosition + latex.length + cursorOffset;
    setCursorPosition(newPosition);
    
    // Focus input and set cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleDelete = () => {
    if (cursorPosition > 0) {
      const before = value.slice(0, cursorPosition - 1);
      const after = value.slice(cursorPosition);
      onChange(before + after);
      setCursorPosition(cursorPosition - 1);
    }
  };

  const handleClear = () => {
    onChange('');
    setCursorPosition(0);
  };

  // Render LaTeX preview
  useEffect(() => {
    if (previewRef.current && value) {
      try {
        // Replace □ placeholders for preview
        const displayValue = value.replace(/□/g, '\\square');
        katex.render(displayValue, previewRef.current, {
          throwOnError: false,
          displayMode: false,
          errorColor: '#cc0000',
        });
      } catch (e) {
        previewRef.current.textContent = value;
      }
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || e.target.value.length);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    setCursorPosition(input.selectionStart || 0);
  };

  // Handle keyboard events for space and enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit) {
        onSubmit();
      } else {
        // Move to next math input if available
        const inputs = document.querySelectorAll('[data-math-input="true"]');
        const inputsArray = Array.from(inputs);
        const currentIndex = inputsArray.indexOf(e.currentTarget);
        if (currentIndex >= 0 && currentIndex < inputsArray.length - 1) {
          (inputsArray[currentIndex + 1] as HTMLInputElement).focus();
        }
      }
    }
  };

  const renderMathButton = (btn: MathButton, index: number) => {
    let displayContent: React.ReactNode = btn.label;
    
    // Try to render as LaTeX for display
    if (btn.display) {
      try {
        const html = katex.renderToString(btn.display, { throwOnError: false });
        displayContent = <span dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (e) {
        displayContent = btn.label;
      }
    }

    return (
      <motion.button
        key={index}
        onClick={() => insertAtCursor(btn.latex, btn.cursorOffset)}
        className={cn(
          "h-10 rounded-lg font-medium text-sm transition-all",
          "bg-card hover:bg-primary/10 border border-border",
          "hover:border-primary hover:shadow-sm",
          "flex items-center justify-center",
          "active:scale-95"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        {displayContent}
      </motion.button>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Input Field with Preview */}
      <div className="space-y-2">
        {/* Live Preview */}
        {value && (
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

        {/* Input Area */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            data-math-input="true"
            className={cn(
              "w-full px-4 py-3 pr-24 rounded-xl border-2 border-border",
              "bg-card text-foreground font-mono text-sm",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant={isKeyboardOpen ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
            >
              {isKeyboardOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <Keyboard className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Math Keyboard */}
      <AnimatePresence>
        {isKeyboardOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-b from-muted/50 to-muted/30 rounded-xl border border-border p-3 space-y-3">
              {/* Tabs for Categories */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-8 h-9">
                  <TabsTrigger value="basic" className="text-xs px-1">123</TabsTrigger>
                  <TabsTrigger value="fractions" className="text-xs px-1">a/b</TabsTrigger>
                  <TabsTrigger value="roots" className="text-xs px-1">√</TabsTrigger>
                  <TabsTrigger value="symbols" className="text-xs px-1">π θ</TabsTrigger>
                  <TabsTrigger value="trig" className="text-xs px-1">sin</TabsTrigger>
                  <TabsTrigger value="brackets" className="text-xs px-1">( )</TabsTrigger>
                  <TabsTrigger value="matrix" className="text-xs px-1">□□</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs px-1">∫∑</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {numberButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>

                <TabsContent value="fractions" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {fractionButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>

                <TabsContent value="roots" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {rootButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>

                <TabsContent value="symbols" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {symbolButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>

                <TabsContent value="trig" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {trigButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>

                <TabsContent value="brackets" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {bracketButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>

                <TabsContent value="matrix" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {matrixButtons.map((btn, i) => renderMathButton(btn, i))}
                    <motion.button
                      onClick={() => setShowMatrixBuilder(true)}
                      className={cn(
                        "h-10 rounded-lg font-medium text-sm transition-all col-span-2",
                        "bg-primary/10 hover:bg-primary/20 border border-primary/30",
                        "hover:border-primary hover:shadow-sm",
                        "flex items-center justify-center gap-2",
                        "active:scale-95"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Grid3X3 className="w-4 h-4" />
                      Custom n×m
                    </motion.button>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {advancedButtons.map((btn, i) => renderMathButton(btn, i))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  <Delete className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                {onSubmit && (
                  <Button
                    size="sm"
                    onClick={onSubmit}
                    className="flex-1"
                  >
                    <CornerDownLeft className="h-4 w-4 mr-1" />
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix Builder Modal */}
      <MatrixBuilder
        open={showMatrixBuilder}
        onOpenChange={setShowMatrixBuilder}
        onInsert={(latex) => insertAtCursor(latex)}
      />
    </div>
  );
};

export default MathKeyboard;
