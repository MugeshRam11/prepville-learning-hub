import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings, RotateCcw, Circle, Minus, MousePointer2, Trash2, PenTool
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';

// ── Data types ────────────────────────────────────
export interface GraphPlotPoint {
  id: string;
  x: number;
  y: number;
}

export interface GraphPlotLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface GraphPlotConfig {
  mode: '2d';
  canvas: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    gridStep: number;
    showAxisLabels: boolean;
    showNumbers: boolean;
  };
  allowedTools: string[];
  expectedAnswer: {
    points: GraphPlotPoint[];
    lines: GraphPlotLine[];
  };
  scoring: {
    pointTolerance: number;
    marksPerPoint: number;
    marksPerLine: number;
    partialCredit: boolean;
  };
  evaluationNotes: string;
}

export const createDefaultGraphPlotConfig = (): GraphPlotConfig => ({
  mode: '2d',
  canvas: {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    gridStep: 1,
    showAxisLabels: true,
    showNumbers: true,
  },
  allowedTools: ['point', 'line', 'move', 'erase'],
  expectedAnswer: { points: [], lines: [] },
  scoring: {
    pointTolerance: 0.25,
    marksPerPoint: 0.5,
    marksPerLine: 1,
    partialCredit: true,
  },
  evaluationNotes: '',
});

// ── All available tools ──
const ALL_TOOLS = [
  { id: 'point', label: 'Plot Point', icon: <Circle className="w-3.5 h-3.5" /> },
  { id: 'line', label: 'Draw Line', icon: <Minus className="w-3.5 h-3.5" /> },
  { id: 'segment', label: 'Segment', icon: <PenTool className="w-3.5 h-3.5" /> },
  { id: 'move', label: 'Move', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
  { id: 'erase', label: 'Erase', icon: <Trash2 className="w-3.5 h-3.5" /> },
];

// ── Props ──
interface GraphPlotConfigEditorProps {
  config: GraphPlotConfig;
  onChange: (config: GraphPlotConfig) => void;
}

// ── Component ──
const GraphPlotConfigEditor: React.FC<GraphPlotConfigEditorProps> = ({ config, onChange }) => {
  const [editorMode, setEditorMode] = useState<'point' | 'line'>('point');
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const update = (patch: Partial<GraphPlotConfig>) => onChange({ ...config, ...patch });
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

  // ── SVG graph helpers ──
  const W = 360, H = 360;
  const { xMin, xMax, yMin, yMax } = config.canvas;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const toSvgX = (gx: number) => ((gx - xMin) / xRange) * W;
  const toSvgY = (gy: number) => H - ((gy - yMin) / yRange) * H;
  const toGraphX = (sx: number) => Math.round(((sx / W) * xRange + xMin) * 2) / 2;
  const toGraphY = (sy: number) => Math.round((((H - sy) / H) * yRange + yMin) * 2) / 2;

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const gx = toGraphX(sx);
    const gy = toGraphY(sy);

    if (editorMode === 'point') {
      const newPt: GraphPlotPoint = { id: `p-${Date.now()}`, x: gx, y: gy };
      update({
        expectedAnswer: {
          ...config.expectedAnswer,
          points: [...config.expectedAnswer.points, newPt],
        },
      });
    } else if (editorMode === 'line') {
      if (!lineStart) {
        setLineStart({ x: gx, y: gy });
      } else {
        const newLine: GraphPlotLine = {
          id: `l-${Date.now()}`,
          from: lineStart,
          to: { x: gx, y: gy },
        };
        update({
          expectedAnswer: {
            ...config.expectedAnswer,
            lines: [...config.expectedAnswer.lines, newLine],
          },
        });
        setLineStart(null);
      }
    }
  }, [editorMode, lineStart, config, xMin, xMax, yMin, yMax]);

  const removePoint = (id: string) =>
    update({ expectedAnswer: { ...config.expectedAnswer, points: config.expectedAnswer.points.filter(p => p.id !== id) } });
  const removeLine = (id: string) =>
    update({ expectedAnswer: { ...config.expectedAnswer, lines: config.expectedAnswer.lines.filter(l => l.id !== id) } });
  const clearExpected = () => {
    update({ expectedAnswer: { points: [], lines: [] } });
    setLineStart(null);
  };

  // Grid lines
  const gridLines: React.ReactNode[] = [];
  const step = config.canvas.gridStep || 1;
  for (let gx = Math.ceil(xMin / step) * step; gx <= xMax; gx += step) {
    const sx = toSvgX(gx);
    gridLines.push(<line key={`vg-${gx}`} x1={sx} y1={0} x2={sx} y2={H} className="stroke-muted-foreground/15" strokeWidth={1} />);
  }
  for (let gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) {
    const sy = toSvgY(gy);
    gridLines.push(<line key={`hg-${gy}`} x1={0} y1={sy} x2={W} y2={sy} className="stroke-muted-foreground/15" strokeWidth={1} />);
  }

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        📊 Graph Plotting Configuration
      </h4>

      {/* Step 1 — Canvas settings */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 1 — Canvas</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><Label className="text-xs">X Min</Label><Input type="number" value={config.canvas.xMin} onChange={e => updateCanvas({ xMin: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">X Max</Label><Input type="number" value={config.canvas.xMax} onChange={e => updateCanvas({ xMax: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Y Min</Label><Input type="number" value={config.canvas.yMin} onChange={e => updateCanvas({ yMin: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Y Max</Label><Input type="number" value={config.canvas.yMax} onChange={e => updateCanvas({ yMax: +e.target.value })} className="h-8" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs">Grid Step</Label><Input type="number" min={0.5} step={0.5} value={config.canvas.gridStep} onChange={e => updateCanvas({ gridStep: +e.target.value })} className="h-8" /></div>
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

      {/* Step 2 — Tools */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 2 — Student Tools</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_TOOLS.map(tool => (
            <label key={tool.id} className="flex items-center gap-1.5 cursor-pointer bg-background border rounded-lg px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors">
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

      {/* Step 3 — Expected answer builder */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 3 — Expected Answer</Label>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1 gap-0.5">
            <Button size="sm" variant={editorMode === 'point' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setEditorMode('point')}>
              <Circle className="w-3 h-3 mr-1" />Point
            </Button>
            <Button size="sm" variant={editorMode === 'line' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setEditorMode('line')}>
              <Minus className="w-3 h-3 mr-1" />Line
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearExpected}>
            <RotateCcw className="w-3 h-3 mr-1" />Clear
          </Button>
          <Badge variant="secondary" className="text-xs ml-auto">
            {config.expectedAnswer.points.length} pts, {config.expectedAnswer.lines.length} lines
          </Badge>
        </div>

        {lineStart && (
          <p className="text-xs text-primary">Click to set line end point…</p>
        )}

        {/* SVG Canvas */}
        <div className="flex justify-center">
          <div className="border-2 border-border rounded-lg overflow-hidden bg-card">
            <svg ref={svgRef} width={W} height={H} className="block cursor-crosshair" onClick={handleSvgClick}>
              {/* Grid */}
              {gridLines}

              {/* Axes */}
              <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={H} className="stroke-foreground" strokeWidth={1.5} />
              <line x1={0} y1={toSvgY(0)} x2={W} y2={toSvgY(0)} className="stroke-foreground" strokeWidth={1.5} />

              {/* Tick numbers */}
              {config.canvas.showNumbers && (
                <>
                  {Array.from({ length: Math.floor((xMax - xMin) / step) + 1 }).map((_, i) => {
                    const gx = Math.ceil(xMin / step) * step + i * step;
                    if (gx === 0 || gx > xMax) return null;
                    return <text key={`tx-${gx}`} x={toSvgX(gx)} y={toSvgY(0) + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">{gx}</text>;
                  })}
                  {Array.from({ length: Math.floor((yMax - yMin) / step) + 1 }).map((_, i) => {
                    const gy = Math.ceil(yMin / step) * step + i * step;
                    if (gy === 0 || gy > yMax) return null;
                    return <text key={`ty-${gy}`} x={toSvgX(0) - 6} y={toSvgY(gy) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{gy}</text>;
                  })}
                </>
              )}

              {/* Axis labels */}
              {config.canvas.showAxisLabels && (
                <>
                  <text x={W - 12} y={toSvgY(0) - 6} className="fill-foreground text-xs font-medium">x</text>
                  <text x={toSvgX(0) + 8} y={14} className="fill-foreground text-xs font-medium">y</text>
                </>
              )}

              {/* Expected lines */}
              {config.expectedAnswer.lines.map(l => (
                <line key={l.id} x1={toSvgX(l.from.x)} y1={toSvgY(l.from.y)} x2={toSvgX(l.to.x)} y2={toSvgY(l.to.y)}
                  stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
              ))}

              {/* Line start preview */}
              {lineStart && (
                <circle cx={toSvgX(lineStart.x)} cy={toSvgY(lineStart.y)} r={5} className="fill-primary" opacity={0.6} />
              )}

              {/* Expected points */}
              {config.expectedAnswer.points.map(p => (
                <g key={p.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); removePoint(p.id); }}>
                  <circle cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={6} className="fill-primary" />
                  <text x={toSvgX(p.x)} y={toSvgY(p.y) - 10} textAnchor="middle" className="fill-primary text-[10px] font-medium">
                    ({p.x},{p.y})
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">Click on canvas to add expected points/lines. Click a point to remove it.</p>
      </div>

      {/* Step 4 — Scoring */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 4 — Scoring</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><Label className="text-xs">Point Tolerance</Label><Input type="number" step={0.05} min={0} value={config.scoring.pointTolerance} onChange={e => updateScoring({ pointTolerance: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Marks / Point</Label><Input type="number" step={0.5} min={0} value={config.scoring.marksPerPoint} onChange={e => updateScoring({ marksPerPoint: +e.target.value })} className="h-8" /></div>
          <div><Label className="text-xs">Marks / Line</Label><Input type="number" step={0.5} min={0} value={config.scoring.marksPerLine} onChange={e => updateScoring({ marksPerLine: +e.target.value })} className="h-8" /></div>
          <div className="flex items-center gap-2 pt-4">
            <Switch checked={config.scoring.partialCredit} onCheckedChange={v => updateScoring({ partialCredit: v })} />
            <Label className="text-xs">Partial Credit</Label>
          </div>
        </div>
      </div>

      {/* Evaluation notes */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evaluation Notes</Label>
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
