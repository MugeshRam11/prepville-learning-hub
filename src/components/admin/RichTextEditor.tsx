import React, { useEffect, useRef, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Type
} from "lucide-react";
import { SymbolPicker } from "./SymbolPicker";
import katex from "katex";
import "katex/dist/katex.min.css";
import "mathlive";
import "@/types/mathlive.d";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div', 'ul', 'ol', 'li', 'sup', 'sub', 'font'],
  ALLOWED_ATTR: ['style', 'class', 'data-latex', 'contenteditable', 'face', 'size', 'color', 'title'],
  ALLOW_DATA_ATTR: true,
};

// Regex to detect LaTeX patterns in pasted text
const LATEX_PATTERNS = [
  /\\frac\{/,
  /\\sqrt[\[{]/,
  /\\\w+\{/,      // \command{
  /\^{[^}]+}/,    // ^{...}
  /_{[^}]+}/,     // _{...}
  /\\left[(\[{|]/,
  /\\right[)\]}|]/,
  /\\begin\{/,
  /\\sum|\\int|\\prod|\\lim/,
  /\\alpha|\\beta|\\gamma|\\delta|\\theta|\\pi|\\sigma|\\omega/,
  /\\pm|\\times|\\div|\\cdot|\\leq|\\geq|\\neq|\\approx/,
];

function looksLikeLaTeX(text: string): boolean {
  return LATEX_PATTERNS.some(pattern => pattern.test(text));
}

// Extract LaTeX segments from mixed text: splits on $...$ and $$...$$ delimiters
function splitMathSegments(text: string): Array<{ type: 'text' | 'math'; value: string; display?: boolean }> {
  const segments: Array<{ type: 'text' | 'math'; value: string; display?: boolean }> = [];
  // Match $$...$$ (display) and $...$ (inline)
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    const isDisplay = raw.startsWith('$$');
    const latex = isDisplay ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
    segments.push({ type: 'math', value: latex, display: isDisplay });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

function renderLatexToHtml(latex: string, displayMode = false): string {
  try {
    const html = katex.renderToString(latex, { throwOnError: false, displayMode });
    return html;
  } catch {
    return latex;
  }
}

function createMathSpan(latex: string, displayMode = false): string {
  const rendered = renderLatexToHtml(latex, displayMode);
  const tag = displayMode ? 'div' : 'span';
  return `<${tag} class="math-expression" data-latex="${latex.replace(/"/g, '&quot;')}" contenteditable="false" style="display:${displayMode ? 'block' : 'inline-block'};background:hsl(var(--muted));padding:2px 6px;margin:0 2px;border-radius:4px;cursor:pointer;vertical-align:middle;" title="Double-click to edit">${rendered}</${tag}>`;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<any>(null);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [editingLatex, setEditingLatex] = useState("");
  const [editingMathNode, setEditingMathNode] = useState<HTMLElement | null>(null);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [currentFont, setCurrentFont] = useState("Arial");
  const [currentSize, setCurrentSize] = useState("16px");
  const isUpdatingRef = useRef(false);

  const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, PURIFY_CONFIG);
  };

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = sanitizeHtml(value || '');
      rerenderMathExpressions();
    }
  }, []);

  // Re-render KaTeX for any math-expression spans in the editor
  const rerenderMathExpressions = useCallback(() => {
    if (!editorRef.current) return;
    const mathNodes = editorRef.current.querySelectorAll('.math-expression[data-latex]');
    mathNodes.forEach((node) => {
      const latex = node.getAttribute('data-latex');
      if (latex) {
        try {
          const isDisplay = node.tagName === 'DIV';
          katex.render(latex, node as HTMLElement, { throwOnError: false, displayMode: isDisplay });
        } catch {
          // leave as-is
        }
      }
    });
  }, []);

  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, cmdValue?: string) => {
    document.execCommand(command, false, cmdValue);
    editorRef.current?.focus();
  };

  const insertSymbol = (symbol: string) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(symbol);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      handleInput();
    }
  };

  const openMathEditor = (initialLatex = "", targetNode: HTMLElement | null = null) => {
    setEditingLatex(initialLatex);
    setEditingMathNode(targetNode);
    setShowMathEditor(true);
  };

  const handleMathInsert = (latex: string) => {
    if (!editorRef.current || !latex) {
      setShowMathEditor(false);
      setEditingMathNode(null);
      return;
    }

    isUpdatingRef.current = true;

    if (editingMathNode && editorRef.current.contains(editingMathNode)) {
      // Update existing math node
      editingMathNode.setAttribute('data-latex', latex);
      try {
        const isDisplay = editingMathNode.tagName === 'DIV';
        katex.render(latex, editingMathNode, { throwOnError: false, displayMode: isDisplay });
      } catch {
        editingMathNode.textContent = latex;
      }
    } else {
      // Insert new math node
      const mathHtml = createMathSpan(latex);
      const temp = document.createElement('span');
      temp.innerHTML = mathHtml;
      const mathNode = temp.firstChild as HTMLElement;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(mathNode);
        // Add a space after for continued typing
        const space = document.createTextNode('\u00A0');
        range.setStartAfter(mathNode);
        range.insertNode(space);
        range.setStartAfter(space);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.appendChild(mathNode);
      }
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
      handleInput();
    }, 0);

    setShowMathEditor(false);
    setEditingMathNode(null);
    setEditingLatex("");
  };

  // Handle paste: detect LaTeX and render as math blocks
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const hasDollarDelimiters = /\$[^$]+\$/.test(text) || /\$\$[\s\S]+?\$\$/.test(text);
    const isRawLatex = looksLikeLaTeX(text);

    if (!hasDollarDelimiters && !isRawLatex) return;

    e.preventDefault();
    isUpdatingRef.current = true;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    if (hasDollarDelimiters) {
      // Mixed text with $...$ delimiters
      const segments = splitMathSegments(text);
      const fragment = document.createDocumentFragment();
      segments.forEach(seg => {
        if (seg.type === 'math') {
          const temp = document.createElement('span');
          temp.innerHTML = createMathSpan(seg.value, seg.display);
          if (temp.firstChild) fragment.appendChild(temp.firstChild);
        } else {
          fragment.appendChild(document.createTextNode(seg.value));
        }
      });
      range.insertNode(fragment);
    } else if (isRawLatex) {
      // Entire pasted text is raw LaTeX
      const temp = document.createElement('span');
      temp.innerHTML = createMathSpan(text.trim());
      if (temp.firstChild) {
        range.insertNode(temp.firstChild);
      }
    }

    // Move cursor to end
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    setTimeout(() => {
      isUpdatingRef.current = false;
      handleInput();
    }, 0);
  }, []);

  // Double-click on math node to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mathNode = target.closest('.math-expression[data-latex]') as HTMLElement;
    if (mathNode) {
      e.preventDefault();
      const latex = mathNode.getAttribute('data-latex') || '';
      openMathEditor(latex, mathNode);
    }
  }, []);

  // Set initial value on mathfield when modal opens
  useEffect(() => {
    if (showMathEditor && mathfieldRef.current && editingLatex) {
      setTimeout(() => {
        if (mathfieldRef.current) {
          mathfieldRef.current.setValue(editingLatex);
        }
      }, 100);
    }
  }, [showMathEditor, editingLatex]);

  const fonts = [
    "Arial", "Times New Roman", "Georgia", "Verdana",
    "Courier New", "Comic Sans MS", "Impact", "Trebuchet MS"
  ];
  const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Formatting Toolbar */}
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Font Family */}
              <Select value={currentFont} onValueChange={(v) => { setCurrentFont(v); execCommand('fontName', v); }}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fonts.map(font => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Font Size */}
              <Select value={currentSize} onValueChange={(v) => {
                setCurrentSize(v);
                execCommand('fontSize', '7');
                const sel = window.getSelection();
                if (sel) {
                  const parent = sel.anchorNode?.parentElement;
                  if (parent) parent.style.fontSize = v;
                }
              }}>
                <SelectTrigger className="w-[80px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fontSizes.map(size => (<SelectItem key={size} value={size}>{size}</SelectItem>))}
                </SelectContent>
              </Select>

              <div className="w-px h-6 bg-border" />

              {/* Text Formatting */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => execCommand('bold')} className="h-9 w-9 p-0" title="Bold (Ctrl+B)"><Bold className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => execCommand('italic')} className="h-9 w-9 p-0" title="Italic (Ctrl+I)"><Italic className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => execCommand('underline')} className="h-9 w-9 p-0" title="Underline (Ctrl+U)"><Underline className="h-4 w-4" /></Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Alignment */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => execCommand('justifyLeft')} className="h-9 w-9 p-0" title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => execCommand('justifyCenter')} className="h-9 w-9 p-0" title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => execCommand('justifyRight')} className="h-9 w-9 p-0" title="Align Right"><AlignRight className="h-4 w-4" /></Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Lists */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => execCommand('insertUnorderedList')} className="h-9 w-9 p-0" title="Bullet List"><List className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => execCommand('insertOrderedList')} className="h-9 w-9 p-0" title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Undo/Redo */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => execCommand('undo')} className="h-9 w-9 p-0" title="Undo"><Undo className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => execCommand('redo')} className="h-9 w-9 p-0" title="Redo"><Redo className="h-4 w-4" /></Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Math & Symbols */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => openMathEditor()} className="h-9 px-3" title="Insert Math Equation">
                  <Type className="h-4 w-4 mr-1" />Math
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSymbolPicker(!showSymbolPicker)} className="h-9 px-3" title="Insert Symbol">Σ</Button>
              </div>
            </div>

            {/* Symbol Picker */}
            {showSymbolPicker && (
              <div className="mt-3 pt-3 border-t">
                <SymbolPicker onSelect={(symbol) => { insertSymbol(symbol); setShowSymbolPicker(false); }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paste hint */}
        <p className="text-xs text-muted-foreground px-1">
          💡 Paste LaTeX (e.g. <code className="text-xs bg-muted px-1 rounded">\frac&#123;a&#125;&#123;b&#125;</code>) or use <code className="text-xs bg-muted px-1 rounded">$...$</code> delimiters — equations render automatically. Double-click any equation to edit.
        </p>

        {/* Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onDoubleClick={handleDoubleClick}
          className="min-h-[150px] p-4 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          style={{
            fontSize: currentSize,
            fontFamily: currentFont,
            lineHeight: "1.6",
          }}
          suppressContentEditableWarning
          data-placeholder={placeholder || "Type your question here..."}
        />

        {/* Math Editor Modal */}
        {showMathEditor && (
          <Card className="border-2 border-primary">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{editingMathNode ? 'Edit' : 'Insert'} Math Expression</h4>
                <Button variant="ghost" size="sm" onClick={() => { setShowMathEditor(false); setEditingMathNode(null); setEditingLatex(""); }}>Cancel</Button>
              </div>
              <math-field
                ref={mathfieldRef}
                style={{
                  width: "100%",
                  minHeight: "60px",
                  fontSize: "1.2rem",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  padding: "12px",
                  backgroundColor: "hsl(var(--background))",
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (mathfieldRef.current) {
                      handleMathInsert(mathfieldRef.current.getValue());
                    }
                  }}
                  className="flex-1"
                >
                  {editingMathNode ? 'Update' : 'Insert'} Math
                </Button>
                {editingMathNode && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (editingMathNode && editorRef.current?.contains(editingMathNode)) {
                        editingMathNode.remove();
                        handleInput();
                      }
                      setShowMathEditor(false);
                      setEditingMathNode(null);
                      setEditingLatex("");
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
