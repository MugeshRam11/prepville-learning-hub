import React, { useEffect, useRef, useState } from "react";
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
} from "@/components/ui/dropdown-menu";
import copy from "copy-to-clipboard";
import html2canvas from "html2canvas";

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      // Find all editable elements
      const editables = editor.querySelectorAll('[contenteditable="true"]');
      const currentElement = document.activeElement;
      const currentIndex = Array.from(editables).indexOf(currentElement as Element);

      if (currentIndex !== -1 && currentIndex < editables.length - 1) {
        const nextElement = editables[currentIndex + 1] as HTMLElement;
        nextElement.focus();
        
        // Select all content in the next field
        const range = document.createRange();
        range.selectNodeContents(nextElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  // Template insertions
  const insertFraction = () => {
    insertAtCursor(`
      <span class="inline-flex flex-col items-center mx-1" style="vertical-align: middle;">
        <span contenteditable="true" class="px-2 text-center min-w-[20px] focus:outline-none focus:bg-blue-50" style="border-bottom: 2px solid currentColor;">1</span>
        <span contenteditable="true" class="px-2 text-center min-w-[20px] focus:outline-none focus:bg-blue-50">9</span>
      </span>
    `);
  };


  const insertPower = () => {
    insertAtCursor('<sup contenteditable="true" class="text-sm focus:outline-none focus:bg-blue-50 px-1">2</sup>');
  };

  const insertSubscript = () => {
    insertAtCursor('<sub contenteditable="true" class="text-sm focus:outline-none focus:bg-blue-50 px-1">n</sub>');
  };

  const insertSquareRoot = () => {
    insertAtCursor('<span class="mx-1">√<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1" style="text-decoration: overline;">x</span></span>');
  };

  const insertNthRoot = () => {
    insertAtCursor('<span class="mx-1"><sup contenteditable="true" class="text-sm focus:outline-none focus:bg-blue-50 px-1">n</sup>√<span contenteditable="true" class="focus:outline-none focus:bg-blue-50 px-1" style="text-decoration: overline;">x</span></span>');
  };

  const insertSum = () => {
    insertAtCursor('<span class="text-2xl">∑</span>');
  };

  const insertIntegral = () => {
    insertAtCursor('<span class="text-2xl">∫</span>');
  };

  const insertLimit = () => {
    insertAtCursor('<span class="mx-1">lim<sub contenteditable="true" class="text-sm focus:outline-none focus:bg-blue-50 px-1">x→0</sub></span>');
  };

  const insertMatrix = () => {
    insertAtCursor(`
      <span class="inline-grid grid-cols-2 gap-3 p-3 border-2 border-current rounded mx-1">
        <span contenteditable="true" class="focus:outline-none focus:bg-blue-50 text-center">a</span>
        <span contenteditable="true" class="focus:outline-none focus:bg-blue-50 text-center">b</span>
        <span contenteditable="true" class="focus:outline-none focus:bg-blue-50 text-center">c</span>
        <span contenteditable="true" class="focus:outline-none focus:bg-blue-50 text-center">d</span>
      </span>
    `);
  };

  // Update editor content when value changes externally
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value;
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={insertMatrix}>
                  Insert Matrix
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyText}>
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLatex}>
                  Copy LaTeX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyPNG}>
                  Copy as PNG
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
              <Button
                variant="outline"
                size="sm"
                onClick={insertMatrix}
                className="h-9 px-4 text-sm"
              >
                Matrix
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
              className="w-full min-h-[120px] p-4 border-2 border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-lg"
              style={{ 
                fontFamily: '"Segoe UI", Arial, sans-serif, "Segoe UI Symbol", "Apple Color Emoji"',
                lineHeight: '2.2'
              }}
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: value || '<span class="text-muted-foreground">Type here or click buttons above...</span>' }}
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
