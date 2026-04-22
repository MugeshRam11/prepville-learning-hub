/**
 * Admin editor for the Venn Diagram (`venn_drag`) answer block.
 *
 * Stored shape (lives inside `answer_block_config` JSONB — no schema change):
 * {
 *   sets: ['A', 'B'],
 *   regions: ['A_only', 'B_only', 'intersection', 'outside'],
 *   mode: 'drag',
 *   draggables: [{ id, label }],
 *   correct_answer: { [regionId]: draggableId[] }
 * }
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import VennDiagram, { VENN_REGIONS, type VennRegionId } from './VennDiagram';

export interface VennDraggable {
  id: string;
  label: string;
}

export interface VennDiagramConfig {
  sets: ['A', 'B'];
  regions: VennRegionId[];
  mode: 'drag';
  draggables: VennDraggable[];
  /** Map from region ID → list of draggable IDs that belong there. */
  correct_answer: Partial<Record<VennRegionId, string[]>>;
  setLabels?: { A: string; B: string };
}

interface VennDiagramEditorProps {
  config: VennDiagramConfig;
  onChange: (config: VennDiagramConfig) => void;
}

export const createDefaultVennConfig = (): VennDiagramConfig => ({
  sets: ['A', 'B'],
  regions: ['A_only', 'B_only', 'intersection', 'outside'],
  mode: 'drag',
  draggables: [
    { id: 'venn-1', label: "A' ∩ B" },
  ],
  correct_answer: {},
  setLabels: { A: 'A', B: 'B' },
});

const VennDiagramEditor: React.FC<VennDiagramEditorProps> = ({ config, onChange }) => {
  const setLabels = config.setLabels || { A: 'A', B: 'B' };

  const updateLabel = (which: 'A' | 'B', value: string) => {
    onChange({
      ...config,
      setLabels: { ...setLabels, [which]: value || which },
    });
  };

  const addDraggable = () => {
    const id = `venn-${Date.now()}`;
    onChange({
      ...config,
      draggables: [...config.draggables, { id, label: 'New label' }],
    });
  };

  const updateDraggable = (id: string, label: string) => {
    onChange({
      ...config,
      draggables: config.draggables.map((d) => (d.id === id ? { ...d, label } : d)),
    });
  };

  const removeDraggable = (id: string) => {
    // Also strip the draggable from the answer key.
    const newCorrect: Partial<Record<VennRegionId, string[]>> = {};
    (Object.entries(config.correct_answer) as [VennRegionId, string[]][]).forEach(([r, ids]) => {
      const filtered = ids.filter((d) => d !== id);
      if (filtered.length) newCorrect[r] = filtered;
    });
    onChange({
      ...config,
      draggables: config.draggables.filter((d) => d.id !== id),
      correct_answer: newCorrect,
    });
  };

  const toggleCorrect = (draggableId: string, regionId: VennRegionId) => {
    const current = config.correct_answer[regionId] || [];
    const next = current.includes(draggableId)
      ? current.filter((id) => id !== draggableId)
      : [...current, draggableId];
    const correct = { ...config.correct_answer };
    if (next.length) correct[regionId] = next;
    else delete correct[regionId];
    onChange({ ...config, correct_answer: correct });
  };

  // Build region preview state from the current correct_answer.
  const previewRegions = Object.fromEntries(
    VENN_REGIONS.map(({ id }) => {
      const labels = (config.correct_answer[id] || [])
        .map((dId) => config.draggables.find((d) => d.id === dId)?.label)
        .filter(Boolean) as string[];
      return [id, labels.length ? { state: 'filled' as const, badge: labels[0] } : {}];
    })
  );

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">🎯 Venn Diagram (drag)</Badge>
          <span className="text-xs text-muted-foreground">2-set MVP</span>
        </div>

        {/* Set labels */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Set A label</Label>
            <Input
              value={setLabels.A}
              onChange={(e) => updateLabel('A', e.target.value)}
              maxLength={6}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Set B label</Label>
            <Input
              value={setLabels.B}
              onChange={(e) => updateLabel('B', e.target.value)}
              maxLength={6}
              className="h-8"
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="flex justify-center bg-muted/30 rounded-lg p-3">
          <VennDiagram regions={previewRegions} setLabels={setLabels} compact />
        </div>

        {/* Draggable labels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Draggable labels</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addDraggable} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add label
            </Button>
          </div>

          {config.draggables.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No labels yet. Click "Add label" to begin.</p>
          )}

          {config.draggables.map((d) => (
            <div key={d.id} className="space-y-1.5 border rounded-md p-2 bg-card">
              <div className="flex items-center gap-2">
                <Input
                  value={d.label}
                  onChange={(e) => updateDraggable(d.id, e.target.value)}
                  placeholder="e.g. A ∩ B"
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDraggable(d.id)}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Region picker for this label */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground self-center mr-1">Correct region:</span>
                {VENN_REGIONS.map((r) => {
                  const isCorrect = (config.correct_answer[r.id] || []).includes(d.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleCorrect(d.id, r.id)}
                      className={cn(
                        'text-[11px] px-2 py-1 rounded border transition-colors',
                        isCorrect
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-input'
                      )}
                    >
                      {isCorrect && <Check className="w-3 h-3 inline mr-1" />}
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          Tip: a label can belong to more than one region if needed (e.g. union answers).
        </p>
      </CardContent>
    </Card>
  );
};

export default VennDiagramEditor;
