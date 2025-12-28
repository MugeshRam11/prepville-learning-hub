import React, { useEffect, useRef, useState } from "react";
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
import "mathlive";

// MathLive type declarations
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': any;
    }
  }
}

// DOMPurify configuration for rich text editors
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div', 'ul', 'ol', 'li', 'sup', 'sub', 'font'],
  ALLOWED_ATTR: ['style', 'class', 'data-latex', 'contenteditable', 'face', 'size', 'color'],
  ALLOW_DATA_ATTR: true,
};

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
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [currentFont, setCurrentFont] = useState("Arial");
  const [currentSize, setCurrentSize] = useState("16px");
  const isUpdatingRef = useRef(false);

  // Sanitize HTML content before setting
  const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, PURIFY_CONFIG);
  };

  // Only set initial value once on mount
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = sanitizeHtml(value || '');
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
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

  const insertMath = () => {
    setShowMathEditor(true);
  };

  const handleMathInsert = (latex: string) => {
    if (editorRef.current && latex) {
      isUpdatingRef.current = true;
      
      const mathSpan = document.createElement('span');
      mathSpan.className = 'math-expression';
      mathSpan.setAttribute('data-latex', latex);
      mathSpan.innerHTML = `\\(${latex}\\)`;
      mathSpan.style.cssText = 'background: #f0f0f0; padding: 2px 6px; margin: 0 2px; border-radius: 4px; font-family: "Times New Roman", serif;';
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(mathSpan);
        range.setStartAfter(mathSpan);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
        handleInput();
      }, 0);
    }
    setShowMathEditor(false);
  };

  const fonts = [
    "Arial",
    "Times New Roman",
    "Georgia",
    "Verdana",
    "Courier New",
    "Comic Sans MS",
    "Impact",
    "Trebuchet MS"
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
              <Select value={currentFont} onValueChange={(value) => {
                setCurrentFont(value);
                execCommand('fontName', value);
              }}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map(font => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Font Size */}
              <Select value={currentSize} onValueChange={(value) => {
                setCurrentSize(value);
                execCommand('fontSize', '7');
                // Apply custom size via style
                const selection = window.getSelection();
                if (selection) {
                  const parent = selection.anchorNode?.parentElement;
                  if (parent) parent.style.fontSize = value;
                }
              }}>
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map(size => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-6 bg-border" />

              {/* Text Formatting */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('bold')}
                  className="h-9 w-9 p-0"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('italic')}
                  className="h-9 w-9 p-0"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('underline')}
                  className="h-9 w-9 p-0"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Alignment */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('justifyLeft')}
                  className="h-9 w-9 p-0"
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('justifyCenter')}
                  className="h-9 w-9 p-0"
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('justifyRight')}
                  className="h-9 w-9 p-0"
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Lists */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('insertUnorderedList')}
                  className="h-9 w-9 p-0"
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('insertOrderedList')}
                  className="h-9 w-9 p-0"
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Undo/Redo */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('undo')}
                  className="h-9 w-9 p-0"
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execCommand('redo')}
                  className="h-9 w-9 p-0"
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Math & Symbols */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertMath}
                  className="h-9 px-3"
                  title="Insert Math"
                >
                  <Type className="h-4 w-4 mr-1" />
                  Math
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                  className="h-9 px-3"
                  title="Insert Symbol"
                >
                  Σ
                </Button>
              </div>
            </div>

            {/* Symbol Picker */}
            {showSymbolPicker && (
              <div className="mt-3 pt-3 border-t">
                <SymbolPicker onSelect={(symbol) => {
                  insertSymbol(symbol);
                  setShowSymbolPicker(false);
                }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
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
                <h4 className="font-semibold">Insert Math Expression</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMathEditor(false)}
                >
                  Cancel
                </Button>
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
              <Button
                onClick={() => {
                  if (mathfieldRef.current) {
                    handleMathInsert(mathfieldRef.current.getValue());
                  }
                }}
                className="w-full"
              >
                Insert Math
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}