import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, 
  Circle, 
  Minus, 
  PenTool, 
  RotateCcw, 
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
  id: string;
}

interface Line {
  start: Point;
  end: Point;
  id: string;
}

interface InteractiveGraphCanvasProps {
  onPointsChange?: (points: Point[]) => void;
  onLinesChange?: (lines: Line[]) => void;
  initialPoints?: Point[];
  initialLines?: Line[];
  gridSize?: number;
  showGrid?: boolean;
  allowDrawing?: boolean;
  mode?: 'point' | 'line' | 'select' | 'draw';
}

const InteractiveGraphCanvas: React.FC<InteractiveGraphCanvasProps> = ({
  onPointsChange,
  onLinesChange,
  initialPoints = [],
  initialLines = [],
  gridSize = 20,
  showGrid = true,
  allowDrawing = true,
  mode: initialMode = 'point'
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [mode, setMode] = useState<'point' | 'line' | 'select' | 'draw'>(initialMode);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const canvasWidth = 400;
  const canvasHeight = 300;
  const originX = canvasWidth / 2;
  const originY = canvasHeight / 2;

  // Convert canvas coords to graph coords
  const toGraphCoords = (canvasX: number, canvasY: number) => ({
    x: Math.round((canvasX - originX) / gridSize),
    y: Math.round((originY - canvasY) / gridSize)
  });

  // Convert graph coords to canvas coords
  const toCanvasCoords = (graphX: number, graphY: number) => ({
    x: originX + graphX * gridSize,
    y: originY - graphY * gridSize
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const graphCoords = toGraphCoords(canvasX, canvasY);

    if (mode === 'point') {
      const newPoint: Point = {
        x: graphCoords.x,
        y: graphCoords.y,
        id: `point-${Date.now()}`
      };
      const newPoints = [...points, newPoint];
      setPoints(newPoints);
      onPointsChange?.(newPoints);
    } else if (mode === 'line') {
      if (!lineStart) {
        setLineStart({ ...graphCoords, id: 'temp' });
      } else {
        const newLine: Line = {
          start: lineStart,
          end: { ...graphCoords, id: 'temp-end' },
          id: `line-${Date.now()}`
        };
        const newLines = [...lines, newLine];
        setLines(newLines);
        onLinesChange?.(newLines);
        setLineStart(null);
      }
    }
  };

  const handlePointDrag = (pointId: string, e: React.MouseEvent) => {
    if (mode !== 'select' || !canvasRef.current) return;
    
    e.stopPropagation();
    setSelectedPoint(pointId);
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const canvasX = moveEvent.clientX - rect.left;
      const canvasY = moveEvent.clientY - rect.top;
      const graphCoords = toGraphCoords(canvasX, canvasY);

      setPoints(prev => prev.map(p => 
        p.id === pointId ? { ...p, x: graphCoords.x, y: graphCoords.y } : p
      ));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setSelectedPoint(null);
      onPointsChange?.(points);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const clearCanvas = () => {
    setPoints([]);
    setLines([]);
    setLineStart(null);
    onPointsChange?.([]);
    onLinesChange?.([]);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={mode === 'select' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setMode('select')}
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
          <Button
            variant={mode === 'point' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setMode('point')}
          >
            <Circle className="w-4 h-4" />
          </Button>
          <Button
            variant={mode === 'line' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setMode('line')}
          >
            <Minus className="w-4 h-4" />
          </Button>
          {allowDrawing && (
            <Button
              variant={mode === 'draw' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setMode('draw')}
            >
              <PenTool className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={clearCanvas}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Clear
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <motion.div
        ref={canvasRef}
        className={cn(
          "relative border-2 border-border rounded-xl overflow-hidden cursor-crosshair bg-card",
          mode === 'select' && "cursor-move"
        )}
        style={{ 
          width: canvasWidth, 
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
        onClick={handleCanvasClick}
        whileHover={{ borderColor: 'hsl(var(--primary))' }}
      >
        {/* Grid */}
        {showGrid && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Vertical grid lines */}
            {Array.from({ length: Math.ceil(canvasWidth / gridSize) + 1 }).map((_, i) => {
              const x = i * gridSize;
              const isOrigin = Math.abs(x - originX) < 1;
              return (
                <line
                  key={`v-${i}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={canvasHeight}
                  stroke={isOrigin ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
                  strokeWidth={isOrigin ? 2 : 1}
                  strokeOpacity={isOrigin ? 0.5 : 0.3}
                />
              );
            })}
            {/* Horizontal grid lines */}
            {Array.from({ length: Math.ceil(canvasHeight / gridSize) + 1 }).map((_, i) => {
              const y = i * gridSize;
              const isOrigin = Math.abs(y - originY) < 1;
              return (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={y}
                  x2={canvasWidth}
                  y2={y}
                  stroke={isOrigin ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
                  strokeWidth={isOrigin ? 2 : 1}
                  strokeOpacity={isOrigin ? 0.5 : 0.3}
                />
              );
            })}
            {/* Axis labels */}
            <text x={canvasWidth - 15} y={originY - 5} className="fill-muted-foreground text-xs">x</text>
            <text x={originX + 5} y={15} className="fill-muted-foreground text-xs">y</text>
          </svg>
        )}

        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {lines.map(line => {
            const start = toCanvasCoords(line.start.x, line.start.y);
            const end = toCanvasCoords(line.end.x, line.end.y);
            return (
              <motion.line
                key={line.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
              />
            );
          })}
          {/* Line preview */}
          {lineStart && (
            <circle
              cx={toCanvasCoords(lineStart.x, lineStart.y).x}
              cy={toCanvasCoords(lineStart.x, lineStart.y).y}
              r={6}
              fill="hsl(var(--primary))"
              opacity={0.5}
            />
          )}
        </svg>

        {/* Points */}
        {points.map(point => {
          const canvasCoords = toCanvasCoords(point.x, point.y);
          return (
            <motion.div
              key={point.id}
              className={cn(
                "absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-grab",
                "bg-primary border-2 border-primary-foreground shadow-lg",
                selectedPoint === point.id && "ring-2 ring-primary ring-offset-2"
              )}
              style={{ left: canvasCoords.x, top: canvasCoords.y }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              onMouseDown={(e) => handlePointDrag(point.id, e)}
            >
              {/* Coordinate label */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded">
                ({point.x}, {point.y})
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        {mode === 'point' && 'Click to place a point on the graph'}
        {mode === 'line' && (lineStart ? 'Click to set the end point of the line' : 'Click to set the start point of a line')}
        {mode === 'select' && 'Drag points to move them'}
        {mode === 'draw' && 'Draw freely on the canvas'}
      </p>
    </div>
  );
};

export default InteractiveGraphCanvas;
