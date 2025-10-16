import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "katex/dist/katex.min.css";
import renderToString from "katex/dist/katex.mjs";
import copy from "copy-to-clipboard";
import html2canvas from "html2canvas";

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function EquationEditor({ value, onChange, placeholder, className }: EquationEditorProps) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [lastValidHtml, setLastValidHtml] = useState("");
  const [hasError, setHasError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Preserve caret position to fix "auto selecting" issue
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd, value: newValue } = e.target;
    onChange(newValue);

    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (node) {
        node.selectionStart = selectionStart;
        node.selectionEnd = selectionEnd;
      }
    });
  };

  const renderKaTeX = (tex: string) => {
    if (!tex) {
      setPreviewHtml("");
      setHasError(false);
      return;
    }

    try {
      const html = renderToString(tex, {
        throwOnError: false,
        displayMode: true,
        strict: "ignore",
        errorColor: "#ff4d4f",
      });

      // Check if KaTeX rendered an error
      if (html.includes('katex-error') || html.includes('ParseError')) {
        setHasError(true);
        setPreviewHtml(lastValidHtml || `<div style="color:#ff4d4f;">Invalid LaTeX syntax – showing last valid preview</div>`);
      } else {
        setHasError(false);
        setPreviewHtml(html);
        setLastValidHtml(html);
      }
    } catch (err) {
      setHasError(true);
      setPreviewHtml(lastValidHtml || `<div style="color:#ff4d4f;">Invalid LaTeX syntax</div>`);
    }
  };

  useEffect(() => {
    renderKaTeX(value);
  }, [value]);

  const handleCopyLatex = () => {
    copy(value);
    toast({
      title: "LaTeX copied",
      description: "Content has been copied to clipboard",
    });
  };

  const handleCopyPNG = () => {
    if (!previewRef.current || !previewHtml) {
      toast({
        title: "No preview available",
        description: "Enter some math content first",
        variant: "destructive"
      });
      return;
    }

    html2canvas(previewRef.current, { backgroundColor: null, scale: 2 }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (navigator.clipboard && typeof (navigator.clipboard as any).write === 'function') {
          const item = new ClipboardItem({ [blob.type]: blob });
          (navigator.clipboard as any).write([item]).then(() => {
            toast({
              title: "PNG copied",
              description: "Image has been copied to clipboard",
            });
          }).catch(() => {
            // Fallback: download
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
              description: "Clipboard not available, file downloaded instead",
            });
          });
        } else {
          // Fallback: download
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
            description: "File has been downloaded",
          });
        }
      });
    }).catch((e) => {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to generate PNG",
        variant: "destructive"
      });
    });
  };

  return (
    <div className={className}>
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">Math Editor with Export Options</Badge>
            {hasError && (
              <Badge variant="destructive" className="text-xs">Invalid Syntax</Badge>
            )}
            {!hasError && value && (
              <Badge variant="secondary" className="text-xs">✓ Valid</Badge>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Type or paste LaTeX:</label>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInput}
              rows={4}
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              placeholder={placeholder || "e.g. \\frac{a}{b}, x^2, \\sqrt{x}"}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLatex}
              className="h-8 px-3 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy LaTeX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPNG}
              className="h-8 px-3 text-xs"
            >
              <ImageIcon className="h-3 w-3 mr-1" />
              Copy PNG
            </Button>
          </div>

          {previewHtml && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Rendered Preview:</label>
              <div
                ref={previewRef}
                className={`p-4 border rounded-md bg-background min-h-[64px] overflow-x-auto ${hasError ? 'border-red-200 bg-red-50/30' : 'border-border'}`}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div><strong>💡 Quick Tips:</strong></div>
            <div>• Fractions: \frac{"{"} a {"}"}{"{"} b {"}"}, Powers: x^{"{"} n {"}"}, Roots: \sqrt{"{"} x {"}"}</div>
            <div>• Plain text: \text{"{"} your text {"}"}</div>
            <div>• <strong>For Word:</strong> Copy PNG to paste as image</div>
            <div>• If input is invalid, last valid render stays visible</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
