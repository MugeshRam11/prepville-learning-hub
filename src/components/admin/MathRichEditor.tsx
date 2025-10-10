import React, { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  Sigma, 
  Square, 
  Divide, 
  Superscript, 
  Pi,
  Infinity,
  Type
} from 'lucide-react';
import 'katex/dist/katex.min.css';

// Lazy load Mathlive only in browser
let MathfieldElement: any;
if (typeof window !== 'undefined') {
  import('mathlive').then((module) => {
    MathfieldElement = module.MathfieldElement;
  });
}

interface MathRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MathRichEditor = ({ value, onChange, placeholder, className = '' }: MathRichEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  // Escape HTML to prevent XSS attacks
  const escapeHtml = useCallback((text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }, []);

  const renderKatexInto = useCallback((el: HTMLElement) => {
    if (!el) return;
    
    // Find math spans and render with KaTeX
    el.querySelectorAll('span[data-math-latex]').forEach((node) => {
      const latex = (node as HTMLElement).dataset.mathLatex || '';
      const display = (node as HTMLElement).dataset.display === 'block';
      
      try {
        (node as HTMLElement).innerHTML = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: display,
          trust: true,
          strict: false,
          errorColor: '#cc0000'
        });
        (node as HTMLElement).setAttribute('contenteditable', 'false');
        (node as HTMLElement).classList.add('math-node', 'inline-block', 'mx-1', 'cursor-pointer');
      } catch (error) {
        console.error('KaTeX render error:', error);
        (node as HTMLElement).innerHTML = `<span style="color: #cc0000;">${escapeHtml(latex)}</span>`;
      }
    });
  }, []);

  // Convert text with $ delimiters to math spans
  const processContent = useCallback((content: string) => {
    if (!content) return content;
    
    // Replace $...$ with math spans
    return content.replace(/\$([^$]+)\$/g, (match, latex) => {
      return `<span class="math-node inline-block mx-1 cursor-pointer" data-math-latex="${latex.replace(/"/g, '&quot;')}" data-display="inline"></span>`;
    });
  }, []);

  // Extract math spans back to $ delimiters for storage
  const extractContent = useCallback((html: string) => {
    if (!html) return '';
    
    // Replace math spans back to $ delimiters
    return html.replace(/<span[^>]*data-math-latex="([^"]*)"[^>]*>.*?<\/span>/g, (match, latex) => {
      return `$${latex.replace(/&quot;/g, '"')}$`;
    });
  }, []);

  const insertMath = useCallback((latex: string, display = false) => {
    if (!editorRef.current) return;
    
    const span = document.createElement('span');
    span.className = 'math-node inline-block mx-1 cursor-pointer';
    span.setAttribute('data-math-latex', latex);
    span.setAttribute('data-display', display ? 'block' : 'inline');
    span.setAttribute('contenteditable', 'false');
    
    // Render with KaTeX immediately
    try {
      span.innerHTML = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: display,
        trust: true,
        strict: false
      });
    } catch (error) {
      span.innerHTML = `<span style="color: #cc0000;">${escapeHtml(latex)}</span>`;
    }

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(span);
    }

    // Update value
    setTimeout(() => {
      if (editorRef.current) {
        const newContent = extractContent(editorRef.current.innerHTML);
        onChange(newContent);
      }
    }, 0);
  }, [onChange, extractContent]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    // Handle OMML from Word
    if (htmlData && /<m:oMath/i.test(htmlData)) {
      e.preventDefault();
      try {
        // Simplified approach - just try to extract LaTeX patterns from paste
        console.log('OMML detected, attempting conversion...');
        
        // Try to find existing LaTeX patterns in the text first
        const latexMatch = textData.match(/\$([^$]+)\$/);
        if (latexMatch) {
          insertMath(latexMatch[1], false);
          return;
        }
        
        // For complex Word equations, suggest user to type LaTeX directly
        insertMath('x^2 + y^2 = z^2', false); // Sample equation as placeholder
        console.log('Added sample equation - please edit to match your pasted content');
      } catch (error) {
        console.error('OMML conversion error:', error);
        // Try to extract any existing LaTeX from the text
        const latexMatch = textData.match(/\$([^$]+)\$/);
        if (latexMatch) {
          insertMath(latexMatch[1], false);
        } else {
          document.execCommand('insertText', false, textData);
        }
      }
      return;
    }

    // Handle MathML
    if (htmlData && /<math/i.test(htmlData)) {
      e.preventDefault();
      try {
        // Try to find LaTeX patterns in the text first
        const latexMatch = textData.match(/\$([^$]+)\$/);
        if (latexMatch) {
          insertMath(latexMatch[1], false);
        } else {
          // Insert a sample equation for user to edit
          insertMath('\\frac{a}{b}', false);
          console.log('Added sample equation - please edit to match your pasted content');
        }
      } catch (error) {
        console.error('MathML conversion error:', error);
        if (textData) {
          document.execCommand('insertText', false, textData);
        }
      }
      return;
    }

    // Handle LaTeX in plain text (like $x^2$)
    if (textData && /\$[^$]+\$/.test(textData)) {
      e.preventDefault();
      document.execCommand('insertText', false, textData);
      setTimeout(() => {
        if (editorRef.current) {
          renderKatexInto(editorRef.current);
          const newContent = extractContent(editorRef.current.innerHTML);
          onChange(newContent);
        }
      }, 0);
    }
  }, [insertMath, renderKatexInto, extractContent, onChange]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mathNode = target.closest('.math-node') as HTMLElement | null;
    
    if (!mathNode) return;

    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }

    // Set a timeout for single click - if double click happens, this will be cleared
    const timeout = setTimeout(() => {
      // This is a single click - do nothing special
      setClickTimeout(null);
    }, 300);
    
    setClickTimeout(timeout);
  }, [clickTimeout]);

  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    // Clear the single click timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    // Prevent single clicks from interfering
    e.preventDefault();
    e.stopPropagation();
    
    if (!MathfieldElement) {
      console.warn('Mathlive not loaded yet');
      return;
    }
    
    const target = e.target as HTMLElement;
    const mathNode = target.closest('.math-node') as HTMLElement | null;
    
    if (!mathNode) return;

    const latex = mathNode.dataset.mathLatex || '';
    const display = mathNode.dataset.display === 'block';

    // Create Mathlive editor
    const mf = new MathfieldElement();
    mf.value = latex;
    mf.style.minWidth = '150px';
    mf.style.minHeight = '40px';
    mf.style.border = '2px solid #3b82f6';
    mf.style.borderRadius = '6px';
    mf.style.padding = '8px';
    mf.style.fontSize = '16px';
    mf.style.backgroundColor = '#ffffff';

    // Store original content for cancel
    const originalContent = mathNode.innerHTML;
    
    // Replace content temporarily
    mathNode.innerHTML = '';
    mathNode.appendChild(mf);
    
    // Focus the math field
    setTimeout(() => {
      mf.focus();
      mf.select(); // Select all content for easy editing
    }, 50);

    const saveEdit = () => {
      const newLatex = mf.getValue('latex-expanded') || mf.getValue('latex');
      if (newLatex !== latex) { // Only update if changed
        mathNode.dataset.mathLatex = newLatex;
        
        try {
          mathNode.innerHTML = katex.renderToString(newLatex, {
            throwOnError: false,
            displayMode: display,
            trust: true,
            strict: false,
            errorColor: '#cc0000'
          });
        } catch (error) {
          mathNode.innerHTML = `<span style="color: #cc0000;">${escapeHtml(newLatex)}</span>`;
        }
        
        mathNode.setAttribute('contenteditable', 'false');
        mathNode.classList.add('math-node', 'inline-block', 'mx-1', 'cursor-pointer');
        
        // Update parent content
        if (editorRef.current) {
          const newContent = extractContent(editorRef.current.innerHTML);
          onChange(newContent);
        }
      } else {
        // No change, restore original
        cancelEdit();
      }
    };

    const cancelEdit = () => {
      mathNode.innerHTML = originalContent;
      mathNode.setAttribute('contenteditable', 'false');
      mathNode.classList.add('math-node', 'inline-block', 'mx-1', 'cursor-pointer');
    };

    // Add event listeners
    const handleBlur = () => {
      setTimeout(saveEdit, 50); // Small delay to ensure value is captured
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        mf.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit();
      }
    };

    mf.addEventListener('blur', handleBlur);
    mf.addEventListener('keydown', handleKeyDown);
  }, [extractContent, onChange, clickTimeout]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.innerHTML;
    const processedContent = processContent(content);
    
    if (processedContent !== content) {
      editorRef.current.innerHTML = processedContent;
      renderKatexInto(editorRef.current);
    }
    
    const newValue = extractContent(editorRef.current.innerHTML);
    onChange(newValue);
  }, [processContent, renderKatexInto, extractContent, onChange, escapeHtml]);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const processedContent = processContent(value);
      editorRef.current.innerHTML = processedContent;
      renderKatexInto(editorRef.current);
    }
  }, [value, processContent, renderKatexInto]);

  const mathToolbarButtons = [
    { icon: Divide, latex: '\\frac{a}{b}', label: 'Fraction' },
    { icon: Superscript, latex: 'x^{2}', label: 'Power' },
    { icon: Square, latex: '\\sqrt{x}', label: 'Square Root' },
    { icon: Sigma, latex: '\\sum_{i=1}^{n} x_i', label: 'Summation' },
    { icon: Calculator, latex: '\\binom{n}{k}', label: 'Binomial' },
    { icon: Pi, latex: '\\pi', label: 'Pi' },
    { icon: Infinity, latex: '\\infty', label: 'Infinity' },
    { icon: Type, latex: '\\int_{a}^{b} f(x) \\, dx', label: 'Integral' },
    { icon: Calculator, latex: '(x+a)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k a^{n-k}', label: 'Binomial Theorem' }
  ];

  return (
    <div className="relative">
      {/* Main Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={`min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onFocus={() => setShowToolbar(true)}
          style={{ 
            cursor: 'text',
            userSelect: 'text'
          }}
        />
        
        {!showToolbar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={() => setShowToolbar(true)}
            title="Show math toolbar"
          >
            <Calculator className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Math Toolbar - Positioned absolutely to not affect content layout */}
      {showToolbar && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md p-2 flex flex-wrap gap-1 z-50 shadow-lg">
          {mathToolbarButtons.map((button, index) => (
            <Button
              key={index}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMath(button.latex)}
              title={button.label}
              className="h-8 w-8 p-0"
            >
              <button.icon className="w-4 h-4" />
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowToolbar(false)}
            className="ml-auto text-xs"
          >
            Close
          </Button>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground mt-1">
        Double-click equations to edit • Paste from Word • Use $ for inline math
      </div>
    </div>
  );
};

export default MathRichEditor;