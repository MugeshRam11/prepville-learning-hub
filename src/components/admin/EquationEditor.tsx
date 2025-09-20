import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, Download, RotateCcw, Undo, Redo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "mathlive";

// MathLive type declarations
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': any;
    }
  }
}

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function EquationEditor({ value, onChange, placeholder, className }: EquationEditorProps) {
  const mathfieldRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<string[]>([value || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const { toast } = useToast();

  // Initialize MathLive when component mounts
  useEffect(() => {
    if (mathfieldRef.current) {
      mathfieldRef.current.setOptions({
        smartFence: true,
        smartMode: true,
        smartSuperscript: true,
        virtualKeyboardMode: "manual",
        defaultMode: "math",
        letterShapeStyle: "auto",
      });
      
      // Set initial value
      if (value) {
        mathfieldRef.current.setValue(value);
      }
      
      // Listen for input changes
      mathfieldRef.current.addEventListener('input', (evt: any) => {
        const newValue = evt.target.getValue();
        handleValueChange(newValue);
      });
    }
  }, []);

  // Update mathfield when value changes externally
  useEffect(() => {
    if (mathfieldRef.current && mathfieldRef.current.getValue() !== value) {
      mathfieldRef.current.setValue(value || "");
    }
  }, [value]);

  // Initialize history with current value
  useEffect(() => {
    if (value !== history[historyIndex]) {
      setHistory([value || ""]);
      setHistoryIndex(0);
    }
  }, []);

  // Add to history when value changes (debounced)
  useEffect(() => {
    if (value === history[historyIndex]) return;
    
    const timer = setTimeout(() => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      if (newHistory.length > 50) { // Limit history size
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      setHistory(newHistory);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [value, history, historyIndex]);

  function insertSymbol(symbol: string) {
    if (mathfieldRef.current) {
      mathfieldRef.current.executeCommand(['insert', symbol]);
      mathfieldRef.current.focus();
    }
  }

  function insertTemplate(template: string) {
    if (mathfieldRef.current) {
      mathfieldRef.current.executeCommand(['insert', template]);
      mathfieldRef.current.focus();
    }
  }

  function handleValueChange(newValue: string) {
    onChange(newValue);
  }

  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousValue = history[newIndex];
      onChange(previousValue);
      if (mathfieldRef.current) {
        mathfieldRef.current.setValue(previousValue);
      }
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextValue = history[newIndex];
      onChange(nextValue);
      if (mathfieldRef.current) {
        mathfieldRef.current.setValue(nextValue);
      }
    }
  }

  function copyToClipboard(textToCopy: string) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied successfully",
      });
    });
  }

  function exportAsLaTeX() {
    copyToClipboard(value);
  }

  function exportAsUnicode() {
    if (mathfieldRef.current) {
      const unicodeValue = mathfieldRef.current.getValue('latex-expanded');
      copyToClipboard(unicodeValue);
    }
  }

  const mathTemplates = [
    { label: "Fraction", template: "\\frac{#@}{#?}" },
    { label: "Power", template: "#@^{#?}" },
    { label: "Subscript", template: "#@_{#?}" },
    { label: "Square Root", template: "\\sqrt{#@}" },
    { label: "Nth Root", template: "\\sqrt[#?]{#@}" },
    { label: "Sum", template: "\\sum_{#?}^{#?}" },
    { label: "Integral", template: "\\int_{#?}^{#?}" },
    { label: "Limit", template: "\\lim_{#? \\to #?}" },
    { label: "Matrix", template: "\\begin{pmatrix}#@ & #?\\\\#? & #?\\end{pmatrix}" },
  ];

  const symbolButtons = [
    { label: "α", symbol: "\\alpha" },
    { label: "β", symbol: "\\beta" },
    { label: "γ", symbol: "\\gamma" },
    { label: "π", symbol: "\\pi" },
    { label: "∞", symbol: "\\infty" },
    { label: "∂", symbol: "\\partial" },
    { label: "∇", symbol: "\\nabla" },
    { label: "≤", symbol: "\\le" },
    { label: "≥", symbol: "\\ge" },
    { label: "≠", symbol: "\\ne" },
    { label: "±", symbol: "\\pm" },
    { label: "÷", symbol: "\\div" },
    { label: "×", symbol: "\\times" },
    { label: "⋅", symbol: "\\cdot" },
  ];

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="relative">
          <math-field
            ref={mathfieldRef}
            style={{
              width: "100%",
              minHeight: "60px",
              fontSize: "1.1rem",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              padding: "12px",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              fontFamily: "inherit",
            }}
            onFocus={() => setIsExpanded(true)}
          >
            {value}
          </math-field>
          {!value && (
            <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none text-sm">
              {placeholder || "Type equations like Word - click buttons below or type directly..."}
            </div>
          )}
        </div>
        
        {isExpanded && (
          <Card className="border-dashed">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Word-like Math Editor</Badge>
                  
                  {/* Undo/Redo buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className="h-7 w-7 p-0"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className="h-7 w-7 p-0"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-7 w-7 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Math Templates</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mathTemplates.map((template) => (
                      <Button
                        key={template.label}
                        variant="outline"
                        size="sm"
                        onClick={() => insertTemplate(template.template)}
                        className="h-8 px-3 text-xs"
                        title={`Insert ${template.label}`}
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Symbols</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {symbolButtons.map((symbol) => (
                      <Button
                        key={symbol.label}
                        variant="outline"
                        size="sm"
                        onClick={() => insertSymbol(symbol.symbol)}
                        className="h-8 w-8 p-0 text-sm"
                        title={`Insert ${symbol.label}`}
                      >
                        {symbol.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(value)}
                    className="h-7 px-2 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsLaTeX}
                    className="h-7 px-2 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    LaTeX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsUnicode}
                    className="h-7 px-2 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Unicode
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground flex-1">
                  ✨ Copy equations from Word or type directly. Fractions, powers, roots work visually.
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
