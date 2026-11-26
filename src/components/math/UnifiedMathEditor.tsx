import React, { useRef, useEffect, useState, useCallback, useId } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Keyboard,
  ChevronDown,
  X,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Calculator,
  Divide,
  Superscript,
  Square,
  Sigma,
  Pi,
  Hash,
  Check
} from 'lucide-react';
import type { MathfieldElement } from 'mathlive';
import 'mathlive';
import '@/types/mathlive.d';
import {
  normalizePureLatex,
  parseMixedProseAndMath,
  validateMathExpression,
  serializeInlineMath,
  serializeDisplayMath
} from '@/lib/canonicalMath';
import { renderFinalText } from '@/lib/renderFinalText';

export interface UnifiedMathEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  mode?: 'pure_latex' | 'mixed_prose';
  autoSave?: boolean | number; // boolean or debounce in ms (default 1500ms)
  onAutoSave?: (value: string) => void;
  className?: string;
  minHeight?: string;
  showToolbar?: boolean;
  hideSubmit?: boolean;
}

interface MathPaletteItem {
  label: string;
  latex: string;
  display?: string;
  cursorOffset?: number;
}

export const UnifiedMathEditor: React.FC<UnifiedMathEditorProps> = ({
  value = '',
  onChange,
  onBlur,
  onSubmit,
  disabled = false,
  readOnly = false,
  placeholder,
  ariaLabel = 'Mathematical Input Editor',
  mode = 'pure_latex',
  autoSave = false,
  onAutoSave,
  className,
  minHeight,
  showToolbar = true,
  hideSubmit = true,
}) => {
  const editorId = useId();
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const [showSource, setShowSource] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastInternalValueRef = useRef<string>(value);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'fractions' | 'roots' | 'trig' | 'symbols' | 'matrices' | 'advanced'>('basic');
  const [showPreview, setShowPreview] = useState(mode === 'mixed_prose');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Default placeholder based on mode
  const defaultPlaceholder = mode === 'pure_latex'
    ? 'Enter mathematical expression (e.g. \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a})...'
    : 'Type explanation with inline ($x^2$) or display ($$\\frac{a}{b}$$) math...';
  const effectivePlaceholder = placeholder || defaultPlaceholder;

  // Track debounced autosave
  useEffect(() => {
    if (!autoSave || !onAutoSave) return;
    const delay = typeof autoSave === 'number' ? autoSave : 1500;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      onAutoSave(value);
    }, delay);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [value, autoSave, onAutoSave]);

  // Synchronize MathLive element without jumping cursor
  useEffect(() => {
    if (mode !== 'pure_latex') return;
    const mf = mathFieldRef.current;
    if (!mf) return;

    // Only update mf if external value differs from last internal emission
    const normalizedProp = normalizePureLatex(value);
    if (mf.value !== normalizedProp) {
      mf.value = normalizedProp;
      lastInternalValueRef.current = normalizedProp;
    }
  }, [value, mode, showSource]);

  // MathLive event setup
  useEffect(() => {
    if (mode !== 'pure_latex') return;
    const mf = mathFieldRef.current;
    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = 'manual';

    const handleInput = () => {
      const latex = mf.value;
      const normalized = normalizePureLatex(latex);
      lastInternalValueRef.current = normalized;
      onChange(normalized);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    const handleBlurEvent = () => {
      if (onBlur) onBlur();
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeydown);
    mf.addEventListener('blur', handleBlurEvent);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeydown);
      mf.removeEventListener('blur', handleBlurEvent);
    };
  }, [onChange, onSubmit, onBlur, mode, showSource]);

  // Toggle virtual keyboard
  const toggleKeyboard = useCallback(() => {
    const virtualKb = window.mathVirtualKeyboard;
    if (virtualKb) {
      if (isKeyboardOpen) {
        virtualKb.hide();
        setIsKeyboardOpen(false);
      } else {
        virtualKb.show();
        setIsKeyboardOpen(true);
        if (mode === 'pure_latex' && mathFieldRef.current) {
          mathFieldRef.current.focus();
        }
      }
    } else {
      setIsKeyboardOpen(!isKeyboardOpen);
    }
  }, [isKeyboardOpen, mode]);

  // Pure Math: Insert into MathLive field at current selection
  const insertLatexPure = useCallback((latexSnippet: string) => {
    const mf = mathFieldRef.current;
    if (!mf) return;
    mf.executeCommand(['insert', latexSnippet]);
    mf.focus();
  }, []);

  // Mixed Prose: Insert into Textarea at current selection
  const insertLatexProse = useCallback((latexSnippet: string, isBlock = false) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const currentText = ta.value;

    const formatted = isBlock
      ? `\n$$${latexSnippet}$$\n`
      : `$${latexSnippet}$`;

    const nextText = currentText.slice(0, start) + formatted + currentText.slice(end);
    onChange(nextText);

    setTimeout(() => {
      ta.focus();
      const newCursor = start + formatted.length;
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }, [onChange]);

  // Common dispatcher
  const handlePaletteClick = (item: MathPaletteItem) => {
    if (disabled || readOnly) return;
    if (mode === 'pure_latex') {
      insertLatexPure(item.latex);
    } else {
      insertLatexProse(item.latex, item.latex.includes('\\begin{'));
    }
  };

  const handleClear = () => {
    if (disabled || readOnly) return;
    onChange('');
    if (mode === 'pure_latex' && mathFieldRef.current) {
      mathFieldRef.current.value = '';
      lastInternalValueRef.current = '';
      mathFieldRef.current.focus();
    } else if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleUndo = () => {
    if (mode === 'pure_latex' && mathFieldRef.current) {
      mathFieldRef.current.executeCommand('undo');
    } else if (textareaRef.current) {
      document.execCommand('undo');
    }
  };

  const handleRedo = () => {
    if (mode === 'pure_latex' && mathFieldRef.current) {
      mathFieldRef.current.executeCommand('redo');
    } else if (textareaRef.current) {
      document.execCommand('redo');
    }
  };

  // IB MYP Mathematics Palettes
  const basicButtons: MathPaletteItem[] = [
    { label: '7', latex: '7' },
    { label: '8', latex: '8' },
    { label: '9', latex: '9' },
    { label: '+', latex: '+' },
    { label: '4', latex: '4' },
    { label: '5', latex: '5' },
    { label: '6', latex: '6' },
    { label: '−', latex: '-' },
    { label: '1', latex: '1' },
    { label: '2', latex: '2' },
    { label: '3', latex: '3' },
    { label: '×', latex: '\\times ' },
    { label: '0', latex: '0' },
    { label: '.', latex: '.' },
    { label: '=', latex: '=' },
    { label: '÷', latex: '\\div ' },
  ];

  const fractionButtons: MathPaletteItem[] = [
    { label: 'a/b', latex: '\\frac{#@}{#?}' },
    { label: 'x²', latex: '^{2}' },
    { label: 'x³', latex: '^{3}' },
    { label: 'xⁿ', latex: '^{#?}' },
    { label: 'x₁', latex: '_{1}' },
    { label: 'x₂', latex: '_{2}' },
    { label: 'xₙ', latex: '_{#?}' },
    { label: '½', latex: '\\frac{1}{2}' },
  ];

  const rootButtons: MathPaletteItem[] = [
    { label: '√x', latex: '\\sqrt{#?}' },
    { label: '∛x', latex: '\\sqrt[3]{#?}' },
    { label: 'ⁿ√x', latex: '\\sqrt[#?]{#?}' },
    { label: '±', latex: '\\pm ' },
    { label: '|x|', latex: '|#?|' },
    { label: '≤', latex: '\\leq ' },
    { label: '≥', latex: '\\geq ' },
    { label: '≠', latex: '\\neq ' },
    { label: '≈', latex: '\\approx ' },
    { label: '∞', latex: '\\infty ' },
  ];

  const trigButtons: MathPaletteItem[] = [
    { label: 'sin', latex: '\\sin(#?)' },
    { label: 'cos', latex: '\\cos(#?)' },
    { label: 'tan', latex: '\\tan(#?)' },
    { label: 'sin⁻¹', latex: '\\sin^{-1}(#?)' },
    { label: 'cos⁻¹', latex: '\\cos^{-1}(#?)' },
    { label: 'tan⁻¹', latex: '\\tan^{-1}(#?)' },
    { label: 'log', latex: '\\log(#?)' },
    { label: 'ln', latex: '\\ln(#?)' },
    { label: 'log₁₀', latex: '\\log_{10}(#?)' },
    { label: 'logₐ', latex: '\\log_{#?}(#?)' },
  ];

  const symbolButtons: MathPaletteItem[] = [
    { label: 'π', latex: '\\pi ' },
    { label: 'θ', latex: '\\theta ' },
    { label: 'α', latex: '\\alpha ' },
    { label: 'β', latex: '\\beta ' },
    { label: 'γ', latex: '\\gamma ' },
    { label: 'Δ', latex: '\\Delta ' },
    { label: '∈', latex: '\\in ' },
    { label: '∉', latex: '\\notin ' },
    { label: '∪', latex: '\\cup ' },
    { label: '∩', latex: '\\cap ' },
    { label: '⊂', latex: '\\subset ' },
    { label: '°', latex: '^\\circ' },
  ];

  const matrixButtons: MathPaletteItem[] = [
    { label: '2×2 Matrix', latex: '\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}' },
    { label: '2×1 Vector', latex: '\\begin{pmatrix} #? \\\\ #? \\end{pmatrix}' },
    { label: '3×3 Matrix', latex: '\\begin{pmatrix} #? & #? & #? \\\\ #? & #? & #? \\\\ #? & #? & #? \\end{pmatrix}' },
    { label: 'Determinant', latex: '\\begin{vmatrix} #? & #? \\\\ #? & #? \\end{vmatrix}' },
    { label: 'v⃗', latex: '\\vec{#?}' },
    { label: 'v bold', latex: '\\mathbf{#?}' },
  ];

  const advancedButtons: MathPaletteItem[] = [
    { label: 'd/dx', latex: '\\frac{d}{dx}(#?)' },
    { label: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}(#?)' },
    { label: '∫ dx', latex: '\\int (#?) \\, dx' },
    { label: '∫ₐᵇ', latex: '\\int_{#?}^{#?} (#?) \\, dx' },
    { label: '∑', latex: '\\sum_{i=#?}^{#?} #?' },
    { label: '∏', latex: '\\prod_{i=#?}^{#?} #?' },
    { label: 'lim', latex: '\\lim_{x \\to #?} #?' },
    { label: 'Piecewise', latex: '\\begin{cases} #? & \\text{if } #? \\\\ #? & \\text{if } #? \\end{cases}' },
    { label: 'Aligned', latex: '\\begin{aligned} #? &= #? \\\\ #? &= #? \\end{aligned}' },
    { label: 'Binomial', latex: '\\binom{#?}{#?}' },
  ];

  const renderPaletteGrid = (items: MathPaletteItem[]) => (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 p-2 bg-muted/40 rounded-lg">
      {items.map((btn, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handlePaletteClick(btn)}
          disabled={disabled || readOnly}
          aria-label={btn.label}
          title={btn.label}
          className={cn(
            "h-10 min-w-[40px] px-2 text-xs font-medium rounded-lg border border-border bg-card touch-manipulation",
            "hover:bg-primary/10 hover:border-primary/50 transition-colors",
            "active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40",
            "flex items-center justify-center select-none"
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={cn("unified-math-editor space-y-2 w-full", className)}>
      {/* Top Toolbar / Action Controls */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
          <div className="flex max-w-full flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={disabled || readOnly}
              className="h-8 px-2 text-xs"
              title="Undo"
              aria-label="Undo mathematical edit"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={disabled || readOnly}
              className="h-8 px-2 text-xs"
              title="Redo"
              aria-label="Redo mathematical edit"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={isKeyboardOpen ? "default" : "outline"}
              size="sm"
              onClick={toggleKeyboard}
              disabled={disabled || readOnly}
              className="h-8 px-2.5 text-xs gap-1.5"
              aria-label="Toggle mathematical palette"
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Palette</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", isKeyboardOpen && "rotate-180")} />
            </Button>
            {mode === 'mixed_prose' && (
              <Button
                type="button"
                variant={showPreview ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8 px-2.5 text-xs gap-1.5"
                aria-label="Toggle equation preview"
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
                <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
              </Button>
            )}
          </div>

          <div className="flex max-w-full flex-wrap items-center gap-1">
            {value && !disabled && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                aria-label="Clear mathematical input"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Expandable Mathematics Palette Tabs */}
      {isKeyboardOpen && (
        <div className="border border-border rounded-xl p-2 bg-card shadow-sm space-y-2 animate-in fade-in duration-200">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="w-full flex overflow-x-auto h-9 text-xs justify-start sm:grid sm:grid-cols-7 border-b sm:border-0 pb-1 sm:pb-0" aria-label="Mathematical Palette Categories">
              <TabsTrigger value="basic" className="shrink-0 sm:shrink min-w-[48px] sm:min-w-0 px-2 py-1 touch-manipulation">123</TabsTrigger>
              <TabsTrigger value="fractions" className="shrink-0 sm:shrink min-w-[56px] sm:min-w-0 px-2 py-1 touch-manipulation">a/b, xⁿ</TabsTrigger>
              <TabsTrigger value="roots" className="shrink-0 sm:shrink min-w-[48px] sm:min-w-0 px-2 py-1 touch-manipulation">√, ≤</TabsTrigger>
              <TabsTrigger value="trig" className="shrink-0 sm:shrink min-w-[56px] sm:min-w-0 px-2 py-1 touch-manipulation">sin, log</TabsTrigger>
              <TabsTrigger value="symbols" className="shrink-0 sm:shrink min-w-[56px] sm:min-w-0 px-2 py-1 touch-manipulation">π, ∈, °</TabsTrigger>
              <TabsTrigger value="matrices" className="shrink-0 sm:shrink min-w-[52px] sm:min-w-0 px-2 py-1 touch-manipulation">▦, v⃗</TabsTrigger>
              <TabsTrigger value="advanced" className="shrink-0 sm:shrink min-w-[48px] sm:min-w-0 px-2 py-1 touch-manipulation">∫, ∑</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-2">
              {renderPaletteGrid(basicButtons)}
            </TabsContent>
            <TabsContent value="fractions" className="mt-2">
              {renderPaletteGrid(fractionButtons)}
            </TabsContent>
            <TabsContent value="roots" className="mt-2">
              {renderPaletteGrid(rootButtons)}
            </TabsContent>
            <TabsContent value="trig" className="mt-2">
              {renderPaletteGrid(trigButtons)}
            </TabsContent>
            <TabsContent value="symbols" className="mt-2">
              {renderPaletteGrid(symbolButtons)}
            </TabsContent>
            <TabsContent value="matrices" className="mt-2">
              {renderPaletteGrid(matrixButtons)}
            </TabsContent>
            <TabsContent value="advanced" className="mt-2">
              {renderPaletteGrid(advancedButtons)}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Primary Input Container */}
      {mode === 'pure_latex' ? (
        <div className="relative">
          <button type="button" aria-pressed={showSource} className="mb-1 text-xs underline" onClick={()=>setShowSource(!showSource)}>{showSource?'Visual editor':'Edit LaTeX source'}</button>
          {showSource ? <textarea aria-label={ariaLabel+' source'} className="w-full rounded border p-2 font-mono" value={value} disabled={disabled} readOnly={readOnly} onChange={e=>onChange(e.target.value)} onBlur={onBlur}/> :
          <math-field
            id={editorId}
            ref={mathFieldRef}
            placeholder={effectivePlaceholder}
            smart-mode="true"
            smart-superscript="true"
            remove-extraneous-parentheses="true"
            disabled={disabled || undefined}
            readonly={readOnly || undefined}
            aria-label={ariaLabel}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              overflowX: 'auto',
              minHeight: minHeight || '54px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '2px solid hsl(var(--border))',
              backgroundColor: disabled ? 'hsl(var(--muted))' : 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              fontSize: '18px',
              boxSizing: 'border-box',
              outline: 'none',
              '--caret-color': 'hsl(var(--primary))',
              '--selection-background-color': 'hsl(var(--primary) / 0.2)',
            } as React.CSSProperties}
          />}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            id={editorId}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={effectivePlaceholder}
            aria-label={ariaLabel}
            rows={4}
            className={cn(
              "w-full p-3.5 rounded-xl border-2 border-border bg-card text-foreground text-sm font-sans",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              "transition-all leading-relaxed resize-y",
              disabled && "opacity-60 cursor-not-allowed bg-muted"
            )}
            style={{ minHeight: minHeight || '110px' }}
          />

          {/* Live Rendered KaTeX Preview for Mixed Prose */}
          {showPreview && value.trim() && (
            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Rendered Mathematical Preview</span>
                <span className="text-emerald-600 dark:text-emerald-400">Live KaTeX</span>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert font-serif text-sm leading-relaxed whitespace-pre-wrap">
                {renderFinalText(value)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optional Submit Button */}
      {!hideSubmit && onSubmit && (
        <div className="pt-2">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Submit Answer
          </Button>
        </div>
      )}
    </div>
  );
};

export default UnifiedMathEditor;
