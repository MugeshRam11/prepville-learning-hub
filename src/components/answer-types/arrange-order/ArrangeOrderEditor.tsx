import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArrangeOrderItem {
  id: string;
  type: 'text' | 'image';
  content: string;
  imageUrl?: string;
}

export interface ArrangeOrderConfig {
  mode: 'sequence' | 'ascending' | 'descending' | 'chronological' | 'process';
  instruction: string;
  items: ArrangeOrderItem[];
  correctOrder: string[]; // ordered item IDs
  shuffleOnStudentSide: boolean;
  scoring: {
    marksPerCorrectPosition: number;
    fullMarksOnly: boolean;
    partialCredit: boolean;
  };
  explanation: string;
  evaluationNotes: string;
}

const INSTRUCTION_PRESETS: Record<string, string> = {
  sequence: 'Arrange in the correct sequence',
  ascending: 'Arrange in ascending order',
  descending: 'Arrange in descending order',
  chronological: 'Arrange in chronological order',
  process: 'Arrange the process steps in order',
};

export const createDefaultArrangeOrderConfig = (): ArrangeOrderConfig => ({
  mode: 'sequence',
  instruction: INSTRUCTION_PRESETS.sequence,
  items: [
    { id: `ao-${Date.now()}-1`, type: 'text', content: '' },
    { id: `ao-${Date.now()}-2`, type: 'text', content: '' },
  ],
  correctOrder: [],
  shuffleOnStudentSide: true,
  scoring: { marksPerCorrectPosition: 0.5, fullMarksOnly: false, partialCredit: true },
  explanation: '',
  evaluationNotes: '',
});

interface ArrangeOrderEditorProps {
  config: ArrangeOrderConfig;
  onChange: (config: ArrangeOrderConfig) => void;
}

const ArrangeOrderEditor: React.FC<ArrangeOrderEditorProps> = ({ config, onChange }) => {
  const update = (partial: Partial<ArrangeOrderConfig>) => onChange({ ...config, ...partial });

  // ── Items ──
  const addItem = () => {
    const id = `ao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItems = [...config.items, { id, type: 'text' as const, content: '' }];
    update({ items: newItems, correctOrder: [...config.correctOrder, id] });
  };

  const updateItem = (id: string, changes: Partial<ArrangeOrderItem>) => {
    update({ items: config.items.map(i => i.id === id ? { ...i, ...changes } : i) });
  };

  const deleteItem = (id: string) => {
    update({
      items: config.items.filter(i => i.id !== id),
      correctOrder: config.correctOrder.filter(oid => oid !== id),
    });
  };

  // ── Correct Order ──
  const moveInCorrectOrder = (idx: number, direction: 'up' | 'down') => {
    const arr = [...config.correctOrder];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    update({ correctOrder: arr });
  };

  // Auto-populate correct order if empty
  const ensureCorrectOrder = () => {
    if (config.correctOrder.length === 0 && config.items.length > 0) {
      update({ correctOrder: config.items.map(i => i.id) });
    }
  };

  // Make sure all items are in correctOrder
  const syncCorrectOrder = () => {
    const existing = new Set(config.correctOrder);
    const missing = config.items.filter(i => !existing.has(i.id)).map(i => i.id);
    if (missing.length > 0) {
      update({ correctOrder: [...config.correctOrder, ...missing] });
    }
  };

  // On first render, sync
  React.useEffect(() => {
    ensureCorrectOrder();
    syncCorrectOrder();
  }, [config.items.length]);

  const itemMap: Record<string, ArrangeOrderItem> = {};
  config.items.forEach(i => { itemMap[i.id] = i; });

  return (
    <div className="space-y-5 border rounded-xl p-4 bg-muted/10">
      <div className="flex items-center gap-2">
        <ListOrdered className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">Arrange / Order Configuration</h3>
      </div>

      {/* Step 1 — Instruction */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Label className="text-sm font-medium">Step 1 — Instruction</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <Select value={config.mode} onValueChange={(v) => {
                const mode = v as ArrangeOrderConfig['mode'];
                update({ mode, instruction: INSTRUCTION_PRESETS[mode] || config.instruction });
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequence">Correct Sequence</SelectItem>
                  <SelectItem value="ascending">Ascending Order</SelectItem>
                  <SelectItem value="descending">Descending Order</SelectItem>
                  <SelectItem value="chronological">Chronological Order</SelectItem>
                  <SelectItem value="process">Process Steps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Custom Instruction</Label>
              <Input
                value={config.instruction}
                onChange={(e) => update({ instruction: e.target.value })}
                placeholder="Arrange in..."
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Items */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Step 2 — Items</Label>
            <Badge variant="outline" className="text-xs">{config.items.length} items</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Add the items students will need to arrange.</p>

          {config.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
              <Input
                value={item.content}
                onChange={(e) => updateItem(item.id, { content: e.target.value })}
                placeholder={`Item ${idx + 1}...`}
                className="h-8 text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => deleteItem(item.id)}
                disabled={config.items.length <= 2}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Step 3 — Correct Order */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Step 3 — Correct Order</Label>
            <Badge variant={config.correctOrder.length === config.items.length ? 'default' : 'secondary'} className="text-xs">
              {config.correctOrder.length}/{config.items.length} ordered
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Arrange items in the correct final order using the arrows.</p>

          {config.correctOrder.map((itemId, idx) => {
            const item = itemMap[itemId];
            if (!item) return null;
            return (
              <div key={itemId} className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                <span className="text-xs font-bold text-primary w-6 shrink-0">{idx + 1}.</span>
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{item.content || `Item ${idx + 1}`}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveInCorrectOrder(idx, 'up')}
                  disabled={idx === 0}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveInCorrectOrder(idx, 'down')}
                  disabled={idx === config.correctOrder.length - 1}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Step 4 — Settings */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <Label className="text-sm font-medium">Step 4 — Settings</Label>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Shuffle items for students</Label>
            <Switch checked={config.shuffleOnStudentSide} onCheckedChange={(v) => update({ shuffleOnStudentSide: v })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Marks per correct position</Label>
              <Input
                type="number"
                min={0.25}
                step={0.25}
                value={config.scoring.marksPerCorrectPosition}
                onChange={(e) => update({ scoring: { ...config.scoring, marksPerCorrectPosition: parseFloat(e.target.value) || 0.5 } })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Partial credit</Label>
                <Switch checked={config.scoring.partialCredit} onCheckedChange={(v) => update({ scoring: { ...config.scoring, partialCredit: v, fullMarksOnly: !v } })} />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Explanation (shown after evaluation)</Label>
            <Textarea
              value={config.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
              placeholder="Explain the correct order..."
              className="min-h-[60px] text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Evaluation Notes (for admin only)</Label>
            <Textarea
              value={config.evaluationNotes}
              onChange={(e) => update({ evaluationNotes: e.target.value })}
              placeholder="Notes for evaluator..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArrangeOrderEditor;
