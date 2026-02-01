import React, { useState } from 'react';
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

interface MathSymbol {
  label: string;
  mathml: string;
  latex?: string; // For preview
  display?: string;
}

interface CustomMathKeyboardProps {
  onInsert: (mathml: string) => void;
  onClose?: () => void;
  className?: string;
}

// Generate MathML for common math expressions
const generateMathML = {
  number: (n: string) => `<mn>${n}</mn>`,
  variable: (v: string) => `<mi>${v}</mi>`,
  operator: (op: string) => `<mo>${op}</mo>`,
  fraction: (num: string, den: string) => 
    `<mfrac><mrow>${num}</mrow><mrow>${den}</mrow></mfrac>`,
  sqrt: (content: string) => `<msqrt><mrow>${content}</mrow></msqrt>`,
  nthRoot: (n: string, content: string) => 
    `<mroot><mrow>${content}</mrow><mrow>${n}</mrow></mroot>`,
  superscript: (base: string, exp: string) => 
    `<msup><mrow>${base}</mrow><mrow>${exp}</mrow></msup>`,
  subscript: (base: string, sub: string) => 
    `<msub><mrow>${base}</mrow><mrow>${sub}</mrow></msub>`,
  wrap: (content: string) => `<math xmlns="http://www.w3.org/1998/Math/MathML">${content}</math>`
};

// Math symbols organized by category
const MATH_SYMBOLS: Record<string, MathSymbol[]> = {
  basic: [
    { label: '7', mathml: '<mn>7</mn>', latex: '7' },
    { label: '8', mathml: '<mn>8</mn>', latex: '8' },
    { label: '9', mathml: '<mn>9</mn>', latex: '9' },
    { label: '÷', mathml: '<mo>÷</mo>', latex: '\\div' },
    { label: '4', mathml: '<mn>4</mn>', latex: '4' },
    { label: '5', mathml: '<mn>5</mn>', latex: '5' },
    { label: '6', mathml: '<mn>6</mn>', latex: '6' },
    { label: '×', mathml: '<mo>×</mo>', latex: '\\times' },
    { label: '1', mathml: '<mn>1</mn>', latex: '1' },
    { label: '2', mathml: '<mn>2</mn>', latex: '2' },
    { label: '3', mathml: '<mn>3</mn>', latex: '3' },
    { label: '−', mathml: '<mo>−</mo>', latex: '-' },
    { label: '0', mathml: '<mn>0</mn>', latex: '0' },
    { label: '.', mathml: '<mn>.</mn>', latex: '.' },
    { label: '=', mathml: '<mo>=</mo>', latex: '=' },
    { label: '+', mathml: '<mo>+</mo>', latex: '+' },
  ],
  fractions: [
    { 
      label: '□/□', 
      mathml: '<mfrac><mrow><mspace width="1em"/></mrow><mrow><mspace width="1em"/></mrow></mfrac>',
      latex: '\\frac{a}{b}',
      display: '\\frac{a}{b}'
    },
    { 
      label: 'x²', 
      mathml: '<msup><mi>x</mi><mn>2</mn></msup>',
      latex: 'x^2',
      display: 'x^2'
    },
    { 
      label: 'x³', 
      mathml: '<msup><mi>x</mi><mn>3</mn></msup>',
      latex: 'x^3',
      display: 'x^3'
    },
    { 
      label: 'xⁿ', 
      mathml: '<msup><mi>x</mi><mi>n</mi></msup>',
      latex: 'x^n',
      display: 'x^n'
    },
    { 
      label: '½', 
      mathml: '<mfrac><mn>1</mn><mn>2</mn></mfrac>',
      latex: '\\frac{1}{2}',
      display: '\\frac{1}{2}'
    },
    { 
      label: '⅓', 
      mathml: '<mfrac><mn>1</mn><mn>3</mn></mfrac>',
      latex: '\\frac{1}{3}',
      display: '\\frac{1}{3}'
    },
    { 
      label: 'x₁', 
      mathml: '<msub><mi>x</mi><mn>1</mn></msub>',
      latex: 'x_1',
      display: 'x_1'
    },
    { 
      label: 'x₂', 
      mathml: '<msub><mi>x</mi><mn>2</mn></msub>',
      latex: 'x_2',
      display: 'x_2'
    },
  ],
  roots: [
    { 
      label: '√', 
      mathml: '<msqrt><mrow><mspace width="1em"/></mrow></msqrt>',
      latex: '\\sqrt{x}',
      display: '\\sqrt{x}'
    },
    { 
      label: '∛', 
      mathml: '<mroot><mrow><mspace width="1em"/></mrow><mn>3</mn></mroot>',
      latex: '\\sqrt[3]{x}',
      display: '\\sqrt[3]{x}'
    },
    { 
      label: 'ⁿ√', 
      mathml: '<mroot><mrow><mspace width="1em"/></mrow><mi>n</mi></mroot>',
      latex: '\\sqrt[n]{x}',
      display: '\\sqrt[n]{x}'
    },
    { label: '±', mathml: '<mo>±</mo>', latex: '\\pm' },
    { label: '|x|', mathml: '<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>', latex: '|x|' },
    { label: '∞', mathml: '<mo>∞</mo>', latex: '\\infty' },
    { label: '≈', mathml: '<mo>≈</mo>', latex: '\\approx' },
    { label: '≠', mathml: '<mo>≠</mo>', latex: '\\neq' },
    { label: '≤', mathml: '<mo>≤</mo>', latex: '\\leq' },
    { label: '≥', mathml: '<mo>≥</mo>', latex: '\\geq' },
    { label: '<', mathml: '<mo>&lt;</mo>', latex: '<' },
    { label: '>', mathml: '<mo>&gt;</mo>', latex: '>' },
  ],
  symbols: [
    { label: 'π', mathml: '<mi>π</mi>', latex: '\\pi' },
    { label: 'θ', mathml: '<mi>θ</mi>', latex: '\\theta' },
    { label: 'α', mathml: '<mi>α</mi>', latex: '\\alpha' },
    { label: 'β', mathml: '<mi>β</mi>', latex: '\\beta' },
    { label: 'Δ', mathml: '<mi>Δ</mi>', latex: '\\Delta' },
    { label: '∑', mathml: '<mo>∑</mo>', latex: '\\sum' },
    { label: '∫', mathml: '<mo>∫</mo>', latex: '\\int' },
    { label: '∂', mathml: '<mo>∂</mo>', latex: '\\partial' },
    { label: '→', mathml: '<mo>→</mo>', latex: '\\rightarrow' },
    { label: '⇒', mathml: '<mo>⇒</mo>', latex: '\\Rightarrow' },
    { label: '∈', mathml: '<mo>∈</mo>', latex: '\\in' },
    { label: '∴', mathml: '<mo>∴</mo>', latex: '\\therefore' },
  ],
  trig: [
    { label: 'sin', mathml: '<mi>sin</mi><mo>(</mo>', latex: '\\sin(' },
    { label: 'cos', mathml: '<mi>cos</mi><mo>(</mo>', latex: '\\cos(' },
    { label: 'tan', mathml: '<mi>tan</mi><mo>(</mo>', latex: '\\tan(' },
    { label: '(', mathml: '<mo>(</mo>', latex: '(' },
    { label: 'sin⁻¹', mathml: '<msup><mi>sin</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo>', latex: '\\sin^{-1}(' },
    { label: 'cos⁻¹', mathml: '<msup><mi>cos</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo>', latex: '\\cos^{-1}(' },
    { label: 'tan⁻¹', mathml: '<msup><mi>tan</mi><mrow><mo>-</mo><mn>1</mn></mrow></msup><mo>(</mo>', latex: '\\tan^{-1}(' },
    { label: ')', mathml: '<mo>)</mo>', latex: ')' },
    { label: 'log', mathml: '<mi>log</mi><mo>(</mo>', latex: '\\log(' },
    { label: 'ln', mathml: '<mi>ln</mi><mo>(</mo>', latex: '\\ln(' },
    { label: 'e', mathml: '<mi>e</mi>', latex: 'e' },
    { label: ',', mathml: '<mo>,</mo>', latex: ',' },
  ],
  advanced: [
    { 
      label: 'lim', 
      mathml: '<munder><mi>lim</mi><mrow><mi>x</mi><mo>→</mo><mi>a</mi></mrow></munder>',
      latex: '\\lim_{x \\to a}',
      display: '\\lim_{x \\to a}'
    },
    { 
      label: '∫ᵃᵇ', 
      mathml: '<msubsup><mo>∫</mo><mi>a</mi><mi>b</mi></msubsup>',
      latex: '\\int_{a}^{b}',
      display: '\\int_{a}^{b}'
    },
    { 
      label: '∑', 
      mathml: '<munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover>',
      latex: '\\sum_{i=1}^{n}',
      display: '\\sum_{i=1}^{n}'
    },
    { 
      label: 'd/dx', 
      mathml: '<mfrac><mi>d</mi><mrow><mi>d</mi><mi>x</mi></mrow></mfrac>',
      latex: '\\frac{d}{dx}',
      display: '\\frac{d}{dx}'
    },
    { 
      label: '∂/∂x', 
      mathml: '<mfrac><mo>∂</mo><mrow><mo>∂</mo><mi>x</mi></mrow></mfrac>',
      latex: '\\frac{\\partial}{\\partial x}',
      display: '\\frac{\\partial}{\\partial x}'
    },
    { 
      label: 'vec', 
      mathml: '<mover><mi>v</mi><mo>→</mo></mover>',
      latex: '\\vec{v}',
      display: '\\vec{v}'
    },
  ],
  matrix: [
    { 
      label: '2×2', 
      mathml: `<mrow><mo>(</mo><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable><mo>)</mo></mrow>`,
      latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
      display: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'
    },
    { 
      label: '3×3', 
      mathml: `<mrow><mo>(</mo><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd><mtd><mi>c</mi></mtd></mtr><mtr><mtd><mi>d</mi></mtd><mtd><mi>e</mi></mtd><mtd><mi>f</mi></mtd></mtr><mtr><mtd><mi>g</mi></mtd><mtd><mi>h</mi></mtd><mtd><mi>i</mi></mtd></mtr></mtable><mo>)</mo></mrow>`,
      latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}'
    },
    { 
      label: 'det', 
      mathml: `<mrow><mo>|</mo><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable><mo>|</mo></mrow>`,
      latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
      display: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}'
    },
  ],
};

const CustomMathKeyboard: React.FC<CustomMathKeyboardProps> = ({
  onInsert,
  onClose,
  className
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  const handleInsert = (symbol: MathSymbol) => {
    // Wrap in full MathML if not already wrapped
    const mathml = symbol.mathml.startsWith('<math') 
      ? symbol.mathml 
      : generateMathML.wrap(symbol.mathml);
    onInsert(mathml);
  };

  const renderSymbolButton = (symbol: MathSymbol, index: number) => {
    let displayContent: React.ReactNode = symbol.label;
    
    // Try to render LaTeX preview
    if (symbol.display || symbol.latex) {
      try {
        const html = katex.renderToString(symbol.display || symbol.latex || '', { 
          throwOnError: false,
          displayMode: false
        });
        displayContent = <span dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (e) {
        displayContent = symbol.label;
      }
    }

    return (
      <motion.button
        key={index}
        onClick={() => handleInsert(symbol)}
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
    <div className={cn("bg-gradient-to-b from-muted/50 to-muted/30 rounded-xl border border-border p-3 space-y-3", className)}>
      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-7 h-9">
          <TabsTrigger value="basic" className="text-xs px-1">123</TabsTrigger>
          <TabsTrigger value="fractions" className="text-xs px-1">a/b</TabsTrigger>
          <TabsTrigger value="roots" className="text-xs px-1">√</TabsTrigger>
          <TabsTrigger value="symbols" className="text-xs px-1">π θ</TabsTrigger>
          <TabsTrigger value="trig" className="text-xs px-1">sin</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs px-1">∫∑</TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs px-1">□□</TabsTrigger>
        </TabsList>

        {Object.entries(MATH_SYMBOLS).map(([category, symbols]) => (
          <TabsContent key={category} value={category} className="mt-2">
            <div className="grid grid-cols-4 gap-1.5">
              {symbols.map((symbol, i) => renderSymbolButton(symbol, i))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="flex-1"
        >
          <ChevronDown className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
    </div>
  );
};

export default CustomMathKeyboard;
