import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DragDropSourceItem {
  id: string;
  type: 'text' | 'image';
  content: string;
  imageUrl?: string;
}

export interface DragDropTargetItem {
  id: string;
  type: 'text' | 'image';
  content: string;
  imageUrl?: string;
}

export interface DragDropMatchingConfig {
  mode: 'match_one_to_one';
  sourceItems: DragDropSourceItem[];
  targetItems: DragDropTargetItem[];
  correctMatches: Record<string, string>; // sourceId -> targetId
  shuffleSource: boolean;
  shuffleTarget: boolean;
  scoring: {
    marksPerMatch: number;
    partialCredit: boolean;
  };
  explanation: string;
  evaluationNotes: string;
}

export const createDefaultDragDropConfig = (): DragDropMatchingConfig => ({
  mode: 'match_one_to_one',
  sourceItems: [
    { id: `src-${Date.now()}-1`, type: 'text', content: '' },
    { id: `src-${Date.now()}-2`, type: 'text', content: '' },
  ],
  targetItems: [
    { id: `tgt-${Date.now()}-1`, type: 'text', content: '' },
    { id: `tgt-${Date.now()}-2`, type: 'text', content: '' },
  ],
  correctMatches: {},
  shuffleSource: true,
  shuffleTarget: false,
  scoring: { marksPerMatch: 1, partialCredit: true },
  explanation: '',
  evaluationNotes: '',
});

interface DragDropMatchingEditorProps {
  config: DragDropMatchingConfig;
  onChange: (config: DragDropMatchingConfig) => void;
}

const DragDropMatchingEditor: React.FC<DragDropMatchingEditorProps> = ({ config, onChange }) => {
  const update = (partial: Partial<DragDropMatchingConfig>) => onChange({ ...config, ...partial });

  // ── Source Items ──
  const addSource = () => {
    const id = `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    update({ sourceItems: [...config.sourceItems, { id, type: 'text', content: '' }] });
  };

  const updateSource = (id: string, changes: Partial<DragDropSourceItem>) => {
    update({ sourceItems: config.sourceItems.map(s => s.id === id ? { ...s, ...changes } : s) });
  };

  const deleteSource = (id: string) => {
    const newMatches = { ...config.correctMatches };
    delete newMatches[id];
    update({ sourceItems: config.sourceItems.filter(s => s.id !== id), correctMatches: newMatches });
  };

  // ── Target Items ──
  const addTarget = () => {
    const id = `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    update({ targetItems: [...config.targetItems, { id, type: 'text', content: '' }] });
  };

  const updateTarget = (id: string, changes: Partial<DragDropTargetItem>) => {
    update({ targetItems: config.targetItems.map(t => t.id === id ? { ...t, ...changes } : t) });
  };

  const deleteTarget = (id: string) => {
    // Remove any matches pointing to this target
    const newMatches: Record<string, string> = {};
    Object.entries(config.correctMatches).forEach(([src, tgt]) => {
      if (tgt !== id) newMatches[src] = tgt;
    });
    update({ targetItems: config.targetItems.filter(t => t.id !== id), correctMatches: newMatches });
  };

  // ── Match Mapping ──
  const setMatch = (sourceId: string, targetId: string) => {
    const newMatches = { ...config.correctMatches };
    if (targetId === '__none__') {
      delete newMatches[sourceId];
    } else {
      newMatches[sourceId] = targetId;
    }
    update({ correctMatches: newMatches });
  };

  const matchedCount = Object.keys(config.correctMatches).length;
  const totalPairs = Math.min(config.sourceItems.length, config.targetItems.length);

  return (
    <div className="space-y-5 border rounded-xl p-4 bg-muted/10">
      <div className="flex items-center gap-2">
        <GripVertical className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">Drag & Drop Matching Configuration</h3>
      </div>

      {/* Step 1 — Source Items */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Step 1 — Source Items (Draggable)</Label>
            <Badge variant="outline" className="text-xs">{config.sourceItems.length} items</Badge>
          </div>
          <p className="text-xs text-muted-foreground">These are the items students will drag.</p>

          {config.sourceItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
              <Input
                value={item.content}
                onChange={(e) => updateSource(item.id, { content: e.target.value })}
                placeholder={`Source item ${idx + 1}...`}
                className="h-8 text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => deleteSource(item.id)}
                disabled={config.sourceItems.length <= 2}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addSource} className="w-full border-dashed">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Source Item
          </Button>
        </CardContent>
      </Card>

      {/* Step 2 — Target Items */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Step 2 — Target Items (Drop Areas)</Label>
            <Badge variant="outline" className="text-xs">{config.targetItems.length} targets</Badge>
          </div>
          <p className="text-xs text-muted-foreground">These are the slots students drop items into.</p>

          {config.targetItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{String.fromCharCode(65 + idx)}.</span>
              <Input
                value={item.content}
                onChange={(e) => updateTarget(item.id, { content: e.target.value })}
                placeholder={`Target ${String.fromCharCode(65 + idx)}...`}
                className="h-8 text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => deleteTarget(item.id)}
                disabled={config.targetItems.length <= 2}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addTarget} className="w-full border-dashed">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Target
          </Button>
        </CardContent>
      </Card>

      {/* Step 3 — Correct Match Mapping */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Step 3 — Correct Matches</Label>
            <Badge variant={matchedCount === totalPairs ? 'default' : 'secondary'} className="text-xs">
              {matchedCount}/{totalPairs} mapped
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">For each source item, select the correct target it should match to.</p>

          {config.sourceItems.map((source, idx) => {
            const currentTarget = config.correctMatches[source.id];
            const matchedTarget = config.targetItems.find(t => t.id === currentTarget);

            return (
              <div key={source.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                  <span className="text-sm truncate">{source.content || `Source ${idx + 1}`}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select
                  value={currentTarget || '__none__'}
                  onValueChange={(v) => setMatch(source.id, v)}
                >
                  <SelectTrigger className="h-8 text-sm w-48 shrink-0">
                    <SelectValue placeholder="Select target..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not mapped —</SelectItem>
                    {config.targetItems.map((target, ti) => (
                      <SelectItem key={target.id} value={target.id}>
                        {String.fromCharCode(65 + ti)}. {target.content || `Target ${ti + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {matchedTarget && (
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Step 4 — Advanced Settings */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <Label className="text-sm font-medium">Step 4 — Settings</Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Shuffle source items</Label>
              <Switch checked={config.shuffleSource} onCheckedChange={(v) => update({ shuffleSource: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Shuffle target items</Label>
              <Switch checked={config.shuffleTarget} onCheckedChange={(v) => update({ shuffleTarget: v })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Marks per correct match</Label>
              <Input
                type="number"
                min={0.25}
                step={0.25}
                value={config.scoring.marksPerMatch}
                onChange={(e) => update({ scoring: { ...config.scoring, marksPerMatch: parseFloat(e.target.value) || 1 } })}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center justify-between pt-4">
              <Label className="text-xs">Partial credit</Label>
              <Switch checked={config.scoring.partialCredit} onCheckedChange={(v) => update({ scoring: { ...config.scoring, partialCredit: v } })} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Explanation (shown after evaluation)</Label>
            <Textarea
              value={config.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
              placeholder="Explain the correct matches..."
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

export default DragDropMatchingEditor;
