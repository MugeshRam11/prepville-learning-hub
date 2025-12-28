import React, { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Image as ImageIcon, Menu, Undo, Redo, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import copy from "copy-to-clipboard";
import html2canvas from "html2canvas";

// DOMPurify configuration for equation editor
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['span', 'div', 'br', 'sup', 'sub', 'strong', 'em'],
  ALLOWED_ATTR: ['class', 'style', 'contenteditable'],
};

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Sanitize HTML content
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
};

export default function EquationEditor({ value, onChange, placeholder, className }: EquationEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Common symbols
  const symbols = [
    { label: 'α', value: 'α' },
    { label: 'β', value: 'β' },
    { label: 'γ', value: 'γ' },
    { label: 'π', value: 'π' },
    { label: '∞', value: '∞' },
    { label: '∂', value: '∂' },
    { label: '∇', value: '∇' },
    { label: '≤', value: '≤' },
    { label: '≥', value: '≥' },
    { label: '≠', value: '≠' },
    { label: '±', value: '±' },
    { label: '÷', value: '÷' },
    { label: '×', value: '×' },
    { label: '·', value: '·' },
  ];
  
  // Handle input in contentEditable div
  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const content = editor.innerHTML || "";
    onChange(content);
  };

  // Insert formatted content at cursor
  const insertAtCursor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.innerHTML += html;
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(html);
      range.insertNode(fragment);
      
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
  };

  // Handle keyboard in editable fields
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const editor = editorRef.current;
    if (!editor) return;
    
    if (e.key === 'Tab') {
      e.preventDefault();

      // Find all editable elements
      const editables = Array.from(editor.querySelectorAll('[contenteditable="true"]'));
      const currentIndex = editables.indexOf(target);

      if (currentIndex !== -1) {
        // Move to next field, or exit to main editor if it's the last one
        if (currentIndex < editables.length - 1) {
          const nextElement = editables[currentIndex + 1] as HTMLElement;
          nextElement.focus();
          
          // Select all content in the next field
          const range = document.createRange();
          range.selectNodeContents(nextElement);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        } else {
          // Last field - exit to main editor
          const lastEditableParent = target.closest('.inline-block, span');
          if (lastEditableParent) {
            const selection = window.getSelection();
            const range = document.createRange();
            
            // Create a text node after the element if needed
            if (!lastEditableParent.nextSibling) {
              const textNode = document.createTextNode('\u00A0');
              lastEditableParent.parentNode?.appendChild(textNode);
            }
            
            range.setStartAfter(lastEditableParent);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
          editor.focus();
        }
      }
    }
  };

  // Handle focus on editable fields - clear □ placeholder and select all
  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    
    // Only handle if it's a contenteditable element
    if (target.getAttribute('contenteditable') === 'true' && target !== editorRef.current) {
      const text = target.textContent || '';
      
      // Clear placeholder
      if (text === '□') {
        target.textContent = '';
      }
      
      // Select all content after a brief delay
      setTimeout(() => {
        if (target.textContent) {
          const range = document.createRange();
          range.selectNodeContents(target);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 0);
    }
  };

  // Template insertions
  const insertFraction = () => {
    insertAtCursor(`
      <span class="inline-block mx-1 bg-transparent" style="vertical-align: middle;">
        <span class="math-fraction flex flex-col items-center gap-0">
          <span contenteditable="true" class="text-center min-w-[30px] focus:outline-none focus:bg-blue-50 text-lg px-2" style="border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px;">□</span>
          <span contenteditable="true" class="text-center min-w-[30px] focus:outline-none focus:bg-blue-50 text-lg px-2">□</span>
        </span>
      </span>&nbsp;
    `);
  };


  const insertPower = () => {
    insertAtCursor('<sup contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-0.5" style="font-size: 0.75em; vertical-align: super; line-height: 0;">□</sup>&nbsp;');
  };

  const insertSubscript = () => {
    insertAtCursor('<sub contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-0.5" style="font-size: 0.75em; vertical-align: sub; line-height: 0;">□</sub>&nbsp;');
  };

  const insertSquareRoot = () => {
    insertAtCursor('<span class="mx-1">√<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1" style="text-decoration: overline;">□</span></span>&nbsp;');
  };

  const insertNthRoot = () => {
    insertAtCursor('<span class="mx-1"><sup contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-0.5" style="font-size: 0.75em; vertical-align: super;">□</sup>√<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1" style="text-decoration: overline;">□</span></span>&nbsp;');
  };

  const insertSum = () => {
    insertAtCursor('<span class="text-2xl">∑</span>');
  };

  const insertIntegral = () => {
    insertAtCursor('<span class="text-2xl">∫</span>');
  };

  const insertLimit = () => {
    insertAtCursor('<span class="mx-1">lim<sub contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-0.5" style="font-size: 0.75em; vertical-align: sub;">□</sub></span>&nbsp;');
  };

  const insertAbsoluteValue = () => {
    insertAtCursor('|<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1">x</span>|&nbsp;');
  };

  const insertLogarithm = () => {
    insertAtCursor('<span class="mx-1">log<sub contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-0.5" style="font-size: 0.75em; vertical-align: sub;">a</sub>(<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1">x</span>)</span>&nbsp;');
  };

  const insertDerivative = () => {
    insertAtCursor('<span class="mx-1"><span class="inline-flex flex-col items-center" style="vertical-align: middle;"><span style="border-bottom: 1px solid #000; padding-bottom: 2px;">d</span><span>dx</span></span> f(x)</span>&nbsp;');
  };

  const insertProduct = () => {
    insertAtCursor('<span class="text-2xl mx-1">∏</span>&nbsp;');
  };

  const insertModulus = () => {
    insertAtCursor('|<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1">z</span>|&nbsp;');
  };

  const insertArgument = () => {
    insertAtCursor('arg(<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1">z</span>)&nbsp;');
  };

  const insertRealPart = () => {
    insertAtCursor('ℜ(<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1">z</span>)&nbsp;');
  };

  const insertImaginaryPart = () => {
    insertAtCursor('ℑ(<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1">z</span>)&nbsp;');
  };

  const insertConjugate = () => {
    insertAtCursor('<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1" style="text-decoration: overline;">z</span>&nbsp;');
  };


  // Update editor content when value changes externally
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = sanitizeHtml(value);
    }
  }, [value]);

  const handleCopyText = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    copy(editor.textContent || "");
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const handleCopyLatex = () => {
    copy(value);
    toast({
      title: "LaTeX copied",
      description: "LaTeX code copied to clipboard",
    });
  };

  const insertSymbol = (symbol: string) => {
    insertAtCursor(symbol);
  };

  const handleCopyPNG = () => {
    if (!editorRef.current) {
      toast({
        title: "No content",
        description: "Enter some content first",
        variant: "destructive"
      });
      return;
    }

    html2canvas(editorRef.current, { backgroundColor: "#ffffff", scale: 2 }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (navigator.clipboard && typeof (navigator.clipboard as any).write === 'function') {
          const item = new ClipboardItem({ [blob.type]: blob });
          (navigator.clipboard as any).write([item]).then(() => {
            toast({
              title: "PNG copied",
              description: "Image copied to clipboard",
            });
          }).catch(() => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'equation.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast({
              title: "PNG downloaded",
              description: "File downloaded",
            });
          });
        }
      });
    });
  };

  return (
    <div className={className}>
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Word-like Math Editor</Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Redo className="h-4 w-4" />
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-[80vh] overflow-y-auto bg-background">
                {/* Math Functions */}
                <DropdownMenuLabel className="text-muted-foreground text-xs">Math Functions</DropdownMenuLabel>
                <DropdownMenuItem onClick={insertAbsoluteValue} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">|x|</span>
                    <span className="text-sm">Absolute Value</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertNthRoot} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">ⁿ√x</span>
                    <span className="text-sm">nᵗʰ Root</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertLogarithm} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">log<sub>a</sub>(x)</span>
                    <span className="text-sm">Logarithm base a</span>
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Calculus */}
                <DropdownMenuLabel className="text-muted-foreground text-xs">Calculus</DropdownMenuLabel>
                <DropdownMenuItem onClick={insertDerivative} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">d/dx f(x)</span>
                    <span className="text-sm">Derivative</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertDerivative} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">dⁿ/dxⁿ f(x)</span>
                    <span className="text-sm">nᵗʰ derivative</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertIntegral} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">∫</span>
                    <span className="text-sm">Integral</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertSum} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">∑</span>
                    <span className="text-sm">Sum</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertProduct} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">∏</span>
                    <span className="text-sm">Product</span>
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Complex Numbers */}
                <DropdownMenuLabel className="text-muted-foreground text-xs">Complex Numbers</DropdownMenuLabel>
                <DropdownMenuItem onClick={insertModulus} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">|z|</span>
                    <span className="text-sm">Modulus</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertArgument} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">arg(z)</span>
                    <span className="text-sm">Argument</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertRealPart} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">ℜ(z)</span>
                    <span className="text-sm">Real Part</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertImaginaryPart} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">ℑ(z)</span>
                    <span className="text-sm">Imaginary Part</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={insertConjugate} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-sm" style={{textDecoration: 'overline'}}>z</span>
                    <span className="text-sm">Conjugate</span>
                  </span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Insert Menu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Insert</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={insertFraction}>Fraction</DropdownMenuItem>
                    <DropdownMenuItem onClick={insertPower}>Power</DropdownMenuItem>
                    <DropdownMenuItem onClick={insertSubscript}>Subscript</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {/* Formatting */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Font Style</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Bold</DropdownMenuItem>
                    <DropdownMenuItem>Italic</DropdownMenuItem>
                    <DropdownMenuItem>Normal</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                {/* Edit Actions */}
                <DropdownMenuItem className="flex justify-between">
                  <span>Cut</span>
                  <span className="text-xs text-muted-foreground">Ctrl+X</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyText} className="flex justify-between">
                  <span>Copy</span>
                  <span className="text-xs text-muted-foreground">Ctrl+C</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex justify-between">
                  <span>Paste</span>
                  <span className="text-xs text-muted-foreground">Ctrl+V</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex justify-between">
                  <span>Select All</span>
                  <span className="text-xs text-muted-foreground">Ctrl+A</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem>
                  Save Draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Math Templates */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Math Templates</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={insertFraction}
                className="h-9 px-4 text-sm"
              >
                Fraction
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertPower}
                className="h-9 px-4 text-sm"
              >
                Power
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertSubscript}
                className="h-9 px-4 text-sm"
              >
                Subscript
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertSquareRoot}
                className="h-9 px-4 text-sm"
              >
                Square Root
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertNthRoot}
                className="h-9 px-4 text-sm"
              >
                Nth Root
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertSum}
                className="h-9 px-4 text-sm"
              >
                Sum
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertIntegral}
                className="h-9 px-4 text-sm"
              >
                Integral
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertLimit}
                className="h-9 px-4 text-sm"
              >
                Limit
              </Button>
            </div>
          </div>

          {/* WYSIWYG Editor */}
          <div className="space-y-2">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocusCapture={handleFocusCapture}
              className="w-full min-h-[120px] p-4 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-lg empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
              data-placeholder=""
              style={{ 
                fontFamily: '"Segoe UI", Arial, sans-serif, "Segoe UI Symbol", "Apple Color Emoji"',
                lineHeight: '2.2'
              }}
              suppressContentEditableWarning
            />
          </div>

          {/* Symbols Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Symbols</label>
            <div className="flex flex-wrap gap-2">
              {symbols.map((symbol) => (
                <Button
                  key={symbol.value}
                  variant="outline"
                  size="sm"
                  onClick={() => insertSymbol(symbol.value)}
                  className="h-9 w-9 p-0 text-base"
                >
                  {symbol.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="h-8 px-3 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLatex}
                className="h-8 px-3 text-xs"
              >
                LaTeX
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPNG}
                className="h-8 px-3 text-xs"
              >
                Unicode
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8 px-3 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </div>

          {showPreview && (
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">Preview:</div>
              <div className="p-2 bg-background rounded border">
                {editorRef.current?.innerHTML || 'No content'}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div className="flex items-start gap-1">
              <span className="text-orange-500">✨</span>
              <span>Copy equations from Word or type directly. Fractions, powers, roots work visually.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
