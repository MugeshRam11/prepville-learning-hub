import React, { useRef, useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import copy from "copy-to-clipboard";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  insertAtCursor,
  transformSelection,
  toSuperscript,
  toSubscript,
  greekMap,
  operatorMap,
} from "@/lib/unicodeMath";

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// ─── Toolbar groups ─────────────────────────────────────────────
interface ToolItem {
  label: string;
  unicode: string;
  action: "insert" | "transform";
  transform?: (s: string) => string;
}

interface ToolGroup {
  name: string;
  items: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    name: "Fraction",
    items: [
      { label: "a/b", unicode: "x/y", action: "insert" },
      { label: "¹⁄₂", unicode: "¹⁄₂", action: "insert" },
      { label: "\\frac{a}{b}", unicode: "$\\frac{a}{b}$", action: "insert" },
    ],
  },
  {
    name: "Script",
    items: [
      { label: "x²", unicode: "x²", action: "insert" },
      { label: "x₃", unicode: "x₃", action: "insert" },
      { label: "sup ↑", unicode: "", action: "transform", transform: toSuperscript },
      { label: "sub ↓", unicode: "", action: "transform", transform: toSubscript },
      { label: "x^n", unicode: "$x^{n}$", action: "insert" },
    ],
  },
  {
    name: "Radical",
    items: [
      { label: "√", unicode: "√", action: "insert" },
      { label: "∛", unicode: "∛", action: "insert" },
      { label: "\\sqrt{x}", unicode: "$\\sqrt{x}$", action: "insert" },
    ],
  },
  {
    name: "LaTeX",
    items: [
      { label: "∫", unicode: "$\\int$", action: "insert" },
      { label: "Σ", unicode: "$\\sum$", action: "insert" },
      { label: "∞", unicode: "$\\infty$", action: "insert" },
      { label: "≠", unicode: "$\\neq$", action: "insert" },
      { label: "≤", unicode: "$\\leq$", action: "insert" },
      { label: "≥", unicode: "$\\geq$", action: "insert" },
      { label: "∪", unicode: "$\\cup$", action: "insert" },
      { label: "∩", unicode: "$\\cap$", action: "insert" },
    ],
  },
];

// ─── Render LaTeX preview ────────────────────────────────────────
function renderMathPreview(text: string): string {
  if (!text) return "";
  // Replace $$...$$ (display) and $...$ (inline) with rendered KaTeX
  let result = text
    .replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
      try {
        return katex.renderToString(latex, { displayMode: true, throwOnError: false });
      } catch { return `<span style="color:#cc0000">${latex}</span>`; }
    })
    .replace(/\$([^$]+)\$/g, (_, latex) => {
      try {
        return katex.renderToString(latex, { displayMode: false, throwOnError: false });
      } catch { return `<span style="color:#cc0000">${latex}</span>`; }
    });
  // Preserve newlines
  result = result.replace(/\n/g, "<br/>");
  return result;
}

export default function EquationEditor({
  value,
  onChange,
  placeholder,
  className = "",
}: EquationEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(true);

  const greekLetters = Object.entries(greekMap).map(([name, char]) => ({
    name,
    char,
  }));
  const operatorSymbols = Object.entries(operatorMap).map(([name, char]) => ({
    name,
    char,
  }));

  const handleInsert = useCallback(
    (text: string) => {
      if (!textareaRef.current) return;
      const next = insertAtCursor(textareaRef.current, text);
      onChange(next);
    },
    [onChange]
  );

  const handleTransform = useCallback(
    (fn: (s: string) => string) => {
      if (!textareaRef.current) return;
      const next = transformSelection(textareaRef.current, fn);
      onChange(next);
    },
    [onChange]
  );

  const handleCopy = useCallback(() => {
    if (value) {
      copy(value);
      toast({ title: "Copied", description: "Equation copied to clipboard" });
    }
  }, [value, toast]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text/plain");
      // If pasted text contains LaTeX patterns but no $ delimiters, wrap them
      if (text && /\\(frac|sqrt|sum|int|cap|cup|neq|leq|geq|infty|textbf|color|alpha|beta|gamma|delta|theta|pi|sigma|omega)\b/.test(text) && !text.includes("$")) {
        e.preventDefault();
        const wrapped = `$${text}$`;
        if (textareaRef.current) {
          const next = insertAtCursor(textareaRef.current, wrapped);
          onChange(next);
        }
      }
    },
    [onChange]
  );

  const hasLatex = value && /\$[^$]+\$/.test(value);

  return (
    <div className={className}>
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Toolbar */}
          <div className="space-y-3">
            {/* Tool groups */}
            <div className="flex flex-wrap gap-1.5">
              {TOOL_GROUPS.map((group) => (
                <div key={group.name} className="relative group">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 rounded-full border-border/60"
                  >
                    {group.name}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg p-2 hidden group-hover:flex flex-wrap gap-1 z-50 min-w-[160px]">
                    {group.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() =>
                          item.action === "transform" && item.transform
                            ? handleTransform(item.transform)
                            : handleInsert(item.unicode)
                        }
                        className="px-2.5 py-1.5 text-sm rounded-lg bg-background border border-border hover:bg-accent transition-colors whitespace-nowrap"
                        title={item.label}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 text-xs gap-1 rounded-full ml-auto"
              >
                <Copy className="w-3 h-3" /> Copy
              </Button>
            </div>

            {/* Greek Letters */}
            <div className="flex flex-wrap gap-1.5 bg-muted/30 p-3 rounded-2xl justify-center border border-border/50">
              {greekLetters.map(({ name, char }) => (
                <button
                  key={name}
                  onClick={() => handleInsert(char)}
                  title={name}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-base font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Operator Symbols */}
            <div className="flex flex-wrap gap-1.5 bg-muted/30 p-3 rounded-2xl justify-center border border-border/50">
              {operatorSymbols.map(({ name, char }) => (
                <button
                  key={name}
                  onClick={() => handleInsert(char)}
                  title={name}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-base font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Equation input textarea */}
            <textarea
              ref={textareaRef}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder || "Type equation here... Use $...$ for inline math, $$...$$ for display math"}
              className="w-full min-h-[100px] p-4 text-lg bg-background border-2 border-border rounded-2xl resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
              style={{ fontFamily: "'Cambria Math', 'Segoe UI', 'Arial Unicode MS', sans-serif" }}
            />

            {/* Live Math Preview */}
            {hasLatex && showPreview && (
              <div className="border-2 border-primary/20 rounded-2xl p-4 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">Math Preview</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                    className="h-6 text-xs"
                  >
                    Hide
                  </Button>
                </div>
                <div
                  className="text-lg leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMathPreview(value) }}
                />
              </div>
            )}

            {hasLatex && !showPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="text-xs text-primary"
              >
                Show Math Preview
              </Button>
            )}

            {/* Tip */}
            <div className="text-xs text-muted-foreground text-center">
              Click symbols to insert · Use <code className="bg-muted px-1 rounded">$...$</code> for inline math · Paste LaTeX auto-detected · Select text then click "sup ↑" or "sub ↓" to transform
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
