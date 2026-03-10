import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MCQOption {
  id: string;
  label: string; // A, B, C, D
  content: string;
}

export interface MultipleChoiceConfig {
  mode: 'single' | 'multiple';
  options: MCQOption[];
  correctOptionIds: string[];
  shuffleOptions: boolean;
  explanation: string;
  evaluationNotes: string;
}

export const createDefaultMCQConfig = (): MultipleChoiceConfig => ({
  mode: 'single',
  options: [
    { id: `opt-${Date.now()}-1`, label: 'A', content: '' },
    { id: `opt-${Date.now()}-2`, label: 'B', content: '' },
    { id: `opt-${Date.now()}-3`, label: 'C', content: '' },
    { id: `opt-${Date.now()}-4`, label: 'D', content: '' },
  ],
  correctOptionIds: [],
  shuffleOptions: false,
  explanation: '',
  evaluationNotes: '',
});

interface MultipleChoiceConfigEditorProps {
  config: MultipleChoiceConfig;
  onChange: (config: MultipleChoiceConfig) => void;
}

const MultipleChoiceConfigEditor: React.FC<MultipleChoiceConfigEditorProps> = ({
  config,
  onChange,
}) => {
  const updateOption = (optionId: string, content: string) => {
    onChange({
      ...config,
      options: config.options.map(o => o.id === optionId ? { ...o, content } : o),
    });
  };

  const toggleCorrect = (optionId: string) => {
    if (config.mode === 'single') {
      onChange({ ...config, correctOptionIds: [optionId] });
    } else {
      const ids = config.correctOptionIds.includes(optionId)
        ? config.correctOptionIds.filter(id => id !== optionId)
        : [...config.correctOptionIds, optionId];
      onChange({ ...config, correctOptionIds: ids });
    }
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + config.options.length);
    const newOption: MCQOption = {
      id: `opt-${Date.now()}-${config.options.length + 1}`,
      label: nextLabel,
      content: '',
    };
    onChange({ ...config, options: [...config.options, newOption] });
  };

  const removeOption = (optionId: string) => {
    if (config.options.length <= 2) return;
    const filtered = config.options
      .filter(o => o.id !== optionId)
      .map((o, idx) => ({ ...o, label: String.fromCharCode(65 + idx) }));
    onChange({
      ...config,
      options: filtered,
      correctOptionIds: config.correctOptionIds.filter(id => id !== optionId),
    });
  };

  const moveOption = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= config.options.length) return;
    const arr = [...config.options];
    const [removed] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, removed);
    const relabeled = arr.map((o, idx) => ({ ...o, label: String.fromCharCode(65 + idx) }));
    onChange({ ...config, options: relabeled });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Multiple Choice Options</h4>
        <div className="flex items-center gap-2">
          <Label htmlFor="mcq-mode" className="text-xs text-muted-foreground">
            Allow multiple answers
          </Label>
          <Switch
            id="mcq-mode"
            checked={config.mode === 'multiple'}
            onCheckedChange={(checked) => onChange({
              ...config,
              mode: checked ? 'multiple' : 'single',
              correctOptionIds: checked ? config.correctOptionIds : config.correctOptionIds.slice(0, 1),
            })}
          />
        </div>
      </div>

      {/* Options list */}
      <div className="space-y-2">
        {config.options.map((option, index) => {
          const isCorrect = config.correctOptionIds.includes(option.id);
          return (
            <div
              key={option.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 transition-colors',
                isCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveOption(index, index - 1)}
                  className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveOption(index, index + 1)}
                  className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === config.options.length - 1}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>

              {/* Correct marker */}
              <button
                type="button"
                onClick={() => toggleCorrect(option.id)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors',
                  isCorrect
                    ? 'bg-green-500 text-white'
                    : 'border-2 border-muted-foreground/30 hover:border-primary'
                )}
                title={isCorrect ? 'Marked as correct' : 'Click to mark as correct'}
              >
                {isCorrect ? <Check className="w-4 h-4" /> : option.label}
              </button>

              {/* Content */}
              <Input
                value={option.content}
                onChange={(e) => updateOption(option.id, e.target.value)}
                placeholder={`Option ${option.label}`}
                className="flex-1 border-none bg-transparent focus:ring-0"
              />

              {/* Delete */}
              {config.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(option.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add option */}
      {config.options.length < 8 && (
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full border-dashed">
          <Plus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      )}

      {/* Validation hint */}
      {config.correctOptionIds.length === 0 && (
        <p className="text-xs text-amber-600">⚠ No correct answer selected. Click a label to mark it correct.</p>
      )}

      {/* Shuffle toggle */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Switch
          id="mcq-shuffle"
          checked={config.shuffleOptions}
          onCheckedChange={(checked) => onChange({ ...config, shuffleOptions: !!checked })}
        />
        <Label htmlFor="mcq-shuffle" className="text-xs text-muted-foreground">
          Shuffle options for each student
        </Label>
      </div>

      {/* Explanation */}
      <div>
        <Label className="text-xs text-muted-foreground">Explanation (shown after evaluation)</Label>
        <Textarea
          value={config.explanation}
          onChange={(e) => onChange({ ...config, explanation: e.target.value })}
          placeholder="Explain why the correct answer is right..."
          className="min-h-[60px] mt-1 text-sm"
        />
      </div>

      {/* Evaluation notes */}
      <div>
        <Label className="text-xs text-muted-foreground">Evaluation Notes (admin only)</Label>
        <Input
          value={config.evaluationNotes}
          onChange={(e) => onChange({ ...config, evaluationNotes: e.target.value })}
          placeholder="Notes for grading..."
          className="mt-1 text-sm"
        />
      </div>
    </div>
  );
};

export default MultipleChoiceConfigEditor;
