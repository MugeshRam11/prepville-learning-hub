import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Undo, 
  Redo, 
  Eye, 
  Save, 
  Copy, 
  Code, 
  Type,
  Image as ImageIcon,
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (url: string) => void;
  placeholder?: string;
}

const MATH_TEMPLATES = [
  { label: "Fraction", insert: "\\frac{numerator}{denominator}" },
  { label: "Power", insert: "x^{power}" },
  { label: "Subscript", insert: "x_{subscript}" },
  { label: "Square Root", insert: "\\sqrt{value}" },
  { label: "Nth Root", insert: "\\sqrt[n]{value}" },
  { label: "Sum", insert: "\\sum_{i=1}^{n}" },
  { label: "Integral", insert: "\\int_{a}^{b}" },
  { label: "Limit", insert: "\\lim_{x \\to \\infty}" },
  { label: "Matrix", insert: "\\begin{matrix} a & b \\\\ c & d \\end{matrix}" },
];

const SYMBOLS = [
  { label: "α", value: "α" },
  { label: "β", value: "β" },
  { label: "γ", value: "γ" },
  { label: "π", value: "π" },
  { label: "∞", value: "∞" },
  { label: "∂", value: "∂" },
  { label: "∇", value: "∇" },
  { label: "≤", value: "≤" },
  { label: "≥", value: "≥" },
  { label: "≠", value: "≠" },
  { label: "±", value: "±" },
  { label: "÷", value: "÷" },
  { label: "×", value: "×" },
  { label: "·", value: "·" },
];

export function MathEditor({ value, onChange, onImageUpload, placeholder }: MathEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('question-answers')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('question-answers')
        .getPublicUrl(data.path);

      setUploadedImages(prev => [...prev, publicUrl]);
      if (onImageUpload) onImageUpload(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = async (imageUrl: string) => {
    try {
      const path = imageUrl.split('/question-answers/')[1];
      if (path) {
        await supabase.storage.from('question-answers').remove([path]);
      }
      setUploadedImages(prev => prev.filter(url => url !== imageUrl));
      toast.success("Image removed");
    } catch (error) {
      console.error('Remove error:', error);
      toast.error("Failed to remove image");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const convertToUnicode = () => {
    let converted = value;
    
    // Convert LaTeX fractions to Unicode fractions
    const fractionMap: { [key: string]: string } = {
      '\\frac{1}{2}': '½',
      '\\frac{1}{3}': '⅓',
      '\\frac{2}{3}': '⅔',
      '\\frac{1}{4}': '¼',
      '\\frac{3}{4}': '¾',
      '\\frac{1}{5}': '⅕',
      '\\frac{2}{5}': '⅖',
      '\\frac{3}{5}': '⅗',
      '\\frac{4}{5}': '⅘',
      '\\frac{1}{6}': '⅙',
      '\\frac{5}{6}': '⅚',
      '\\frac{1}{8}': '⅛',
      '\\frac{3}{8}': '⅜',
      '\\frac{5}{8}': '⅝',
      '\\frac{7}{8}': '⅞',
    };

    // Convert common LaTeX symbols to Unicode
    const symbolMap: { [key: string]: string } = {
      '\\pi': 'π',
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\epsilon': 'ε',
      '\\theta': 'θ',
      '\\lambda': 'λ',
      '\\mu': 'μ',
      '\\sigma': 'σ',
      '\\infty': '∞',
      '\\pm': '±',
      '\\times': '×',
      '\\div': '÷',
      '\\leq': '≤',
      '\\geq': '≥',
      '\\neq': '≠',
      '\\approx': '≈',
      '\\equiv': '≡',
      '\\sum': '∑',
      '\\prod': '∏',
      '\\int': '∫',
      '\\partial': '∂',
      '\\nabla': '∇',
      '\\sqrt': '√',
    };

    // Apply fraction conversions
    Object.entries(fractionMap).forEach(([latex, unicode]) => {
      converted = converted.replace(new RegExp(latex.replace(/[{}]/g, '\\$&'), 'g'), unicode);
    });

    // Apply symbol conversions
    Object.entries(symbolMap).forEach(([latex, unicode]) => {
      converted = converted.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
    });

    // Convert power notation: x^{2} to x²
    converted = converted.replace(/\^{?(\d)}?/g, (match, digit) => {
      const superscripts: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };
      return superscripts[digit] || match;
    });

    // Convert subscript notation: x_{2} to x₂
    converted = converted.replace(/_{?(\d)}?/g, (match, digit) => {
      const subscripts: { [key: string]: string } = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
      };
      return subscripts[digit] || match;
    });

    onChange(converted);
    toast.success("Converted to Unicode symbols");
  };

  const renderMathPreview = (text: string) => {
    try {
      // Split text by LaTeX delimiters and render accordingly
      const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\\[a-zA-Z]+\{[^}]*\}|\\frac\{[^}]*\}\{[^}]*\}|\\sqrt(?:\[[^\]]*\])?\{[^}]*\})/g);
      
      return parts.map((part, idx) => {
        // Block math with $$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return <BlockMath key={idx} math={math} />;
        }
        // Inline math with $
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return <InlineMath key={idx} math={math} />;
        }
        // LaTeX commands like \frac, \sqrt, etc.
        if (part.match(/^\\[a-zA-Z]+/)) {
          return <InlineMath key={idx} math={part} />;
        }
        // Regular text
        return <span key={idx}>{part}</span>;
      });
    } catch (error) {
      console.error('Math rendering error:', error);
      return <span>{text}</span>;
    }
  };

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Card className="p-4">
      {/* Toolbar */}
      <div className="mb-3 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Word-like Math Editor</span>
            <Button variant="ghost" size="icon" title="Undo">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Redo">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Math Templates */}
        <div>
          <p className="text-xs font-medium mb-2">Math Templates</p>
          <div className="flex flex-wrap gap-1">
            {MATH_TEMPLATES.map((template) => (
              <Button
                key={template.label}
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => insertAtCursor(template.insert)}
              >
                {template.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Symbols */}
        <div>
          <p className="text-xs font-medium mb-2">Symbols</p>
          <div className="flex flex-wrap gap-1">
            {SYMBOLS.map((symbol) => (
              <Button
                key={symbol.label}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-base"
                onClick={() => insertAtCursor(symbol.value)}
              >
                {symbol.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center gap-1"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
          >
            <Code className="h-3 w-3" />
            LaTeX
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={convertToUnicode}
            className="flex items-center gap-1"
          >
            <Type className="h-3 w-3" />
            Unicode
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1"
          >
            <ImageIcon className="h-3 w-3" />
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Type your answer here... Use math notation, fractions, symbols, and equations directly."}
        className="min-h-[120px] font-mono text-sm resize-none"
      />

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uploadedImages.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Uploaded ${index + 1}`}
                className="h-20 w-20 object-cover rounded border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(url)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
        <div className="flex items-center gap-4">
          <span>Words: {wordCount}</span>
          <span className="text-green-600">✓ Auto-saved</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <Save className="h-3 w-3" />
            Save Draft
          </Button>
        </div>
      </div>

      {/* Preview */}
      {showPreview && value && (
        <div className="mt-3 p-3 bg-muted rounded border">
          <p className="text-xs font-medium mb-2">Preview:</p>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-base">
              {renderMathPreview(value)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
