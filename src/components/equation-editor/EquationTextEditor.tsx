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

  const generateId = () => `eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Convert raw value (with [[EQ:id]] placeholders) to HTML with rendered KaTeX
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
        return ''; // equation not found, skip
      }
      // Regular text — escape HTML and preserve newlines
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    }).join('');
  }, []);

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
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
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

  // Insert a rendered equation span at the current cursor position
  const insertEquationAtCursor = useCallback((eq: EquationData) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    let rendered: string;
    try {
      rendered = katex.renderToString(eq.latex, { throwOnError: false, displayMode: false });
    } catch {
      rendered = eq.latex;
    }

    const span = document.createElement('span');
    span.className = 'eq-inline-obj';
    span.dataset.eqId = eq.id;
    span.contentEditable = 'false';
    span.style.cssText = 'display:inline-block;padding:2px 6px;margin:0 2px;background:hsl(var(--primary)/0.08);border:1px solid hsl(var(--primary)/0.2);border-radius:6px;cursor:pointer;vertical-align:middle;';
    span.innerHTML = rendered;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(span);

      // Move cursor after the inserted equation
      const spaceNode = document.createTextNode('\u200B'); // zero-width space
      range.setStartAfter(span);
      range.insertNode(spaceNode);
      range.setStartAfter(spaceNode);
      range.setEndAfter(spaceNode);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current.appendChild(span);
    }

    handleInput();
  }, [handleInput]);

  // Open modal for new equation
  const handleInsertEquation = () => {
    setEditingEquation(null);
    setIsEditorOpen(true);
  };

  // Save from modal
  const handleSaveEquation = (data: { latex: string; mathml: string; renderedHtml: string }) => {
    if (editingEquation) {
      // Update existing equation
      const updatedEqs = equations.map(eq =>
        eq.id === editingEquation.id ? { ...eq, ...data } : eq
      );
      onEquationsChange(updatedEqs);
      
      // Re-render the updated equation in the editor
      if (editorRef.current) {
        const eqEl = editorRef.current.querySelector(`[data-eq-id="${editingEquation.id}"]`);
        if (eqEl) {
          try {
            eqEl.innerHTML = katex.renderToString(data.latex, { throwOnError: false, displayMode: false });
          } catch {
            eqEl.textContent = data.latex;
          }
        }
      }
    } else {
      // Insert new equation
      const newEquation: EquationData = {
        id: generateId(),
        ...data
      };
      onEquationsChange([...equations, newEquation]);
      insertEquationAtCursor(newEquation);
    }

    setIsEditorOpen(false);
    setEditingEquation(null);
  };

  // Handle paste - auto-detect LaTeX and wrap
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // If it looks like raw LaTeX, insert as equation
    if (/\\(frac|sqrt|sum|int|alpha|beta|gamma|pi|theta|sigma|infty|leq|geq|neq|times|div|pm)\b/.test(text) && !text.includes('[[EQ:')) {
      const newEq: EquationData = {
        id: generateId(),
        latex: text.replace(/^\$+|\$+$/g, ''), // strip $ wrappers
        mathml: '',
        renderedHtml: ''
      };
      onEquationsChange([...equations, newEq]);
      insertEquationAtCursor(newEq);
      return;
    }

    // Regular text paste
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
  }, [equations, onEquationsChange, insertEquationAtCursor, handleInput]);

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
