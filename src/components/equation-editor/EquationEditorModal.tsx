import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Delete, 
  X,
  Grid3X3,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface EquationEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMathML?: string;
  initialLatex?: string;
  onSave: (data: { latex: string; mathml: string; renderedHtml: string }) => void;
}

interface MathButton {
  label: string;
  latex: string;
  display?: string;
  cursorOffset?: number;
}

// Convert LaTeX to MathML (simplified - in production use MathJax or similar)
const latexToMathML = (latex: string): string => {
  // Basic conversion - for production, use a proper LaTeX to MathML converter
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>${latex}</mi></mrow></math>`;
};

const EquationEditorModal: React.FC<EquationEditorModalProps> = ({
  open,
  onOpenChange,
  initialLatex = '',
  onSave
}) => {
  const [latex, setLatex] = useState(initialLatex);
  const [cursorPosition, setCursorPosition] = useState(initialLatex.length);
  const [activeTab, setActiveTab] = useState('basic');
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Reset when modal opens with new initial value
  useEffect(() => {
    if (open) {
      setLatex(initialLatex);
      setCursorPosition(initialLatex.length);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, initialLatex]);

  // Number pad
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
  ];

  // Variables
  const variableButtons: MathButton[] = [
    { label: 'x', latex: 'x' },
    { label: 'y', latex: 'y' },
    { label: 'z', latex: 'z' },
    { label: 'a', latex: 'a' },
    { label: 'b', latex: 'b' },
    { label: 'c', latex: 'c' },
    { label: 'n', latex: 'n' },
    { label: 'm', latex: 'm' },
    { label: 'i', latex: 'i' },
    { label: 'j', latex: 'j' },
    { label: 'k', latex: 'k' },
    { label: 't', latex: 't' },
  ];

  // Operators
  const operatorButtons: MathButton[] = [
    { label: '+', latex: '+' },
    { label: '−', latex: '-' },
    { label: '×', latex: '\\times ' },
    { label: '÷', latex: '\\div ' },
    { label: '=', latex: '=' },
    { label: '<', latex: '<' },
    { label: '>', latex: '>' },
    { label: '≤', latex: '\\leq ' },
    { label: '≥', latex: '\\geq ' },
    { label: '≠', latex: '\\neq ' },
    { label: '≈', latex: '\\approx ' },
    { label: '±', latex: '\\pm ' },
  ];

  // Structures - Fractions, Powers, Roots
  const structureButtons: MathButton[] = [
    { label: '□/□', latex: '\\frac{}{}', display: '\\frac{a}{b}', cursorOffset: -3 },
    { label: 'x²', latex: '^{2}' },
    { label: 'x³', latex: '^{3}' },
    { label: 'xⁿ', latex: '^{}', display: 'x^{n}', cursorOffset: -1 },
    { label: 'x₁', latex: '_{1}' },
    { label: 'x₂', latex: '_{2}' },
    { label: 'xₙ', latex: '_{}', display: 'x_{n}', cursorOffset: -1 },
    { label: '√', latex: '\\sqrt{}', display: '\\sqrt{x}', cursorOffset: -1 },
    { label: '∛', latex: '\\sqrt[3]{}', display: '\\sqrt[3]{x}', cursorOffset: -1 },
    { label: 'ⁿ√', latex: '\\sqrt[]{}', display: '\\sqrt[n]{x}', cursorOffset: -3 },
    { label: '|x|', latex: '|{}|', cursorOffset: -2 },
    { label: '( )', latex: '()', cursorOffset: -1 },
  ];

  // Brackets
  const bracketButtons: MathButton[] = [
    { label: '(', latex: '(' },
    { label: ')', latex: ')' },
    { label: '[', latex: '[' },
    { label: ']', latex: ']' },
    { label: '{', latex: '\\{' },
    { label: '}', latex: '\\}' },
    { label: '⟨', latex: '\\langle ' },
    { label: '⟩', latex: '\\rangle ' },
  ];

  // Matrix
  const matrixButtons: MathButton[] = [
    { label: '2×2', latex: '\\begin{pmatrix} & \\\\ & \\end{pmatrix}', display: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: '3×3', latex: '\\begin{pmatrix} & & \\\\ & & \\\\ & & \\end{pmatrix}' },
    { label: '2×1', latex: '\\begin{pmatrix} \\\\ \\end{pmatrix}', display: '\\begin{pmatrix} a \\\\ b \\end{pmatrix}' },
    { label: '1×2', latex: '\\begin{pmatrix} & \\end{pmatrix}', display: '\\begin{pmatrix} a & b \\end{pmatrix}' },
  ];

  // Greek & Symbols
  const symbolButtons: MathButton[] = [
    { label: 'π', latex: '\\pi ' },
    { label: 'θ', latex: '\\theta ' },
    { label: 'α', latex: '\\alpha ' },
    { label: 'β', latex: '\\beta ' },
    { label: 'γ', latex: '\\gamma ' },
    { label: 'Δ', latex: '\\Delta ' },
    { label: 'σ', latex: '\\sigma ' },
    { label: 'μ', latex: '\\mu ' },
    { label: '∞', latex: '\\infty ' },
    { label: '∑', latex: '\\sum ' },
    { label: '∫', latex: '\\int ' },
    { label: '∂', latex: '\\partial ' },
  ];

  // Trigonometry
  const trigButtons: MathButton[] = [
    { label: 'sin', latex: '\\sin(' },
    { label: 'cos', latex: '\\cos(' },
    { label: 'tan', latex: '\\tan(' },
    { label: 'cot', latex: '\\cot(' },
    { label: 'sin⁻¹', latex: '\\sin^{-1}(' },
    { label: 'cos⁻¹', latex: '\\cos^{-1}(' },
    { label: 'tan⁻¹', latex: '\\tan^{-1}(' },
    { label: 'sec', latex: '\\sec(' },
    { label: 'log', latex: '\\log(' },
    { label: 'ln', latex: '\\ln(' },
    { label: 'logₐ', latex: '\\log_{}{()}', display: '\\log_{a}(x)', cursorOffset: -4 },
    { label: 'e', latex: 'e' },
  ];

  // Advanced
  const advancedButtons: MathButton[] = [
    { label: 'lim', latex: '\\lim_{x \\to }', display: '\\lim_{x \\to a}', cursorOffset: 0 },
    { label: '∫ᵃᵇ', latex: '\\int_{}^{}', display: '\\int_{a}^{b}', cursorOffset: -4 },
    { label: 'Σⁿ', latex: '\\sum_{i=}^{}', display: '\\sum_{i=1}^{n}', cursorOffset: -4 },
    { label: '∏', latex: '\\prod_{i=}^{}', display: '\\prod_{i=1}^{n}', cursorOffset: -4 },
    { label: 'd/dx', latex: '\\frac{d}{dx}' },
    { label: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}' },
    { label: '→', latex: '\\rightarrow ' },
    { label: '⇒', latex: '\\Rightarrow ' },
  ];

  const insertAtCursor = (latexStr: string, cursorOffset: number = 0) => {
    const before = latex.slice(0, cursorPosition);
    const after = latex.slice(cursorPosition);
    const newValue = before + latexStr + after;
    setLatex(newValue);
    
    const newPosition = cursorPosition + latexStr.length + cursorOffset;
    setCursorPosition(newPosition);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleDelete = () => {
    if (cursorPosition > 0) {
      const before = latex.slice(0, cursorPosition - 1);
      const after = latex.slice(cursorPosition);
      setLatex(before + after);
      setCursorPosition(cursorPosition - 1);
    }
  };

  const handleClear = () => {
    setLatex('');
    setCursorPosition(0);
    inputRef.current?.focus();
  };

  // Render LaTeX preview
  useEffect(() => {
    if (previewRef.current) {
      if (latex) {
        try {
          katex.render(latex, previewRef.current, {
            throwOnError: false,
            displayMode: true,
            errorColor: '#cc0000',
          });
        } catch (e) {
          previewRef.current.textContent = latex;
        }
      } else {
        previewRef.current.innerHTML = '<span class="text-muted-foreground">Your equation will appear here...</span>';
      }
    }
  }, [latex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLatex(e.target.value);
    setCursorPosition(e.target.selectionStart || e.target.value.length);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    setCursorPosition(input.selectionStart || 0);
  };

  const handleSave = () => {
    if (!latex.trim()) return;

    // Generate rendered HTML using KaTeX
    let renderedHtml = '';
    try {
      renderedHtml = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      });
    } catch (e) {
      renderedHtml = latex;
    }

    // Generate MathML
    const mathml = latexToMathML(latex);

    onSave({
      latex,
      mathml,
      renderedHtml
    });

    onOpenChange(false);
  };

  const renderMathButton = (btn: MathButton, index: number) => {
    let displayContent: React.ReactNode = btn.label;
    
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
        type="button"
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">📐</span>
            Equation Editor
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Live Preview Area */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-6 min-h-[80px] flex items-center justify-center">
            <div 
              ref={previewRef} 
              className="text-2xl font-medium text-foreground text-center"
            />
          </div>

          {/* LaTeX Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={latex}
              onChange={handleInputChange}
              onClick={handleInputClick}
              placeholder="Type or use keyboard below..."
              className={cn(
                "w-full px-4 py-3 rounded-xl border-2 border-border",
                "bg-card text-foreground font-mono text-sm",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Math Keyboard */}
          <div className="bg-muted/30 rounded-xl border border-border p-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-9 h-9 mb-3">
                <TabsTrigger value="basic" className="text-xs px-1">123</TabsTrigger>
                <TabsTrigger value="vars" className="text-xs px-1">xyz</TabsTrigger>
                <TabsTrigger value="ops" className="text-xs px-1">+ −</TabsTrigger>
                <TabsTrigger value="struct" className="text-xs px-1">□/□</TabsTrigger>
                <TabsTrigger value="brackets" className="text-xs px-1">( )</TabsTrigger>
                <TabsTrigger value="matrix" className="text-xs px-1">▦</TabsTrigger>
                <TabsTrigger value="symbols" className="text-xs px-1">π θ</TabsTrigger>
                <TabsTrigger value="trig" className="text-xs px-1">sin</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs px-1">∫∑</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {numberButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="vars" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {variableButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="ops" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {operatorButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="struct" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {structureButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="brackets" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {bracketButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="matrix" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {matrixButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="symbols" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {symbolButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="trig" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {trigButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-0">
                <div className="grid grid-cols-4 gap-1.5">
                  {advancedButtons.map((btn, i) => renderMathButton(btn, i))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="flex-1"
                type="button"
              >
                <Delete className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex-1"
                type="button"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!latex.trim()}>
            <Check className="h-4 w-4 mr-2" />
            Insert Equation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquationEditorModal;
