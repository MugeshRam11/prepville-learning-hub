import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MousePointer2, Circle, Minus, Trash2, RotateCcw,
  ZoomIn, ZoomOut, Type, X, CheckCircle2
} from 'lucide-react';
import MathLiveKeyboard from '@/components/mock-exam/MathLiveKeyboard';
import { normalizeMath } from '@/lib/mathFormat';

// ── types ────────────────────────────────────────────────────────────────────
interface GraphPoint { id: string; x: number; y: number }
interface GraphLine  { id: string; from: { x: number; y: number }; to: { x: number; y: number } }
export interface GraphBlank { id: string; x: number; y: number; answer: string; w?: number; h?: number }

export interface GraphValue {
  points: GraphPoint[];
  lines:  GraphLine[];
  blanks?: GraphBlank[];
}

interface CanvasConfig {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  gridStep: number;
  showNumbers: boolean;
  showAxisLabels: boolean;
}

interface GraphPlotPlayerProps {
  canvasConfig: CanvasConfig;
  allowedTools: string[];
  value: GraphValue;
  onChange: (value: GraphValue) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  readonly?: boolean;
  expectedAnswer?: GraphValue;
  viewMode?: 'student' | 'correct' | 'compare';
}

// ── constants ─────────────────────────────────────────────────────────────────
const ZOOM_FACTOR = 1.25;
const DEFAULT_BLANK_W = 80;
const DEFAULT_BLANK_H = 28;
const MIN_BLANK_W = 40;
const MIN_BLANK_H = 20;
const MAX_BLANK_W = 200;
const MAX_BLANK_H = 60;
const HANDLE_SIZE = 6;

const TOOL_DEFS = [
  { id: 'point',      label: 'Point',  icon: <Circle       className="w-4 h-4" /> },
  { id: 'line',       label: 'Line',   icon: <Minus        className="w-4 h-4" /> },
  { id: 'move',       label: 'Move',   icon: <MousePointer2 className="w-4 h-4" /> },
  { id: 'fill_blank', label: 'Fill',   icon: <Type         className="w-4 h-4" /> },
  { id: 'erase',      label: 'Erase',  icon: <Trash2       className="w-4 h-4" /> },
];

// ── component ─────────────────────────────────────────────────────────────────
const GraphPlotPlayer: React.FC<GraphPlotPlayerProps> = ({
  canvasConfig,
  allowedTools,
  value,
  onChange,
  disabled  = false,
  width     = 400,
  height    = 400,
  readonly  = false,
  expectedAnswer,
  viewMode  = 'student',
}) => {
  const { gridStep, showNumbers, showAxisLabels } = canvasConfig;
  const blanks: GraphBlank[] = value.blanks ?? [];

  // ── view state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState({
    xMin: canvasConfig.xMin, xMax: canvasConfig.xMax,
    yMin: canvasConfig.yMin, yMax: canvasConfig.yMax,
  });

  useEffect(() => {
    setView({
      xMin: canvasConfig.xMin, xMax: canvasConfig.xMax,
      yMin: canvasConfig.yMin, yMax: canvasConfig.yMax,
    });
  }, [canvasConfig.xMin, canvasConfig.xMax, canvasConfig.yMin, canvasConfig.yMax]);

  const { xMin, xMax, yMin, yMax } = view;
  const xRange = (xMax - xMin) || 1;
  const yRange = (yMax - yMin) || 1;

  const toSvgX     = useCallback((gx: number) => ((gx - xMin) / xRange) * width,         [xMin, xRange, width]);
  const toSvgY     = useCallback((gy: number) => height - ((gy - yMin) / yRange) * height, [yMin, yRange, height]);
  const toGraphXRaw = useCallback((sx: number) => (sx / width)  * xRange + xMin,          [width, xRange, xMin]);
  const toGraphYRaw = useCallback((sy: number) => ((height - sy) / height) * yRange + yMin, [height, yRange, yMin]);
  const snap = useCallback((v: number) => {
    const s = gridStep || 1; return Math.round(v / s) * s;
  }, [gridStep]);
  const toGraphX = useCallback((sx: number) => snap(toGraphXRaw(sx)), [toGraphXRaw, snap]);
  const toGraphY = useCallback((sy: number) => snap(toGraphYRaw(sy)), [toGraphYRaw, snap]);

  // ── tool / drag / line state ────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<string>(allowedTools[0] || 'point');
  const [lineStart,  setLineStart]  = useState<{ x: number; y: number } | null>(null);
  const [dragging,   setDragging]   = useState(false);
  const svgRef    = useRef<SVGSVGElement>(null);
  const dragState = useRef<{
    kind: 'pan' | 'point' | 'blank-resize';
    startClient: { x: number; y: number };
    startView?: typeof view;
    pointId?: string;
    blankId?: string;
    startW?: number;
    startH?: number;
    handleDir?: string;
  } | null>(null);

  // ── fill-blank popup state ──────────────────────────────────────────────────
  const [activeBlank, setActiveBlank] = useState<GraphBlank | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [selectedBlankId, setSelectedBlankId] = useState<string | null>(null);
  const justDraggedRef = useRef(false);

  // close MathLive keyboard when popup closes
  useEffect(() => {
    if (!activeBlank) window.mathVirtualKeyboard?.hide();
  }, [activeBlank]);

  // ── zoom helpers ────────────────────────────────────────────────────────────
  const zoomAround = useCallback((cx: number, cy: number, f: number) => {
    setView(v => ({
      xMin: cx + (v.xMin - cx) * f, xMax: cx + (v.xMax - cx) * f,
      yMin: cy + (v.yMin - cy) * f, yMax: cy + (v.yMax - cy) * f,
    }));
  }, []);
  const mid = useCallback(() => ({ cx: (xMin + xMax) / 2, cy: (yMin + yMax) / 2 }), [xMin, xMax, yMin, yMax]);
  const zoomIn  = useCallback(() => { const {cx,cy}=mid(); zoomAround(cx,cy, 1/ZOOM_FACTOR); }, [mid, zoomAround]);
  const zoomOut = useCallback(() => { const {cx,cy}=mid(); zoomAround(cx,cy, ZOOM_FACTOR); },   [mid, zoomAround]);
  const resetView = useCallback(() => setView({
    xMin: canvasConfig.xMin, xMax: canvasConfig.xMax,
    yMin: canvasConfig.yMin, yMax: canvasConfig.yMax,
  }), [canvasConfig]);

  // ── scroll-wheel zoom ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAround(
        toGraphXRaw(e.clientX - rect.left),
        toGraphYRaw(e.clientY - rect.top),
        e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toGraphXRaw, toGraphYRaw, zoomAround]);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const getSvgPos = (e: React.MouseEvent | MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { sx: 0, sy: 0 };
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  };

  const findNearestPoint = useCallback((gx: number, gy: number, thr: number) => {
    let best: GraphPoint | null = null, bestD = Infinity;
    for (const p of value.points) {
      const d = Math.hypot(p.x - gx, p.y - gy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return bestD <= thr ? best : null;
  }, [value.points]);

  const findNearestBlank = useCallback((sx: number, sy: number) => {
    for (const b of blanks) {
      const bw = b.w ?? DEFAULT_BLANK_W;
      const bh = b.h ?? DEFAULT_BLANK_H;
      const bx = toSvgX(b.x), by = toSvgY(b.y) - 18;
      if (Math.abs(sx - bx) <= bw / 2 + 4 && Math.abs(sy - by) <= bh / 2 + 4) return b;
    }
    return null;
  }, [blanks, toSvgX, toSvgY]);

  // ── blank resize start ───────────────────────────────────────────────────────
  const handleBlankResizeStart = useCallback((e: React.MouseEvent, blankId: string, dir: string) => {
    e.stopPropagation();
    e.preventDefault();
    const b = blanks.find(bl => bl.id === blankId);
    if (!b) return;
    dragState.current = {
      kind: 'blank-resize',
      startClient: { x: e.clientX, y: e.clientY },
      blankId,
      startW: b.w ?? DEFAULT_BLANK_W,
      startH: b.h ?? DEFAULT_BLANK_H,
      handleDir: dir,
    };
    setDragging(true);
  }, [blanks]);

  // ── mouse-down (Move tool: pan or drag point) ───────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly || disabled || activeTool !== 'move') return;
    e.preventDefault();
    const { sx, sy } = getSvgPos(e);
    const nearest = findNearestPoint(toGraphXRaw(sx), toGraphYRaw(sy), xRange * 0.04);
    dragState.current = nearest
      ? { kind: 'point', startClient: { x: e.clientX, y: e.clientY }, pointId: nearest.id }
      : { kind: 'pan',   startClient: { x: e.clientX, y: e.clientY }, startView: { ...view } };
    setDragging(true);
  }, [readonly, disabled, activeTool, findNearestPoint, toGraphXRaw, toGraphYRaw, xRange, view]);

  // ── global mouse-move / up while dragging ───────────────────────────────────
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const ds = dragState.current; if (!ds) return;
      if (ds.kind === 'pan' && ds.startView) {
        const dx = e.clientX - ds.startClient.x;
        const dy = e.clientY - ds.startClient.y;
        const dxR = ds.startView.xMax - ds.startView.xMin;
        const dyR = ds.startView.yMax - ds.startView.yMin;
        setView({
          xMin: ds.startView.xMin - (dx / width)  * dxR,
          xMax: ds.startView.xMax - (dx / width)  * dxR,
          yMin: ds.startView.yMin + (dy / height) * dyR,
          yMax: ds.startView.yMax + (dy / height) * dyR,
        });
      } else if (ds.kind === 'point' && ds.pointId) {
        const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return;
        const nx = snap(toGraphXRaw(e.clientX - rect.left));
        const ny = snap(toGraphYRaw(e.clientY - rect.top));
        onChange({ ...value, points: value.points.map(p => p.id === ds.pointId ? { ...p, x: nx, y: ny } : p) });
      } else if (ds.kind === 'blank-resize' && ds.blankId) {
        const dx = e.clientX - ds.startClient.x;
        const dy = e.clientY - ds.startClient.y;
        const dir = ds.handleDir || '';
        let nw = ds.startW!;
        let nh = ds.startH!;
        if (dir.includes('e')) nw = Math.max(MIN_BLANK_W, Math.min(MAX_BLANK_W, ds.startW! + dx));
        if (dir.includes('w')) nw = Math.max(MIN_BLANK_W, Math.min(MAX_BLANK_W, ds.startW! - dx));
        if (dir.includes('s')) nh = Math.max(MIN_BLANK_H, Math.min(MAX_BLANK_H, ds.startH! + dy));
        if (dir.includes('n')) nh = Math.max(MIN_BLANK_H, Math.min(MAX_BLANK_H, ds.startH! - dy));
        onChange({ ...value, blanks: blanks.map(b => b.id === ds.blankId ? { ...b, w: nw, h: nh } : b) });
      }
    };
    const onUp = () => {
      justDraggedRef.current = true;
      requestAnimationFrame(() => { justDraggedRef.current = false; });
      dragState.current = null;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, width, height, snap, toGraphXRaw, toGraphYRaw, value, blanks, onChange]);

  // ── click ───────────────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly || disabled || dragging || justDraggedRef.current) return;
    const { sx, sy } = getSvgPos(e);
    const gx = toGraphX(sx);
    const gy = toGraphY(sy);

    if (!findNearestBlank(sx, sy)) {
      setSelectedBlankId(null);
    }

    if (activeTool === 'point') {
      onChange({ ...value, points: [...value.points, { id: `pt-${Date.now()}`, x: gx, y: gy }] });

    } else if (activeTool === 'line') {
      if (!lineStart) { setLineStart({ x: gx, y: gy }); }
      else {
        onChange({ ...value, lines: [...value.lines, { id: `ln-${Date.now()}`, from: lineStart, to: { x: gx, y: gy } }] });
        setLineStart(null);
      }

    } else if (activeTool === 'fill_blank') {
      const hit = findNearestBlank(sx, sy);
      if (hit) {
        setActiveBlank(hit);
        setDraftAnswer(hit.answer);
      } else {
        const nb: GraphBlank = { id: `bl-${Date.now()}`, x: gx, y: gy, answer: '', w: DEFAULT_BLANK_W, h: DEFAULT_BLANK_H };
        onChange({ ...value, blanks: [...blanks, nb] });
        setSelectedBlankId(nb.id);
      }

    } else if (activeTool === 'erase') {
      const tol = xRange * 0.04;
      // erase blank first
      const hitBlank = findNearestBlank(sx, sy);
      if (hitBlank) {
        onChange({ ...value, blanks: blanks.filter(b => b.id !== hitBlank.id) });
        return;
      }
      const pts = value.points.filter(p => Math.hypot(p.x - gx, p.y - gy) > tol);
      if (pts.length < value.points.length) { onChange({ ...value, points: pts }); return; }
      const lns = value.lines.filter(l =>
        Math.hypot(l.from.x - gx, l.from.y - gy) > tol * 2 &&
        Math.hypot(l.to.x   - gx, l.to.y   - gy) > tol * 2
      );
      if (lns.length < value.lines.length) onChange({ ...value, lines: lns });
    }
  }, [activeTool, lineStart, value, blanks, readonly, disabled, dragging,
      toGraphX, toGraphY, xRange, onChange, findNearestBlank]);

  // ── confirm blank answer ────────────────────────────────────────────────────
  const confirmBlank = useCallback(() => {
    if (!activeBlank) return;
    onChange({
      ...value,
      blanks: blanks.map(b => b.id === activeBlank.id ? { ...b, answer: draftAnswer } : b),
    });
    setActiveBlank(null);
  }, [activeBlank, draftAnswer, value, blanks, onChange]);

  const handleClear = () => { onChange({ points: [], lines: [], blanks: [] }); setLineStart(null); };

  // ── cursor ──────────────────────────────────────────────────────────────────
  const cursor =
    readonly || disabled       ? 'default'
    : activeTool === 'move'    ? (dragging ? 'grabbing' : 'grab')
    : activeTool === 'fill_blank' ? 'cell'
    : 'crosshair';

  // ── grid ────────────────────────────────────────────────────────────────────
  const step = gridStep || 1;
  const gridLines: React.ReactNode[] = [];
  for (let gx = Math.ceil(xMin / step) * step; gx <= xMax + step * 0.01; gx += step) {
    const sx = toSvgX(gx), isAxis = Math.abs(gx) < step * 0.01;
    gridLines.push(<line key={`v-${gx}`} x1={sx} y1={0} x2={sx} y2={height}
      stroke={isAxis ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
      strokeWidth={isAxis ? 1.5 : 0.5} />);
  }
  for (let gy = Math.ceil(yMin / step) * step; gy <= yMax + step * 0.01; gy += step) {
    const sy = toSvgY(gy), isAxis = Math.abs(gy) < step * 0.01;
    gridLines.push(<line key={`h-${gy}`} x1={0} y1={sy} x2={width} y2={sy}
      stroke={isAxis ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
      strokeWidth={isAxis ? 1.5 : 0.5} />);
  }

  const tickLabels: React.ReactNode[] = [];
  if (showNumbers) {
    const axisY = toSvgY(0), axisX = toSvgX(0);
    for (let gx = Math.ceil(xMin / step) * step; gx <= xMax; gx += step) {
      if (Math.abs(gx) < step * 0.01) continue;
      tickLabels.push(<text key={`nx-${gx}`} x={toSvgX(gx)}
        y={Math.min(Math.max(axisY + 14, 14), height - 4)}
        textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
        {Number(gx.toFixed(4))}</text>);
    }
    for (let gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) {
      if (Math.abs(gy) < step * 0.01) continue;
      tickLabels.push(<text key={`ny-${gy}`}
        x={Math.min(Math.max(axisX - 6, 4), width - 4)} y={toSvgY(gy) + 4}
        textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">
        {Number(gy.toFixed(4))}</text>);
    }
  }

  const showStudent  = viewMode === 'student' || viewMode === 'compare';
  const showExpected = (viewMode === 'correct' || viewMode === 'compare') && expectedAnswer;
  const studentPts   = showStudent ? value.points : [];
  const studentLns   = showStudent ? value.lines  : [];
  // fill_blank is always shown — it's a permanent feature regardless of saved config
  const visibleTools = TOOL_DEFS.filter(t => allowedTools.includes(t.id) || t.id === 'fill_blank');

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1 gap-0.5">
            {visibleTools.map(tool => (
              <Button key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'ghost'}
                size="sm" className="h-8 px-2 text-xs"
                onClick={() => { setActiveTool(tool.id); setLineStart(null); setSelectedBlankId(null); }}>
                {tool.icon}
                <span className="ml-1 hidden sm:inline">{tool.label}</span>
              </Button>
            ))}
          </div>

          <div className="flex bg-muted rounded-lg p-1 gap-0.5">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={zoomIn}  title="Zoom in">
              <ZoomIn  className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={zoomOut} title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClear}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />Reset
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={resetView}>
            ⊡ View
          </Button>

          <Badge variant="secondary" className="text-xs ml-auto">
            {value.points.length} pts · {value.lines.length} lines · {blanks.length} blanks
          </Badge>
        </div>
      )}

      {/* Canvas */}
      <div className="flex justify-center">
        <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
          <svg ref={svgRef} width={width} height={height}
            style={{ cursor, display: 'block', userSelect: 'none' }}
            onClick={handleClick} onMouseDown={handleMouseDown}>

            {gridLines}
            {tickLabels}

            {showAxisLabels && (
              <>
                <text x={width - 12} y={Math.min(Math.max(toSvgY(0) - 6, 10), height - 6)}
                  fontSize={12} fontWeight={500} fill="hsl(var(--foreground))">x</text>
                <text x={Math.min(Math.max(toSvgX(0) + 8, 4), width - 14)} y={14}
                  fontSize={12} fontWeight={500} fill="hsl(var(--foreground))">y</text>
              </>
            )}

            {/* Expected overlay */}
            {showExpected && expectedAnswer!.lines.map(l => (
              <line key={`el-${l.id}`}
                x1={toSvgX(l.from.x)} y1={toSvgY(l.from.y)} x2={toSvgX(l.to.x)} y2={toSvgY(l.to.y)}
                stroke="hsl(var(--accent-foreground))" strokeWidth={2} strokeDasharray="6 3" opacity={0.5} />
            ))}
            {showExpected && expectedAnswer!.points.map(p => (
              <circle key={`ep-${p.id}`} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={5}
                stroke="hsl(var(--accent-foreground))" strokeWidth={2} fill="none" opacity={0.5} />
            ))}

            {/* Student lines */}
            {studentLns.map(l => (
              <line key={l.id}
                x1={toSvgX(l.from.x)} y1={toSvgY(l.from.y)} x2={toSvgX(l.to.x)} y2={toSvgY(l.to.y)}
                stroke="hsl(var(--primary))" strokeWidth={2} />
            ))}

            {lineStart && (
              <circle cx={toSvgX(lineStart.x)} cy={toSvgY(lineStart.y)} r={5}
                fill="hsl(var(--primary))" opacity={0.5} />
            )}

            {/* Student points */}
            {studentPts.map(p => (
              <g key={p.id}>
                <circle cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={6} fill="hsl(var(--primary))"
                  style={{ cursor: activeTool === 'move' ? 'grab' : undefined }} />
                <text x={toSvgX(p.x)} y={toSvgY(p.y) - 9} textAnchor="middle"
                  fontSize={10} fontWeight={500} fill="hsl(var(--foreground))">
                  ({Number(p.x.toFixed(2))},{Number(p.y.toFixed(2))})
                </text>
              </g>
            ))}

            {/* Fill-blank markers */}
            {blanks.map(b => {
              const bw = b.w ?? DEFAULT_BLANK_W;
              const bh = b.h ?? DEFAULT_BLANK_H;
              const bx = toSvgX(b.x);
              const by = toSvgY(b.y);
              const boxCY = by - 18 - bh / 2;
              const answered = !!b.answer;
              const isActive = activeBlank?.id === b.id;
              const isSelected = selectedBlankId === b.id;
              const maxChars = Math.max(3, Math.floor(bw / 7));
              const displayText = answered
                ? (() => { const t = normalizeMath(b.answer); return t.length > maxChars ? t.slice(0, maxChars - 1) + '…' : t; })()
                : '✎ fill';
              return (
                <g key={b.id}
                  style={{ cursor: readonly || disabled ? 'default' : 'pointer' }}
                  onClick={(e) => {
                    if (readonly || disabled) return;
                    if (activeTool !== 'fill_blank') return;
                    e.stopPropagation();
                    setActiveBlank(b);
                    setDraftAnswer(b.answer);
                  }}
                  onDoubleClick={(e) => {
                    if (readonly || disabled) return;
                    if (activeTool !== 'fill_blank') return;
                    e.stopPropagation();
                    setSelectedBlankId(prev => prev === b.id ? null : b.id);
                  }}>
                  {/* Connector dot */}
                  <circle cx={bx} cy={by} r={3}
                    fill={answered ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                    opacity={0.7} />
                  {/* Connector line from dot to box bottom-centre */}
                  <line x1={bx} y1={by - 3} x2={bx} y2={by - 18}
                    stroke={answered ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--muted-foreground) / 0.3)'}
                    strokeWidth={1} strokeDasharray="2 2" />
                  {/* Box */}
                  <rect
                    x={bx - bw / 2} y={boxCY}
                    width={bw} height={bh} rx={5}
                    fill={isActive ? 'hsl(var(--primary) / 0.15)'
                         : answered ? 'hsl(var(--primary) / 0.08)'
                         : 'hsl(var(--background))'}
                    stroke={isSelected ? 'hsl(var(--primary))'
                           : isActive ? 'hsl(var(--primary))'
                           : answered ? 'hsl(var(--primary) / 0.6)'
                           : 'hsl(var(--muted-foreground) / 0.5)'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeDasharray={answered ? undefined : '4 2'}
                  />
                  {/* Text inside box — centered */}
                  <text x={bx} y={boxCY + bh / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={Math.min(12, bh * 0.45)} fontWeight={500}
                    fill={answered ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}>
                    {displayText}
                  </text>
                  {/* Resize handles when selected */}
                  {isSelected && !readonly && !disabled && (
                    <>
                      {/* East handle */}
                      <rect x={bx + bw / 2 - HANDLE_SIZE / 2} y={boxCY + bh / 2 - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE} rx={1}
                        fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1}
                        style={{ cursor: 'ew-resize' }}
                        onMouseDown={(e) => handleBlankResizeStart(e, b.id, 'e')} />
                      {/* West handle */}
                      <rect x={bx - bw / 2 - HANDLE_SIZE / 2} y={boxCY + bh / 2 - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE} rx={1}
                        fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1}
                        style={{ cursor: 'ew-resize' }}
                        onMouseDown={(e) => handleBlankResizeStart(e, b.id, 'w')} />
                      {/* North handle */}
                      <rect x={bx - HANDLE_SIZE / 2} y={boxCY - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE} rx={1}
                        fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1}
                        style={{ cursor: 'ns-resize' }}
                        onMouseDown={(e) => handleBlankResizeStart(e, b.id, 'n')} />
                      {/* South handle */}
                      <rect x={bx - HANDLE_SIZE / 2} y={boxCY + bh - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE} rx={1}
                        fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1}
                        style={{ cursor: 'ns-resize' }}
                        onMouseDown={(e) => handleBlankResizeStart(e, b.id, 's')} />
                      {/* SE corner handle */}
                      <rect x={bx + bw / 2 - HANDLE_SIZE / 2} y={boxCY + bh - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE} rx={1}
                        fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1}
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => handleBlankResizeStart(e, b.id, 'se')} />
                      {/* NW corner handle */}
                      <rect x={bx - bw / 2 - HANDLE_SIZE / 2} y={boxCY - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE} height={HANDLE_SIZE} rx={1}
                        fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1}
                        style={{ cursor: 'nwse-resize' }}
                        onMouseDown={(e) => handleBlankResizeStart(e, b.id, 'nw')} />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Instruction */}
      {!readonly && (
        <p className="text-xs text-muted-foreground text-center">
          {activeTool === 'point'      && 'Click to place a point'}
          {activeTool === 'line'       && (lineStart ? 'Click to set the end point' : 'Click to set the start point')}
          {activeTool === 'move'       && 'Drag point to move · drag graph to pan · scroll to zoom'}
          {activeTool === 'fill_blank' && 'Click to add or edit a blank · double-click to resize'}
          {activeTool === 'erase'      && 'Click near a point, line or blank to remove it'}
        </p>
      )}

      {/* ── Fill-blank answer popup ─────────────────────────────────────────── */}
      <AnimatePresence>
        {activeBlank && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveBlank(null)} />

            <motion.div
              className="fixed z-50 left-1/2 -translate-x-1/2 top-[12vh] w-full max-w-lg bg-background border rounded-2xl shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{   opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Fill in the blank
                    <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                      at ({Number(activeBlank.x.toFixed(2))}, {Number(activeBlank.y.toFixed(2))})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Type your answer · toggle <span className="font-medium text-primary">⌨</span> for the equation keyboard
                  </p>
                </div>
                <button onClick={() => setActiveBlank(null)}
                  className="ml-3 rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MathLive input */}
              <div className="px-5 py-4">
                <MathLiveKeyboard
                  value={draftAnswer}
                  onChange={setDraftAnswer}
                  onSubmit={confirmBlank}
                  placeholder="Type or use the equation keyboard…"
                  showKeyboard={true}
                  hideSubmit
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-5 pb-5">
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => setDraftAnswer('')}>
                  Clear
                </Button>
                <Button variant="destructive" size="sm" className="flex-1"
                  onClick={() => {
                    onChange({ ...value, blanks: blanks.filter(b => b.id !== activeBlank.id) });
                    setActiveBlank(null);
                  }}>
                  <Trash2 className="w-4 h-4 mr-1.5" /> Remove blank
                </Button>
                <Button size="sm" className="flex-[2]" onClick={confirmBlank}
                  disabled={!draftAnswer.trim()}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphPlotPlayer;
