import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
import katex from 'katex';

export interface EquationData {
  id: string;
  latex: string;
  mathml: string;
  renderedHtml: string;
}

interface EquationObjectProps {
  equation: EquationData;
  onEdit: (equation: EquationData) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

const EquationObject: React.FC<EquationObjectProps> = ({
  equation,
  onEdit,
  onDelete,
  disabled = false,
  className
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const equationRef = useRef<HTMLSpanElement>(null);

  // Render the equation using KaTeX
  useEffect(() => {
    if (equationRef.current && equation.latex) {
      try {
        katex.render(equation.latex, equationRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        equationRef.current.textContent = equation.latex;
      }
    }
  }, [equation.latex]);

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSelected(false);
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      setIsSelected(true);
      setShowActions(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onEdit(equation);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(equation);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(equation.id);
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "inline-flex items-center relative",
        "transition-all duration-200",
        isSelected && "z-10",
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* Equation Block */}
      <motion.span
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "inline-block px-2 py-1 rounded-md cursor-pointer transition-all",
          "bg-primary/5 border border-transparent",
          isSelected && "bg-primary/10 border-primary ring-2 ring-primary/20",
          !disabled && "hover:bg-primary/10 hover:border-primary/30",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        title={disabled ? "Equation (read-only)" : "Click to select, double-click to edit"}
      >
        <span 
          ref={equationRef}
          className="equation-content text-foreground"
        />
      </motion.span>

      {/* Action Buttons */}
      <AnimatePresence>
        {showActions && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-popover border border-border rounded-lg shadow-lg p-1 z-20"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
              onClick={handleEdit}
              title="Edit equation"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              title="Delete equation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EquationObject;
