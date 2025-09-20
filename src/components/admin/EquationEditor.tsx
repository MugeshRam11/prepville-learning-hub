import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, Download, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// MathJax type declarations
declare global {
  interface Window {
    MathJax: any;
  }
}

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function EquationEditor({ value, onChange, placeholder, className }: EquationEditorProps) {
  const [mode, setMode] = useState<"tex" | "mathml" | "plain">("tex");
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mathJaxReady, setMathJaxReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Load MathJax dynamically if not already present
  useEffect(() => {
    if (window.MathJax) {
      setMathJaxReady(true);
      return;
    }
    
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    script.onload = () => {
      if (window.MathJax && window.MathJax.startup) {
        setMathJaxReady(true);
      }
    };
    document.head.appendChild(script);
  }, []);

  // Render to MathJax whenever value or mode changes
  useEffect(() => {
    if (!mathJaxReady || !isExpanded) return;
    renderMath();
  }, [mathJaxReady, value, mode, isExpanded]);

  async function renderMath() {
    if (!window.MathJax) return;
    const container = outputRef.current;
    if (!container) return;

    container.innerHTML = "";

    try {
      if (mode === "tex" && value.trim()) {
        // Check if it contains LaTeX syntax
        const hasLatex = /\\[a-zA-Z]+|[\{\}]|\$|\^|_/.test(value);
        if (hasLatex) {
          const isBlock = /(^|\n)\$\$|\\\[|\\\]/.test(value) || value.includes("\\begin{");
          const math = isBlock ? `\\[${value.replace(/^\s+|\s+$/g, "")}\\]` : `\\(${value.replace(/^\s+|\s+$/g, "")}\\)`;
          const node = document.createElement("div");
          node.textContent = math;
          container.appendChild(node);
          await window.MathJax.typesetPromise([container]);
        } else {
          // Plain text fallback
          const pre = document.createElement("div");
          pre.textContent = value || "Preview will appear here...";
          pre.className = "text-muted-foreground italic";
          container.appendChild(pre);
        }
      } else if (mode === "mathml" && value.trim()) {
        const node = document.createElement("div");
        node.innerHTML = value;
        container.appendChild(node);
        await window.MathJax.typesetPromise([container]);
      } else {
        const pre = document.createElement("div");
        pre.textContent = value || "Preview will appear here...";
        pre.className = "text-muted-foreground italic";
        container.appendChild(pre);
      }
    } catch (e) {
      const err = document.createElement("div");
      err.textContent = "Rendering error: " + String(e);
      err.className = "text-destructive text-sm";
      container.appendChild(err);
    }
  }

  function insertAtCursor(snippet: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + snippet);
      return;
    }
    
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newValue = before + snippet + after;
    onChange(newValue);

    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  function handlePaste(e: React.ClipboardEvent) {
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    const html = clipboard.getData("text/html");
    const text = clipboard.getData("text/plain");

    if (html) {
      const mathMatch = html.match(/<math[\s\S]*?<\/math>/i);
      if (mathMatch) {
        e.preventDefault();
        setMode("mathml");
        onChange(mathMatch[0]);
        return;
      }
    }

    if (text && /\\|\$/.test(text)) {
      e.preventDefault();
      setMode("tex");
      onChange(text);
      return;
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
    if (mode === "tex") {
      copyToClipboard(value);
    } else if (mode === "mathml") {
      toast({
        title: "Export Note",
        description: "Original content is MathML. Use MathML export instead.",
        variant: "destructive",
      });
    } else {
      copyToClipboard(value);
    }
  }

  function exportAsMathML() {
    if (mode === "mathml") {
      copyToClipboard(value);
    } else if (mode === "tex" && window.MathJax) {
      try {
        const mml = window.MathJax.tex2mml(value, { display: true });
        copyToClipboard(mml);
      } catch (e) {
        toast({
          title: "Export Error",
          description: "Could not convert to MathML: " + (e as Error).message,
          variant: "destructive",
        });
      }
    } else {
      copyToClipboard(value);
    }
  }

  const toolbarButtons = [
    { label: "Fraction", snippet: "\\frac{a}{b}" },
    { label: "Power", snippet: "^{}" },
    { label: "Subscript", snippet: "_{}" },
    { label: "Square Root", snippet: "\\sqrt{}" },
    { label: "Nth Root", snippet: "\\sqrt[n]{}" },
    { label: "Sum", snippet: "\\sum_{i=1}^{n}" },
    { label: "Integral", snippet: "\\int_{a}^{b}" },
    { label: "Limit", snippet: "\\lim_{x \\to \\infty}" },
    { label: "Matrix", snippet: "\\begin{matrix}a & b\\\\c & d\\end{matrix}" },
    { label: "Alpha", snippet: "\\alpha" },
    { label: "Beta", snippet: "\\beta" },
    { label: "Pi", snippet: "\\pi" },
    { label: "Infinity", snippet: "\\infty" },
    { label: "Partial", snippet: "\\partial" },
    { label: "Nabla", snippet: "\\nabla" },
  ];

  return (
    <div className={className}>
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setMode("tex");
          }}
          onPaste={handlePaste}
          placeholder={placeholder || "Type LaTeX equations (e.g., \\frac{a}{b}) or paste from Word..."}
          className="min-h-[100px] font-mono"
          onFocus={() => setIsExpanded(true)}
        />
        
        {isExpanded && (
          <Card className="border-dashed">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Math Editor</Badge>
                  <Select value={mode} onValueChange={(value: "tex" | "mathml" | "plain") => setMode(value)}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tex">LaTeX</SelectItem>
                      <SelectItem value="mathml">MathML</SelectItem>
                      <SelectItem value="plain">Plain Text</SelectItem>
                    </SelectContent>
                  </Select>
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

              <div className="flex flex-wrap gap-1">
                {toolbarButtons.map((btn) => (
                  <Button
                    key={btn.label}
                    variant="outline"
                    size="sm"
                    onClick={() => insertAtCursor(btn.snippet)}
                    className="h-7 px-2 text-xs"
                    title={btn.snippet}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Live Preview</label>
                  <div 
                    ref={outputRef} 
                    className="border rounded-md p-3 min-h-[80px] bg-muted/30 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Export Options</label>
                  <div className="flex flex-wrap gap-1">
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
                      onClick={exportAsMathML}
                      className="h-7 px-2 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      MathML
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Tip: Paste from Word/PDF for auto-detection
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="outline" size="sm" className="px-2 py-1 text-xs">
      {children}
    </Button>
  );
}