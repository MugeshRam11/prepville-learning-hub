import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Circle, Minus, MousePointer2, Trash2, PenTool, Type
} from 'lucide-react';
import GraphPlotPlayer, { type GraphValue } from './GraphPlotPlayer';

// ── Data types ────────────────────────────────────
export interface GraphPlotPoint {
  id: string; x: number; y: number;
}
export interface GraphPlotLine {
  id: string;
  from: { x: number; y: number };
  to:   { x: number; y: number };
}
export interface GraphBlankAnswer {
  id: string; x: number; y: number; answer: string;
}

export interface GraphPlotConfig {
  mode: '2d';
  canvas: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    gridStep: number;
    showAxisLabels: boolean;
    showNumbers: boolean;
  };
  allowedTools: string[];
  expectedAnswer: {
    points: GraphPlotPoint[];
    lines:  GraphPlotLine[];
    blanks?: GraphBlankAnswer[];
  };
  scoring: {
    pointTolerance: number;
    marksPerPoint:  number;
    marksPerLine:   number;
    partialCredit:  boolean;
  };
  evaluationNotes: string;
}

export const createDefaultGraphPlotConfig = (): GraphPlotConfig => ({
  mode: '2d',
  canvas: {
    xMin: -10, xMax: 10,
    yMin: -10, yMax: 10,
    gridStep: 1,
    showAxisLabels: true,
    showNumbers: true,
  },
  allowedTools: ['point', 'line', 'move', 'fill_blank', 'erase'],
  expectedAnswer: { points: [], lines: [], blanks: [] },
  scoring: {
    pointTolerance: 0.25,
    marksPerPoint:  0.5,
    marksPerLine:   1,
    partialCredit:  true,
  },
  evaluationNotes: '',
});

const ALL_TOOLS = [
  { id: 'point',      label: 'Plot Point',  icon: <Circle       className="w-3.5 h-3.5" /> },
  { id: 'line',       label: 'Draw Line',   icon: <Minus        className="w-3.5 h-3.5" /> },
  { id: 'segment',    label: 'Segment',     icon: <PenTool      className="w-3.5 h-3.5" /> },
  { id: 'move',       label: 'Move',        icon: <MousePointer2 className="w-3.5 h-3.5" /> },
  { id: 'fill_blank', label: 'Fill Blank',  icon: <Type         className="w-3.5 h-3.5" /> },
  { id: 'erase',      label: 'Erase',       icon: <Trash2       className="w-3.5 h-3.5" /> },
];

interface GraphPlotConfigEditorProps {
  config: GraphPlotConfig;
  onChange: (config: GraphPlotConfig) => void;
}

const GraphPlotConfigEditor: React.FC<GraphPlotConfigEditorProps> = ({ config, onChange }) => {
  const update       = (patch: Partial<GraphPlotConfig>) => onChange({ ...config, ...patch });
  const updateCanvas = (patch: Partial<GraphPlotConfig['canvas']>) =>
    update({ canvas: { ...config.canvas, ...patch } });
  const updateScoring = (patch: Partial<GraphPlotConfig['scoring']>) =>
    update({ scoring: { ...config.scoring, ...patch } });

  const toggleTool = (toolId: string) => {
    const tools = config.allowedTools.includes(toolId)
      ? config.allowedTools.filter(t => t !== toolId)
      : [...config.allowedTools, toolId];
    update({ allowedTools: tools });
  };

  // Bridge between GraphPlotPlayer's GraphValue and config.expectedAnswer
  const playerValue: GraphValue = {
    points: config.expectedAnswer.points,
    lines:  config.expectedAnswer.lines,
    blanks: config.expectedAnswer.blanks ?? [],
  };

  const handlePlayerChange = (val: GraphValue) => {
    update({
      expectedAnswer: {
        points: val.points,
        lines:  val.lines,
        blanks: val.blanks ?? [],
      },
    });
  };

  const clearExpected = () =>
    update({ expectedAnswer: { points: [], lines: [], blanks: [] } });

  const totalExpected =
    config.expectedAnswer.points.length +
    config.expectedAnswer.lines.length  +
    (config.expectedAnswer.blanks?.length ?? 0);

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        📊 Graph Plotting Configuration
      </h4>

      {/* Step 1 — Canvas */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Step 1 — Canvas
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><Label className="text-xs">X Min</Label>
            <Input type="number" value={config.canvas.xMin} onChange={e => updateCanvas({ xMin: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">X Max</Label>
            <Input type="number" value={config.canvas.xMax} onChange={e => updateCanvas({ xMax: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Y Min</Label>
            <Input type="number" value={config.canvas.yMin} onChange={e => updateCanvas({ yMin: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Y Max</Label>
            <Input type="number" value={config.canvas.yMax} onChange={e => updateCanvas({ yMax: +e.target.value })} className="h-8" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Grid Step</Label>
            <Input type="number" min={0.5} step={0.5} value={config.canvas.gridStep}
              onChange={e => updateCanvas({ gridStep: +e.target.value })} className="h-8" /></div>
          <div className="flex items-center gap-2 pt-4">
            <Switch checked={config.canvas.showAxisLabels} onCheckedChange={v => updateCanvas({ showAxisLabels: v })} />
            <Label className="text-xs">Axis Labels</Label>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Switch checked={config.canvas.showNumbers} onCheckedChange={v => updateCanvas({ showNumbers: v })} />
            <Label className="text-xs">Tick Numbers</Label>
          </div>
        </div>
      </div>

      {/* Step 2 — Student tools */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Step 2 — Student Tools
        </Label>
        <div className="flex flex-wrap gap-2">
          {ALL_TOOLS.map(tool => (
            <label key={tool.id}
              className="flex items-center gap-1.5 cursor-pointer bg-background border rounded-lg px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={config.allowedTools.includes(tool.id)}
                onCheckedChange={() => toggleTool(tool.id)}
              />
              {tool.icon}
              <span>{tool.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Step 3 — Expected answer (reuses GraphPlotPlayer with pan/zoom/fill) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Step 3 — Expected Answer
          </Label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {totalExpected} item{totalExpected !== 1 ? 's' : ''}
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearExpected}>
              Clear all
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-2">
          <GraphPlotPlayer
            canvasConfig={{
              xMin:           config.canvas.xMin,
              xMax:           config.canvas.xMax,
              yMin:           config.canvas.yMin,
              yMax:           config.canvas.yMax,
              gridStep:       config.canvas.gridStep,
              showNumbers:    config.canvas.showNumbers,
              showAxisLabels: config.canvas.showAxisLabels,
            }}
            allowedTools={['point', 'line', 'move', 'fill_blank', 'erase']}
            value={playerValue}
            onChange={handlePlayerChange}
            width={400}
            height={400}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Use the tools above to mark the expected answer. Pan with Move · scroll to zoom · Fill to add equation blanks.
        </p>
      </div>

      {/* Step 4 — Scoring */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Step 4 — Scoring
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><Label className="text-xs">Point Tolerance</Label>
            <Input type="number" step={0.05} min={0} value={config.scoring.pointTolerance}
              onChange={e => updateScoring({ pointTolerance: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Marks / Point</Label>
            <Input type="number" step={0.5} min={0} value={config.scoring.marksPerPoint}
              onChange={e => updateScoring({ marksPerPoint: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Marks / Line</Label>
            <Input type="number" step={0.5} min={0} value={config.scoring.marksPerLine}
              onChange={e => updateScoring({ marksPerLine: +e.target.value })} className="h-8" /></div>
          <div className="flex items-center gap-2 pt-4">
            <Switch checked={config.scoring.partialCredit}
              onCheckedChange={v => updateScoring({ partialCredit: v })} />
            <Label className="text-xs">Partial Credit</Label>
          </div>
        </div>
      </div>

      {/* Evaluation notes */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Evaluation Notes
        </Label>
        <Textarea
          value={config.evaluationNotes}
          onChange={e => update({ evaluationNotes: e.target.value })}
          placeholder="E.g. Award full marks if points are within tolerance and line passes through them."
          className="mt-1 text-sm min-h-[60px]"
        />
      </div>
    </div>
  );
};

export default GraphPlotConfigEditor;
