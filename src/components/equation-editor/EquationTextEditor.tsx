import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import EquationEditorModal from './EquationEditorModal';
import { EquationData } from './EquationObject';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface EquationTextEditorProps {
  value: string;
  equations: EquationData[];
  onValueChange: (value: string) => void;
  onEquationsChange: (equations: EquationData[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

/**
 * Inline equation text editor using contenteditable.
 * Equations are rendered as KaTeX spans directly in the editable area.
 * The raw value stores text with [[EQ:id]] placeholders.
 */
const EquationTextEditor: React.FC<EquationTextEditorProps> = ({
  value,
  equations,
  onValueChange,
  onEquationsChange,
  placeholder = "Type your answer here. Use the button below to insert equations...",
  disabled = false,
  className,
  minHeight = "150px"
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEquation, setEditingEquation] = useState<EquationData | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const savedCursorOffset = useRef<number | null>(null);

  const generateId = () => `eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Get cursor offset as character position in the raw value string
  const getCursorOffsetInValue = useCallback((): number => {
    if (!editorRef.current) return value.length;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return value.length;
    
    const range = sel.getRangeAt(0);
    let offset = 0;
    
    const walk = (node: Node): boolean => {
      if (node === range.startContainer) {
        if (node.nodeType === Node.TEXT_NODE) {
          offset += range.startOffset;
        }
        return true; // found
      }
      if (node.nodeType === Node.TEXT_NODE) {
        offset += (node.textContent || "").length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        if (elem.dataset.eqId) {
          offset += `[[EQ:${elem.dataset.eqId}]]`.length;
        } else if (elem.tagName === "BR") {
          offset += 1;
        } else {
          for (const child of Array.from(elem.childNodes)) {
            if (walk(child)) return true;
          }
        }
      }
      return false;
    };
    
    for (const child of Array.from(editorRef.current.childNodes)) {
      if (walk(child)) break;
    }
    
    return offset;
  }, [value]);

  // Convert raw value (with [[EQ:id]] placeholders) to HTML with rendered KaTeX
  // Render inline $...$ and $$...$$ LaTeX within a plain text segment
  const renderInlineLatex = useCallback((text: string): string => {
    if (!text) return "";
    // Split on $$...$$ (block) and $...$ (inline) patterns
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
    return parts.map(segment => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        const latex = segment.slice(2, -2).trim();
        try {
          const rendered = katex.renderToString(latex, { throwOnError: false, displayMode: true });
          return `<span class="eq-inline-rendered" contenteditable="false" style="display:inline-block;vertical-align:middle;">${rendered}</span>`;
        } catch {
          return segment.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      }
      if (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2) {
        const latex = segment.slice(1, -1).trim();
        try {
          const rendered = katex.renderToString(latex, { throwOnError: false, displayMode: false });
          return `<span class="eq-inline-rendered" contenteditable="false" style="display:inline-block;vertical-align:middle;">${rendered}</span>`;
        } catch {
          return segment.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      }
      // Plain text — escape and preserve newlines
      return segment
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    }).join('');
  }, []);

  const valueToHtml = useCallback((text: string, eqs: EquationData[]): string => {
    if (!text) return "";
    
    const parts = text.split(/(\[\[EQ:[^\]]+\]\])/g);
    return parts.map(part => {
      const match = part.match(/\[\[EQ:([^\]]+)\]\]/);
      if (match) {
        const eqId = match[1];
        const eq = eqs.find(e => e.id === eqId);
        if (eq) {
          try {
            const rendered = katex.renderToString(eq.latex, { 
              throwOnError: false, 
              displayMode: false 
            });
            return `<span class="eq-inline-obj" data-eq-id="${eqId}" contenteditable="false" style="display:inline-block;padding:2px 6px;margin:0 2px;background:hsl(var(--primary)/0.08);border:1px solid hsl(var(--primary)/0.2);border-radius:6px;cursor:pointer;vertical-align:middle;">${rendered}</span>`;
          } catch {
            return `<span class="eq-inline-obj" data-eq-id="${eqId}" contenteditable="false" style="display:inline-block;padding:2px 6px;margin:0 2px;background:hsl(var(--destructive)/0.1);border-radius:6px;color:hsl(var(--destructive));">${eq.latex}</span>`;
          }
        }
        return '';
      }
      // For non-placeholder text, also render $...$ LaTeX inline
      return renderInlineLatex(part);
    }).join('');
  }, [renderInlineLatex]);

  // Extract raw value from the contenteditable HTML
  const htmlToValue = useCallback((el: HTMLDivElement): string => {
    let result = "";
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        if (elem.dataset.eqId) {
          result += `[[EQ:${elem.dataset.eqId}]]`;
        } else if (elem.tagName === "BR") {
          result += "\n";
        } else {
          // Recurse children
          elem.childNodes.forEach(walk);
        }
      }
    };
    el.childNodes.forEach(walk);
    return result;
  }, []);

  // Sync external value → editor HTML
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current) {
      const html = valueToHtml(value || "", equations);
      // Always update if content differs
      editorRef.current.innerHTML = html;
    }
  }, [value, equations, valueToHtml]);

  // Handle input events from contenteditable
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    const raw = htmlToValue(editorRef.current);
    onValueChange(raw);
  }, [htmlToValue, onValueChange]);

  // Handle clicks on equation objects for editing
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const eqEl = target.closest('[data-eq-id]') as HTMLElement | null;
    if (eqEl && eqEl.dataset.eqId && !disabled) {
      const eq = equations.find(eq => eq.id === eqEl.dataset.eqId);
      if (eq) {
        setEditingEquation(eq);
        setIsEditorOpen(true);
      }
    }
  }, [equations, disabled]);

  // Open modal for new equation — save cursor position first
  const handleInsertEquation = () => {
    savedCursorOffset.current = getCursorOffsetInValue();
    setEditingEquation(null);
    setIsEditorOpen(true);
  };

  // Save from modal — insert equation placeholder into value string
  const handleSaveEquation = (data: { latex: string; mathml: string; renderedHtml: string }) => {
    if (editingEquation) {
      // Update existing equation data
      const updatedEqs = equations.map(eq =>
        eq.id === editingEquation.id ? { ...eq, ...data } : eq
      );
      onEquationsChange(updatedEqs);
    } else {
      // Insert new equation at saved cursor position
      const newEquation: EquationData = {
        id: generateId(),
        ...data
      };
      onEquationsChange([...equations, newEquation]);

      const placeholder = `[[EQ:${newEquation.id}]]`;
      const pos = savedCursorOffset.current ?? value.length;
      const before = value.slice(0, pos);
      const after = value.slice(pos);
      isInternalUpdate.current = false; // let useEffect re-render
      onValueChange(before + placeholder + after);
    }

    setIsEditorOpen(false);
    setEditingEquation(null);
  };

  // Handle paste - auto-detect LaTeX and wrap
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // Broader LaTeX detection: commands, dollar delimiters, common patterns
    const isLatex = /\\(frac|sqrt|sum|int|prod|lim|alpha|beta|gamma|delta|theta|pi|sigma|omega|infty|leq|geq|neq|times|div|pm|cdot|left|right|begin|end|overline|underline|hat|bar|vec|dot|tilde|log|ln|sin|cos|tan|sec|csc|cot|partial|nabla|forall|exists|in|cup|cap|subset|supset|mathbb|mathcal|mathbf|mathrm|text)\b/.test(text)
      || /\$[^$]+\$/.test(text)
      || /\$\$[\s\S]+?\$\$/.test(text)
      || /\^{[^}]+}|_{[^}]+}/.test(text);

    if (isLatex && !text.includes('[[EQ:')) {
      // Create an equation object from pasted LaTeX
      const cleanLatex = text.replace(/^\$+|\$+$/g, '').trim();
      const newEq: EquationData = {
        id: generateId(),
        latex: cleanLatex,
        mathml: '',
        renderedHtml: ''
      };
      const pos = getCursorOffsetInValue();
      const newEquations = [...equations, newEq];
      onEquationsChange(newEquations);
      const placeholder = `[[EQ:${newEq.id}]]`;
      const before = value.slice(0, pos);
      const after = value.slice(pos);
      // Don't set isInternalUpdate - let useEffect re-render with new equation
      onValueChange(before + placeholder + after);
      return;
    }

    // Regular text paste — insert via DOM (cursor is active during paste)
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
      handleInput();
    }
  }, [equations, onEquationsChange, getCursorOffsetInValue, handleInput, value, onValueChange]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Inline Editable Area with equations rendered inside */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={handleEditorClick}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className={cn(
            "w-full p-4 rounded-xl border-2 border-border bg-background text-foreground text-base",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20",
            "transition-all duration-200",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
            disabled && "opacity-60 cursor-not-allowed bg-muted"
          )}
          style={{
            minHeight,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: "'Segoe UI', 'Arial', sans-serif",
          }}
        />
      </div>

      {/* Insert Equation Button */}
      {!disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInsertEquation}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Insert Equation
          </Button>
        </motion.div>
      )}

      {/* Equation Editor Modal */}
      <EquationEditorModal
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        initialLatex={editingEquation?.latex || ''}
        onSave={handleSaveEquation}
      />
    </div>
  );
};

export default EquationTextEditor;
