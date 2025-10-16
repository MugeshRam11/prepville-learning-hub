import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, Download, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "mathlive";
import 'katex/dist/katex.min.css';
import renderToString from 'katex/dist/katex.mjs';
import copy from 'copy-to-clipboard';
import html2canvas from 'html2canvas';

// MathLive type declarations
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': any;
    }
  }
  interface Window {
    MathJax?: any;
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
  const [mathml, setMathml] = useState('');
  const [katexHtml, setKatexHtml] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load MathJax for TeX -> MathML conversion
  useEffect(() => {
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      document.head.appendChild(script);
      script.onload = () => {
        if (value) convertToMathML(value);
      };
    } else {
      if (value) convertToMathML(value);
    }
  }, []);

  // Initialize MathLive when component mounts
  useEffect(() => {
    if (mathfieldRef.current) {
      // Set properties for optimal text and math input
      mathfieldRef.current.smartFence = true;
      mathfieldRef.current.smartMode = false;
      mathfieldRef.current.smartSuperscript = false;
      mathfieldRef.current.mathVirtualKeyboardPolicy = "manual";
      mathfieldRef.current.defaultMode = "text";
      mathfieldRef.current.inlineShortcuts = {};
      
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

  // Update mathfield and render when value changes externally
  useEffect(() => {
    if (mathfieldRef.current && mathfieldRef.current.getValue() !== value) {
      mathfieldRef.current.setValue(value || "");
    }
    renderKaTeX(value || "");
    convertToMathML(value || "");
  }, [value]);

  function renderKaTeX(tex: string) {
    if (!tex) {
      setKatexHtml('');
      return;
    }
    
    // Check if content contains LaTeX syntax
    const hasLatex = tex.includes('\\') || tex.includes('^') || tex.includes('_') || tex.includes('{');
    
    if (!hasLatex) {
      // Plain text - display as-is
      setKatexHtml(`<div style="padding: 8px; font-size: 1.1rem;">${tex.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`);
      return;
    }
    
    try {
      const html = renderToString(tex, { throwOnError: false, displayMode: true });
      setKatexHtml(html);
    } catch (e) {
      // Show the error but also display the raw content
      console.error('KaTeX render error:', e);
      setKatexHtml(`<div style="color: red; font-size: 0.9rem;">Unable to render: ${tex.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`);
    }
  }

  function convertToMathML(tex: string) {
    if (!tex) {
      setMathml('');
      return;
    }
    if (window.MathJax && window.MathJax.tex2mml) {
      try {
        const mml = window.MathJax.tex2mml(tex, { parent: null });
        setMathml(mml);
      } catch (e) {
        setMathml('');
      }
    } else {
      setMathml('');
    }
  }

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

  function handleCopyLatex() {
    copy(value);
    toast({
      title: "LaTeX copied",
      description: "Content has been copied to clipboard",
    });
  }

  function handleCopyMathML() {
    if (!mathml) {
      toast({
        title: "MathML not available",
        description: "MathJax is still loading or conversion failed",
        variant: "destructive"
      });
      return;
    }
    copy(mathml);
    toast({
      title: "MathML copied",
      description: "MathML has been copied to clipboard",
    });
  }

  function handleCopyPNG() {
    if (!previewRef.current || !katexHtml) {
      toast({
        title: "No preview available",
        description: "Enter some math content first",
        variant: "destructive"
      });
      return;
    }
    const node = previewRef.current;
    html2canvas(node, { backgroundColor: null, scale: 2 }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (navigator.clipboard && typeof (navigator.clipboard as any).write === 'function') {
          const item = new ClipboardItem({ [blob.type]: blob });
          (navigator.clipboard as any).write([item]).then(() => {
            toast({
              title: "PNG copied",
              description: "Image has been copied to clipboard",
            });
          }).catch(() => {
            downloadBlob(blob, 'equation.png');
          });
        } else {
          downloadBlob(blob, 'equation.png');
        }
      });
    }).catch((e) => {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to generate PNG",
        variant: "destructive"
      });
    });
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "PNG downloaded",
      description: "Image file has been downloaded",
    });
  }

  function handleDownloadSVG() {
    if (!katexHtml) {
      toast({
        title: "Nothing to export",
        description: "Enter some math content first",
        variant: "destructive"
      });
      return;
    }
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='200'>` +
      `<foreignObject width='100%' height='100%'><div xmlns='http://www.w3.org/1999/xhtml'>${katexHtml}</div></foreignObject>` +
      `</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equation.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "SVG downloaded",
      description: "Vector image has been downloaded",
    });
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
              letterSpacing: "normal",
              wordSpacing: "normal",
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
        
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">Math Editor with Export Options</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 text-xs"
              >
                {isExpanded ? 'Hide' : 'Show'} Tools
              </Button>
            </div>

            {isExpanded && (
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
            )}

            {/* Export Options */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLatex}
                  className="h-7 px-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy LaTeX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMathML}
                  className="h-7 px-2 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Copy MathML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPNG}
                  className="h-7 px-2 text-xs"
                >
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Copy PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSVG}
                  className="h-7 px-2 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download SVG
                </Button>
              </div>
              
              {/* Preview */}
              {katexHtml && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rendered Preview:</label>
                  <div 
                    ref={previewRef} 
                    className="p-3 border rounded-md bg-background/50 min-h-[48px] overflow-x-auto" 
                    dangerouslySetInnerHTML={{ __html: katexHtml }} 
                  />
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                <strong>Tip for Word:</strong> Use "Copy PNG" to paste as image into Word, or use "Copy MathML" for newer Word versions. SVG provides best quality for documents.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
