import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface SmartMathPlayerProps {
  palettes?: string[];
  inputMode?: 'single_expression' | 'multi_step';
  value?: { latex: string; plainText?: string };
  onChange: (value: { latex: string; plainText: string }) => void;
  disabled?: boolean;
}

// Palette items grouped by category
const PALETTE_ITEMS: Record<string, { label: string; latex: string; display: string }[]> = {
  fraction: [
    { label: '▫/▫', latex: '\\frac{▫}{▫}', display: '\\frac{a}{b}' },
    { label: 'Mixed', latex: '▫\\frac{▫}{▫}', display: 'a\\frac{b}{c}' },
  ],
  script: [
    { label: 'x²', latex: '▫^{▫}', display: 'x^{n}' },
    { label: 'xₙ', latex: '▫_{▫}', display: 'x_{n}' },
    { label: 'x²ₙ', latex: '▫^{▫}_{▫}', display: 'x^{a}_{b}' },
  ],
  radical: [
    { label: '√', latex: '\\sqrt{▫}', display: '\\sqrt{x}' },
    { label: 'ⁿ√', latex: '\\sqrt[▫]{▫}', display: '\\sqrt[n]{x}' },
  ],
  bracket: [
    { label: '( )', latex: '\\left(▫\\right)', display: '(x)' },
    { label: '[ ]', latex: '\\left[▫\\right]', display: '[x]' },
    { label: '{ }', latex: '\\left\\{▫\\right\\}', display: '\\{x\\}' },
    { label: '| |', latex: '\\left|▫\\right|', display: '|x|' },
  ],
  operator: [
    { label: '±', latex: '\\pm', display: '\\pm' },
    { label: '×', latex: '\\times', display: '\\times' },
    { label: '÷', latex: '\\div', display: '\\div' },
    { label: '≤', latex: '\\leq', display: '\\leq' },
    { label: '≥', latex: '\\geq', display: '\\geq' },
    { label: '≠', latex: '\\neq', display: '\\neq' },
    { label: '≈', latex: '\\approx', display: '\\approx' },
    { label: '∞', latex: '\\infty', display: '\\infty' },
  ],
  greek: [
    { label: 'π', latex: '\\pi', display: '\\pi' },
    { label: 'θ', latex: '\\theta', display: '\\theta' },
    { label: 'α', latex: '\\alpha', display: '\\alpha' },
    { label: 'β', latex: '\\beta', display: '\\beta' },
    { label: 'λ', latex: '\\lambda', display: '\\lambda' },
    { label: 'σ', latex: '\\sigma', display: '\\sigma' },
    { label: 'Δ', latex: '\\Delta', display: '\\Delta' },
    { label: 'Σ', latex: '\\Sigma', display: '\\Sigma' },
  ],
  integral: [
    { label: '∫', latex: '\\int_{▫}^{▫}▫', display: '\\int_{a}^{b}' },
    { label: 'lim', latex: '\\lim_{▫\\to▫}', display: '\\lim_{x\\to a}' },
    { label: 'Σ', latex: '\\sum_{▫}^{▫}', display: '\\sum_{i=1}^{n}' },
    { label: 'log', latex: '\\log_{▫}▫', display: '\\log_{b}{x}' },
  ],
};

const PALETTE_LABELS: Record<string, string> = {
  fraction: 'Fraction',
  script: 'Script',
  radical: 'Radical',
  bracket: 'Bracket',
  operator: 'Operator',
  greek: 'Greek',
  integral: 'Calculus',
};

const renderLatex = (latex: string): string => {
  if (!latex) return '';
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch {
    return latex;
  }
};

const SmartMathPlayer: React.FC<SmartMathPlayerProps> = ({
  palettes = ['fraction', 'script', 'radical', 'bracket', 'operator', 'greek'],
  inputMode = 'single_expression',
  value,
  onChange,
  disabled = false,
}) => {
  const [latex, setLatex] = useState(value?.latex || '');
  const [activePalette, setActivePalette] = useState<string>(palettes[0] || 'fraction');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (value?.latex !== undefined && value.latex !== latex) {
      setLatex(value.latex);
    }
  }, [value?.latex]);

  const emitChange = (newLatex: string) => {
    setLatex(newLatex);
    onChange({ latex: newLatex, plainText: newLatex });
  };

  const insertTemplate = (template: string) => {
    if (disabled) return;
    const textarea = inputRef.current;
    if (!textarea) {
      emitChange(latex + template.replace(/▫/g, ''));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = latex.substring(start, end);
    // Replace first placeholder with selection if any
    let inserted = template;
    if (selected && inserted.includes('▫')) {
      inserted = inserted.replace('▫', selected);
    }
    inserted = inserted.replace(/▫/g, '');
    const newLatex = latex.substring(0, start) + inserted + latex.substring(end);
    emitChange(newLatex);
    // Set cursor after insertion
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + inserted.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleReset = () => {
    emitChange('');
    inputRef.current?.focus();
  };

  const availablePalettes = palettes.filter(p => PALETTE_ITEMS[p]);

  return (
    <div className="space-y-3">
      {/* Palette tabs */}
      <div className="flex flex-wrap gap-1 bg-muted/30 rounded-lg p-1">
        {availablePalettes.map(pid => (
          <button
            key={pid}
            type="button"
            onClick={() => setActivePalette(pid)}
            disabled={disabled}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all",
              activePalette === pid
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            {PALETTE_LABELS[pid] || pid}
          </button>
        ))}
      </div>

      {/* Palette buttons */}
      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
        {(PALETTE_ITEMS[activePalette] || []).map((item, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            type="button"
            disabled={disabled}
            onClick={() => insertTemplate(item.latex)}
            className="h-8 px-2.5 font-mono"
            title={item.latex}
          >
            <span dangerouslySetInnerHTML={{ __html: renderLatex(item.display) }} />
          </Button>
        ))}
      </div>

      {/* Input area */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-3 space-y-2">
          <textarea
            ref={inputRef}
            value={latex}
            onChange={(e) => emitChange(e.target.value)}
            disabled={disabled}
            placeholder="Type LaTeX here or use the palette above..."
            className="w-full min-h-[60px] p-2 text-sm font-mono bg-background border rounded-md resize-y focus:ring-2 focus:ring-primary/50 focus:border-primary"
            rows={inputMode === 'multi_step' ? 5 : 2}
          />

          {/* Live preview */}
          {latex && (
            <div className="p-3 rounded-lg bg-muted/20 border text-center min-h-[40px] flex items-center justify-center">
              <span
                className="text-lg"
                dangerouslySetInnerHTML={{ __html: renderLatex(latex) }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset */}
      {!disabled && latex && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}
    </div>
  );
};

export default SmartMathPlayer;
