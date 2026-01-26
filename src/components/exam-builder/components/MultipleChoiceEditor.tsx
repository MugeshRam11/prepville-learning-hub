import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { GripVertical, Plus, Trash2, Check, ImagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ComponentConfig, MultipleChoiceOption } from '../types';

interface MultipleChoiceEditorProps {
  component: ComponentConfig;
  onUpdate: (id: string, updates: Partial<ComponentConfig>) => void;
}

const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  component,
  onUpdate,
}) => {
  const options = component.options || [
    { id: 'a', label: 'A', text: '', isCorrect: false },
    { id: 'b', label: 'B', text: '', isCorrect: false },
    { id: 'c', label: 'C', text: '', isCorrect: false },
    { id: 'd', label: 'D', text: '', isCorrect: false },
  ];

  const updateOption = (optionId: string, updates: Partial<MultipleChoiceOption>) => {
    const newOptions = options.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    onUpdate(component.id, { options: newOptions });
  };

  const setCorrectAnswer = (optionId: string) => {
    const newOptions = options.map(opt => ({
      ...opt,
      isCorrect: opt.id === optionId,
    }));
    onUpdate(component.id, { options: newOptions, answerKey: optionId });
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length); // A, B, C, D, E...
    const newOption: MultipleChoiceOption = {
      id: `opt-${Date.now()}`,
      label: nextLabel,
      text: '',
      isCorrect: false,
    };
    onUpdate(component.id, { options: [...options, newOption] });
  };

  const removeOption = (optionId: string) => {
    if (options.length <= 2) return;
    const newOptions = options.filter(opt => opt.id !== optionId);
    // Re-label options
    const relabeled = newOptions.map((opt, idx) => ({
      ...opt,
      label: String.fromCharCode(65 + idx),
    }));
    onUpdate(component.id, { options: relabeled });
  };

  const handleReorder = (newOrder: MultipleChoiceOption[]) => {
    const relabeled = newOrder.map((opt, idx) => ({
      ...opt,
      label: String.fromCharCode(65 + idx),
    }));
    onUpdate(component.id, { options: relabeled });
  };

  return (
    <div className="space-y-4">
      {/* Question text */}
      <Textarea
        placeholder="Enter your question here..."
        value={component.content}
        onChange={(e) => onUpdate(component.id, { content: e.target.value })}
        className="min-h-[60px] resize-none text-base"
      />

      {/* Options */}
      <Reorder.Group
        axis="y"
        values={options}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {options.map((option, index) => (
          <Reorder.Item
            key={option.id}
            value={option}
            className="cursor-grab active:cursor-grabbing"
          >
            <motion.div
              layout
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 transition-colors",
                option.isCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              
              {/* Option label circle */}
              <button
                onClick={() => setCorrectAnswer(option.id)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors",
                  option.isCorrect
                    ? "bg-green-500 text-white"
                    : "border-2 border-muted-foreground/30 hover:border-primary"
                )}
                title="Click to mark as correct answer"
              >
                {option.isCorrect ? <Check className="w-4 h-4" /> : option.label}
              </button>

              {/* Option text input */}
              <Input
                value={option.text}
                onChange={(e) => updateOption(option.id, { text: e.target.value })}
                placeholder={`Option ${option.label}`}
                className="flex-1 border-none bg-transparent focus:ring-0"
              />

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Add image to option"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOption(option.id)}
                    title="Remove option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Add option button */}
      <Button
        variant="outline"
        size="sm"
        onClick={addOption}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add an option
      </Button>

      {/* Settings */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={component.settings?.askExplanation}
            onCheckedChange={(checked) =>
              onUpdate(component.id, {
                settings: { ...component.settings, askExplanation: checked },
              })
            }
          />
          Ask student to explain their answer
        </label>
      </div>
    </div>
  );
};

export default MultipleChoiceEditor;
