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
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const { toast } = useToast();

  const greekLetters = Object.entries(greekMap).map(([name, char]) => ({
    name,
    char,
  }));
  const operatorSymbols = Object.entries(operatorMap).map(([name, char]) => ({
    name,
    char,
  }));

  // Convert raw value (with $...$) to HTML with rendered KaTeX
  const valueToHtml = useCallback((text: string): string => {
    if (!text) return "";
    let result = text
      .replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
        try {
          const rendered = katex.renderToString(latex, { displayMode: true, throwOnError: false });
          return `<span class="katex-block" data-latex="${latex.replace(/"/g, '&quot;')}" contenteditable="false">${rendered}</span>`;
        } catch { return `<span class="katex-block" data-latex="${latex.replace(/"/g, '&quot;')}" contenteditable="false" style="color:#cc0000">${latex}</span>`; }
      })
      .replace(/\$([^$]+)\$/g, (_, latex) => {
        try {
          const rendered = katex.renderToString(latex, { displayMode: false, throwOnError: false });
          return `<span class="katex-inline" data-latex="${latex.replace(/"/g, '&quot;')}" contenteditable="false">${rendered}</span>`;
        } catch { return `<span class="katex-inline" data-latex="${latex.replace(/"/g, '&quot;')}" contenteditable="false" style="color:#cc0000">${latex}</span>`; }
      });
    result = result.replace(/\n/g, "<br/>");
    return result;
  }, []);

  // Extract raw value from HTML (convert rendered KaTeX spans back to $...$)
  const htmlToValue = useCallback((el: HTMLDivElement): string => {
    let result = "";
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        if (elem.dataset.latex) {
          const isBlock = elem.classList.contains("katex-block");
          result += isBlock ? `$$${elem.dataset.latex}$$` : `$${elem.dataset.latex}$`;
        } else if (elem.tagName === "BR") {
          result += "\n";
        } else {
          // Recurse for nested elements
          const inner = elem.dataset.latex;
          if (inner) {
            result += `$${inner}$`;
          } else {
            result += elem.textContent || "";
          }
        }
      }
    });
    return result;
  }, []);

  // Sync external value → editor HTML
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current) {
      const html = valueToHtml(value || "");
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, [value, valueToHtml]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    const raw = htmlToValue(editorRef.current);
    onChange(raw);
  }, [htmlToValue, onChange]);

  const insertTextAtCursor = useCallback((text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      // Check if it contains LaTeX
      if (/\$[^$]+\$/.test(text)) {
        const temp = document.createElement("span");
        temp.innerHTML = valueToHtml(text);
        const frag = document.createDocumentFragment();
        while (temp.firstChild) frag.appendChild(temp.firstChild);
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      editorRef.current.innerHTML += valueToHtml(text);
    }
    handleInput();
  }, [valueToHtml, handleInput]);

  const handleInsert = useCallback(
    (text: string) => {
      insertTextAtCursor(text);
    },
    [insertTextAtCursor]
  );

  const handleTransform = useCallback(
    (fn: (s: string) => string) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const selectedText = sel.toString();
      const transformed = fn(selectedText);
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(transformed);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
      handleInput();
    },
    [handleInput]
  );

  const handleCopy = useCallback(() => {
    if (value) {
      copy(value);
      toast({ title: "Copied", description: "Equation copied to clipboard" });
    }
  }, [value, toast]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      // Auto-wrap raw LaTeX if no $ delimiters
      let toInsert = text;
      if (/\\(frac|sqrt|sum|int|cap|cup|neq|leq|geq|infty|textbf|color|alpha|beta|gamma|delta|theta|pi|sigma|omega)\b/.test(text) && !text.includes("$")) {
        toInsert = `$${text}$`;
      }
      insertTextAtCursor(toInsert);
    },
    [insertTextAtCursor]
  );

  return (
    <div className={className}>
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
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

            {/* Rich Math Editor - contenteditable with inline KaTeX rendering */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onPaste={handlePaste}
              data-placeholder={placeholder || "Type here... Use $...$ for inline math. Pasted LaTeX auto-renders."}
              className="w-full min-h-[100px] p-4 text-lg bg-background border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors text-foreground empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
              style={{ fontFamily: "'Cambria Math', 'Segoe UI', 'Arial Unicode MS', sans-serif", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            />

            {/* Tip */}
            <div className="text-xs text-muted-foreground text-center">
              Click symbols to insert · Use <code className="bg-muted px-1 rounded">$...$</code> for inline math · Paste LaTeX auto-renders inline
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
