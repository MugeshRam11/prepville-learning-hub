import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { renderLatexContent } from '@/lib/renderLatex';

interface MathTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

/**
 * Simple math-aware text area:
 * - Textarea for raw input (supports $...$ and $$...$$ LaTeX)
 * - Live rendered preview below using KaTeX
 */
const MathTextArea: React.FC<MathTextAreaProps> = ({
  value,
  onChange,
  placeholder = 'Enter text with LaTeX math ($...$)...',
  disabled = false,
  minHeight = '80px',
}) => {
  const [focused, setFocused] = useState(false);

  const hasContent = value && value.trim().length > 0;
  const hasMath = hasContent && /\$[^$]+\$/.test(value);

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ minHeight }}
        className="font-mono text-sm"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hasContent && hasMath && (
        <div className="border rounded-md p-3 bg-muted/30 text-sm">
          <span className="text-xs text-muted-foreground block mb-1">Preview:</span>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {renderLatexContent(value)}
          </div>
        </div>
      )}
    </div>
  );
};

export default MathTextArea;
