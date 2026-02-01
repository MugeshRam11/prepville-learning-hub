import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// All available interactive question types
export const QUESTION_TYPES = [
  { value: 'text_equation', label: 'Text/Equation', description: 'Free text with math input' },
  { value: 'smart_math', label: 'Smart Math', description: 'Structured math with validation' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'MCQ with options' },
  { value: 'graph_plot', label: 'Graph Plot', description: 'Interactive graph canvas' },
  { value: 'drag_drop', label: 'Drag & Drop', description: 'Match or order items' },
  { value: 'arrange_order', label: 'Step Ordering', description: 'Arrange steps in order' },
  { value: 'image_drop', label: 'Image Drop Zone', description: 'Place labels on diagram' },
  { value: 'table_input', label: 'Table Input', description: 'Structured table answers' },
];

interface QuestionTypeConfirmationProps {
  questionNumber: number | string;
  questionText: string;
  aiDetectedType?: string;
  confirmedType?: string;
  isConfirmed: boolean;
  onAccept: () => void;
  onOverride: (newType: string) => void;
  className?: string;
}

const QuestionTypeConfirmation: React.FC<QuestionTypeConfirmationProps> = ({
  questionNumber,
  questionText,
  aiDetectedType,
  confirmedType,
  isConfirmed,
  onAccept,
  onOverride,
  className
}) => {
  const currentType = confirmedType || aiDetectedType || 'text_equation';
  const typeInfo = QUESTION_TYPES.find(t => t.value === currentType);
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg border transition-all",
      isConfirmed 
        ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" 
        : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
      className
    )}>
      {/* Question Number */}
      <Badge variant="outline" className="font-mono text-xs shrink-0">
        Q{questionNumber}
      </Badge>
      
      {/* AI Detected Badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Sparkles className="w-3 h-3 text-purple-500" />
        <span className="text-xs text-muted-foreground">AI:</span>
        <Badge variant="secondary" className="text-xs">
          {typeInfo?.label || currentType}
        </Badge>
      </div>
      
      {/* Type Selector */}
      <Select
        value={currentType}
        onValueChange={(value) => {
          onOverride(value);
        }}
      >
        <SelectTrigger className="w-[160px] h-7 text-xs">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          {QUESTION_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value} className="text-xs">
              <div className="flex flex-col">
                <span className="font-medium">{type.label}</span>
                <span className="text-muted-foreground text-[10px]">{type.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Accept Button */}
      {!isConfirmed ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onAccept}
          className="h-7 gap-1.5 text-xs border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
        >
          <Check className="w-3 h-3" />
          Confirm
        </Button>
      ) : (
        <Badge className="bg-green-500 text-white gap-1">
          <Check className="w-3 h-3" />
          Confirmed
        </Badge>
      )}
    </div>
  );
};

export default QuestionTypeConfirmation;
