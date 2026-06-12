import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Calculator, Sigma, Radical, Superscript, Brackets, Pi, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface SmartMathConfig {
  inputMode: 'single_expression' | 'multi_step';
  palettes: string[];
  expectedAnswers: { latex: string; label?: string }[];
  evaluationMode: 'exact_match' | 'normalized_match' | 'manual_only';
  scoring: {
    fullMarks: number;
    partialCredit: boolean;
  };
  explanation: string;
  evaluationNotes: string;
}

export const createDefaultSmartMathConfig = (): SmartMathConfig => ({
  inputMode: 'single_expression',
  palettes: ['fraction', 'script', 'radical', 'bracket', 'operator', 'greek'],
  expectedAnswers: [{ latex: '', label: 'Primary' }],
  evaluationMode: 'exact_match',
  scoring: { fullMarks: 1, partialCredit: false },
  explanation: '',
  evaluationNotes: '',
});

interface SmartMathEditorProps {
  config: SmartMathConfig;
  onChange: (config: SmartMathConfig) => void;
}

const ALL_PALETTES = [
  { id: 'fraction', label: 'Fractions', icon: <Hash className="w-3.5 h-3.5" /> },
  { id: 'script', label: 'Powers & Subscripts', icon: <Superscript className="w-3.5 h-3.5" /> },
  { id: 'radical', label: 'Roots & Radicals', icon: <Radical className="w-3.5 h-3.5" /> },
  { id: 'bracket', label: 'Brackets', icon: <Brackets className="w-3.5 h-3.5" /> },
  { id: 'operator', label: 'Operators', icon: <Sigma className="w-3.5 h-3.5" /> },
  { id: 'greek', label: 'Greek Letters', icon: <Pi className="w-3.5 h-3.5" /> },
  { id: 'integral', label: 'Integrals & Limits', icon: <Calculator className="w-3.5 h-3.5" /> },
];

const renderLatexSafe = (latex: string): string => {
  if (!latex) return '';
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch {
    return latex;
  }
};

const SmartMathEditor: React.FC<SmartMathEditorProps> = ({ config, onChange }) => {
  const update = (patch: Partial<SmartMathConfig>) => onChange({ ...config, ...patch });

  const updateAnswer = (index: number, latex: string) => {
    const answers = [...config.expectedAnswers];
    answers[index] = { ...answers[index], latex };
    update({ expectedAnswers: answers });
  };

  const addAnswer = () => {
    update({ expectedAnswers: [...config.expectedAnswers, { latex: '', label: `Alt ${config.expectedAnswers.length}` }] });
  };

  const removeAnswer = (index: number) => {
    if (config.expectedAnswers.length <= 1) return;
    update({ expectedAnswers: config.expectedAnswers.filter((_, i) => i !== index) });
  };

  const togglePalette = (id: string) => {
    const palettes = config.palettes.includes(id)
      ? config.palettes.filter(p => p !== id)
      : [...config.palettes, id];
    update({ palettes });
  };

  return (
    <div className="space-y-4">
      {/* Section A — Expected Answers */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Expected Answers (LaTeX)</h4>
          </div>
          <p className="text-xs text-muted-foreground">Enter the correct answer in LaTeX. Add alternatives for equivalent forms.</p>

          {config.expectedAnswers.map((ans, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs shrink-0">
                  {idx === 0 ? 'Primary' : `Alt ${idx}`}
                </Badge>
                <Input
                  value={ans.latex}
                  onChange={(e) => updateAnswer(idx, e.target.value)}
                  placeholder="e.g. \\frac{1}{2} or x^2 + 3x + 2"
                  className="flex-1 font-mono text-sm"
                />
                {idx > 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAnswer(idx)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {ans.latex && (
                <div className="ml-16 p-2 rounded border bg-muted/30 text-center">
                  <span dangerouslySetInnerHTML={{ __html: renderLatexSafe(ans.latex) }} />
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addAnswer} className="border-dashed">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Alternative Answer
          </Button>
        </CardContent>
      </Card>

      {/* Section B — Student Tool Palettes */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Student Math Palettes</h4>
          <p className="text-xs text-muted-foreground">Choose which math tools the student can use.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_PALETTES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePalette(p.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  config.palettes.includes(p.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                )}
              >
                {p.icon}
                {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section C — Evaluation Settings */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Evaluation Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Evaluation Mode</Label>
              <Select value={config.evaluationMode} onValueChange={(v: any) => update({ evaluationMode: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact_match">Exact Match</SelectItem>
                  <SelectItem value="normalized_match">Normalized Match</SelectItem>
                  <SelectItem value="manual_only">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Input Mode</Label>
              <Select value={config.inputMode} onValueChange={(v: any) => update({ inputMode: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_expression">Single Expression</SelectItem>
                  <SelectItem value="multi_step">Multi-Step Working</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.scoring.partialCredit}
              onCheckedChange={(v) => update({ scoring: { ...config.scoring, partialCredit: v } })}
            />
            <Label className="text-xs">Allow partial credit</Label>
          </div>
        </CardContent>
      </Card>

      {/* Section D — Notes */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Notes</h4>
          <div>
            <Label className="text-xs">Explanation (shown to student after evaluation)</Label>
            <Textarea
              value={config.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
              placeholder="e.g. The simplified answer is 1/2."
              rows={2}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Evaluation Notes (for admin only)</Label>
            <Textarea
              value={config.evaluationNotes}
              onChange={(e) => update({ evaluationNotes: e.target.value })}
              placeholder="e.g. Accept decimal or fraction form."
              rows={2}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartMathEditor;
