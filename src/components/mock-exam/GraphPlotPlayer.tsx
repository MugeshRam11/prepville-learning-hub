import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MousePointer2, Circle, Minus, Trash2, RotateCcw
} from 'lucide-react';

interface GraphPoint {
  id: string;
  x: number;
  y: number;
}

interface GraphLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface CanvasConfig {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  gridStep: number;
  showNumbers: boolean;
  showAxisLabels: boolean;
}

interface GraphPlotPlayerProps {
  canvasConfig: CanvasConfig;
  allowedTools: string[];
  value: { points: GraphPoint[]; lines: GraphLine[] };
  onChange: (value: { points: GraphPoint[]; lines: GraphLine[] }) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  /** Readonly mode for review/evaluation */
  readonly?: boolean;
  /** Expected answer overlay for comparison */
  expectedAnswer?: { points: GraphPoint[]; lines: GraphLine[] };
  /** Which view: 'student' | 'correct' | 'compare' */
  viewMode?: 'student' | 'correct' | 'compare';
}

const TOOL_DEFS = [
  { id: 'point', label: 'Point', icon: <Circle className="w-4 h-4" /> },
  { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" /> },
  { id: 'move', label: 'Move', icon: <MousePointer2 className="w-4 h-4" /> },
  { id: 'erase', label: 'Erase', icon: <Trash2 className="w-4 h-4" /> },
];

const GraphPlotPlayer: React.FC<GraphPlotPlayerProps> = ({
  canvasConfig,
  allowedTools,
  value,
  onChange,
  disabled = false,
  width = 400,
  height = 400,
  readonly = false,
  expectedAnswer,
  viewMode = 'student',
}) => {
  const { xMin, xMax, yMin, yMax, gridStep, showNumbers, showAxisLabels } = canvasConfig;
  const [activeTool, setActiveTool] = useState<string>(allowedTools[0] || 'point');
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPointId, setDragPointId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const xRange = (xMax - xMin) || 1;
  const yRange = (yMax - yMin) || 1;
  const toSvgX = (gx: number) => ((gx - xMin) / xRange) * width;
  const toSvgY = (gy: number) => height - ((gy - yMin) / yRange) * height;
  const toGraphX = (sx: number) => {
    const raw = (sx / width) * xRange + xMin;
    const step = gridStep || 1;
    return Math.round(raw / step) * step;
  };
  const toGraphY = (sy: number) => {
    const raw = ((height - sy) / height) * yRange + yMin;
    const step = gridStep || 1;
    return Math.round(raw / step) * step;
  };

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly || disabled) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const gx = toGraphX(sx);
    const gy = toGraphY(sy);

    if (activeTool === 'point') {
      const newPt: GraphPoint = { id: `pt-${Date.now()}`, x: gx, y: gy };
      onChange({ ...value, points: [...value.points, newPt] });
    } else if (activeTool === 'line') {
      if (!lineStart) {
        setLineStart({ x: gx, y: gy });
      } else {
        const newLine: GraphLine = { id: `ln-${Date.now()}`, from: lineStart, to: { x: gx, y: gy } };
        onChange({ ...value, lines: [...value.lines, newLine] });
        setLineStart(null);
      }
    } else if (activeTool === 'erase') {
      // Remove nearest point or line endpoint
      const tolerance = (xRange / width) * 15;
      const remaining = value.points.filter(p => Math.abs(p.x - gx) > tolerance || Math.abs(p.y - gy) > tolerance);
      if (remaining.length < value.points.length) {
        onChange({ ...value, points: remaining });
      } else {
        const remainingLines = value.lines.filter(l => {
          const d1 = Math.abs(l.from.x - gx) + Math.abs(l.from.y - gy);
          const d2 = Math.abs(l.to.x - gx) + Math.abs(l.to.y - gy);
          return d1 > tolerance * 2 && d2 > tolerance * 2;
        });
        if (remainingLines.length < value.lines.length) {
          onChange({ ...value, lines: remainingLines });
        }
      }
    }
  }, [activeTool, lineStart, value, readonly, disabled, xMin, xMax, yMin, yMax, width, height, gridStep]);

  const handleClear = () => {
    onChange({ points: [], lines: [] });
    setLineStart(null);
  };

  // Build grid
  const step = gridStep || 1;
  const gridElements: React.ReactNode[] = [];
  for (let gx = Math.ceil(xMin / step) * step; gx <= xMax; gx += step) {
    const sx = toSvgX(gx);
    gridElements.push(<line key={`v-${gx}`} x1={sx} y1={0} x2={sx} y2={height} className="stroke-border" strokeWidth={0.5} />);
  }
  for (let gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) {
    const sy = toSvgY(gy);
    gridElements.push(<line key={`h-${gy}`} x1={0} y1={sy} x2={width} y2={sy} className="stroke-border" strokeWidth={0.5} />);
  }

  // Points and lines to render
  const showStudent = viewMode === 'student' || viewMode === 'compare';
  const showExpected = (viewMode === 'correct' || viewMode === 'compare') && expectedAnswer;
  const studentPts = showStudent ? value.points : [];
  const studentLns = showStudent ? value.lines : [];
  const expectedPts = showExpected ? expectedAnswer!.points : [];
  const expectedLns = showExpected ? expectedAnswer!.lines : [];

  const visibleTools = TOOL_DEFS.filter(t => allowedTools.includes(t.id));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1 gap-0.5">
            {visibleTools.map(tool => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => { setActiveTool(tool.id); setLineStart(null); }}
              >
                {tool.icon}
                <span className="ml-1 hidden sm:inline">{tool.label}</span>
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClear}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />Reset
          </Button>
          <Badge variant="secondary" className="text-xs ml-auto">
            {value.points.length} pts, {value.lines.length} lines
          </Badge>
        </div>
      )}

      {/* Canvas */}
      <div className="flex justify-center">
        <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className={cn('block', !readonly && !disabled && 'cursor-crosshair')}
            onClick={handleClick}
          >
            {/* Grid */}
            {gridElements}

            {/* Axes */}
            <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={height} className="stroke-foreground" strokeWidth={1.5} />
            <line x1={0} y1={toSvgY(0)} x2={width} y2={toSvgY(0)} className="stroke-foreground" strokeWidth={1.5} />

            {/* Tick numbers */}
            {showNumbers && Array.from({ length: Math.floor((xMax - xMin) / step) + 1 }).map((_, i) => {
              const gx = Math.ceil(xMin / step) * step + i * step;
              if (gx === 0 || gx > xMax) return null;
              return <text key={`nx-${gx}`} x={toSvgX(gx)} y={toSvgY(0) + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">{gx}</text>;
            })}
            {showNumbers && Array.from({ length: Math.floor((yMax - yMin) / step) + 1 }).map((_, i) => {
              const gy = Math.ceil(yMin / step) * step + i * step;
              if (gy === 0 || gy > yMax) return null;
              return <text key={`ny-${gy}`} x={toSvgX(0) - 6} y={toSvgY(gy) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{gy}</text>;
            })}

            {/* Axis labels */}
            {showAxisLabels && (
              <>
                <text x={width - 12} y={toSvgY(0) - 6} className="fill-foreground text-xs font-medium">x</text>
                <text x={toSvgX(0) + 8} y={14} className="fill-foreground text-xs font-medium">y</text>
              </>
            )}

            {/* Expected answer (dashed, secondary color) */}
            {expectedLns.map(l => (
              <line key={`el-${l.id}`}
                x1={toSvgX(l.from.x)} y1={toSvgY(l.from.y)}
                x2={toSvgX(l.to.x)} y2={toSvgY(l.to.y)}
                stroke="hsl(var(--accent-foreground))"
                strokeWidth={2} strokeDasharray="6 3" opacity={0.5}
              />
            ))}
            {expectedPts.map(p => (
              <circle key={`ep-${p.id}`} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={5}
                stroke="hsl(var(--accent-foreground))" strokeWidth={2} fill="none" opacity={0.5}
              />
            ))}

            {/* Student lines */}
            {studentLns.map(l => (
              <line key={l.id}
                x1={toSvgX(l.from.x)} y1={toSvgY(l.from.y)}
                x2={toSvgX(l.to.x)} y2={toSvgY(l.to.y)}
                stroke="hsl(var(--primary))" strokeWidth={2}
              />
            ))}

            {/* Line start preview */}
            {lineStart && (
              <circle cx={toSvgX(lineStart.x)} cy={toSvgY(lineStart.y)} r={5} className="fill-primary" opacity={0.5} />
            )}

            {/* Student points */}
            {studentPts.map(p => (
              <g key={p.id}>
                <circle cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={5} className="fill-primary" />
                <text x={toSvgX(p.x)} y={toSvgY(p.y) - 8} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
                  ({p.x},{p.y})
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Instruction */}
      {!readonly && (
        <p className="text-xs text-muted-foreground text-center">
          {activeTool === 'point' && 'Click to place a point (snaps to grid)'}
          {activeTool === 'line' && (lineStart ? 'Click to set the end point' : 'Click to set the start point of a line')}
          {activeTool === 'move' && 'Drag points to reposition them'}
          {activeTool === 'erase' && 'Click near a point or line to remove it'}
        </p>
      )}
    </div>
  );
};

export default GraphPlotPlayer;
