import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  LineChart, 
  GripVertical, 
  Image, 
  ArrowUpDown, 
  Calculator,
  CheckSquare
} from 'lucide-react';

export type AnswerBlockType = 
  | 'text_equation'
  | 'graph_plot'
  | 'drag_drop'
  | 'image_drop'
  | 'arrange_order'
  | 'smart_math'
  | 'multiple_choice'
  | 'table_input'
  | 'image_fill_blanks';

interface AnswerBlockTypeSelectorProps {
  value: AnswerBlockType;
  onChange: (value: AnswerBlockType) => void;
  disabled?: boolean;
}

const ANSWER_BLOCK_OPTIONS: { value: AnswerBlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'text_equation', 
    label: 'Text / Equation', 
    icon: <FileText className="w-4 h-4" />,
    description: 'Standard text answer with LaTeX support'
  },
  { 
    value: 'graph_plot', 
    label: 'Graph Plotting', 
    icon: <LineChart className="w-4 h-4" />,
    description: 'Interactive graph with points and lines'
  },
  { 
    value: 'drag_drop', 
    label: 'Drag & Drop', 
    icon: <GripVertical className="w-4 h-4" />,
    description: 'Match items by dragging to targets'
  },
  { 
    value: 'image_drop', 
    label: 'Image Drop Zone', 
    icon: <Image className="w-4 h-4" />,
    description: 'Drop labels onto image locations'
  },
  { 
    value: 'arrange_order', 
    label: 'Arrange / Order', 
    icon: <ArrowUpDown className="w-4 h-4" />,
    description: 'Reorder items in correct sequence'
  },
  { 
    value: 'smart_math', 
    label: 'Smart Math Input', 
    icon: <Calculator className="w-4 h-4" />,
    description: 'Step-by-step math with validation'
  },
  { 
    value: 'multiple_choice', 
    label: 'Multiple Choice', 
    icon: <CheckSquare className="w-4 h-4" />,
    description: 'Select from predefined options'
  },
  { 
    value: 'table_input', 
    label: 'Table Input', 
    icon: <FileText className="w-4 h-4" />,
    description: 'Fill in table cells'
  },
];

const AnswerBlockTypeSelector: React.FC<AnswerBlockTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const selectedOption = ANSWER_BLOCK_OPTIONS.find(opt => opt.value === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={(v) => onChange(v as AnswerBlockType)} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedOption && (
              <div className="flex items-center gap-2">
                {selectedOption.icon}
                <span>{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ANSWER_BLOCK_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon}
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AnswerBlockTypeSelector;
export { ANSWER_BLOCK_OPTIONS };
