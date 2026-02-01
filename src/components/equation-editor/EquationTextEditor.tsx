import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import EquationEditorModal from './EquationEditorModal';
import EquationObject, { EquationData } from './EquationObject';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateId = () => `eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleInsertEquation = () => {
    setEditingEquation(null);
    setIsEditorOpen(true);
  };

  const handleEditEquation = (equation: EquationData) => {
    setEditingEquation(equation);
    setIsEditorOpen(true);
  };

  const handleDeleteEquation = (id: string) => {
    onEquationsChange(equations.filter(eq => eq.id !== id));
    // Also remove the placeholder from the text
    const placeholder = `[[EQ:${id}]]`;
    onValueChange(value.replace(placeholder, ''));
  };

  const handleSaveEquation = (data: { latex: string; mathml: string; renderedHtml: string }) => {
    if (editingEquation) {
      // Update existing equation
      onEquationsChange(
        equations.map(eq => 
          eq.id === editingEquation.id 
            ? { ...eq, ...data }
            : eq
        )
      );
    } else {
      // Insert new equation
      const newEquation: EquationData = {
        id: generateId(),
        ...data
      };
      onEquationsChange([...equations, newEquation]);
      
      // Insert placeholder at cursor position or end
      const textarea = textareaRef.current;
      const placeholder = `[[EQ:${newEquation.id}]]`;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const before = value.slice(0, start);
        const after = value.slice(start);
        onValueChange(before + placeholder + after);
      } else {
        onValueChange(value + placeholder);
      }
    }
    
    setIsEditorOpen(false);
    setEditingEquation(null);
  };

  // Render the mixed content (text + equations)
  const renderContent = useCallback(() => {
    if (!value && equations.length === 0) {
      return null;
    }

    // Split content by equation placeholders
    const parts = value.split(/(\[\[EQ:[^\]]+\]\])/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[\[EQ:([^\]]+)\]\]/);
      if (match) {
        const equationId = match[1];
        const equation = equations.find(eq => eq.id === equationId);
        if (equation) {
          return (
            <EquationObject
              key={equation.id}
              equation={equation}
              onEdit={handleEditEquation}
              onDelete={handleDeleteEquation}
              disabled={disabled}
            />
          );
        }
        return null;
      }
      return part ? <span key={index}>{part}</span> : null;
    });
  }, [value, equations, disabled]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Equation Objects Display */}
      {equations.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-2">Equations in your answer:</p>
          <div className="flex flex-wrap gap-2">
            {equations.map(equation => (
              <EquationObject
                key={equation.id}
                equation={equation}
                onEdit={handleEditEquation}
                onDelete={handleDeleteEquation}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Text Input Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "resize-y font-sans text-base",
            disabled && "opacity-60"
          )}
          style={{ minHeight }}
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
