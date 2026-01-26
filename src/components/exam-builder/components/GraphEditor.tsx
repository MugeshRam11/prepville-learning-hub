import React, { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComponentConfig, GraphConfig, createDefaultGraphConfig } from '../types';

interface GraphEditorProps {
  component: ComponentConfig;
  onUpdate: (id: string, updates: Partial<ComponentConfig>) => void;
}

const GraphEditor: React.FC<GraphEditorProps> = ({ component, onUpdate }) => {
  const config = component.graphConfig || createDefaultGraphConfig();
  const [showSettings, setShowSettings] = useState(false);

  const updateConfig = (updates: Partial<GraphConfig>) => {
    onUpdate(component.id, {
      graphConfig: { ...config, ...updates },
    });
  };

  const resetGraph = () => {
    onUpdate(component.id, {
      graphConfig: createDefaultGraphConfig(),
    });
  };

  const gridSize = 10;
  const width = 300;
  const height = 300;
  const cellWidth = width / gridSize;
  const cellHeight = height / gridSize;

  return (
    <div className="space-y-4">
      {/* Graph controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Graph Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Graph Configuration</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">X Min</Label>
                  <Input
                    type="number"
                    value={config.xMin}
                    onChange={(e) => updateConfig({ xMin: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">X Max</Label>
                  <Input
                    type="number"
                    value={config.xMax}
                    onChange={(e) => updateConfig({ xMax: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y Min</Label>
                  <Input
                    type="number"
                    value={config.yMin}
                    onChange={(e) => updateConfig({ yMin: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y Max</Label>
                  <Input
                    type="number"
                    value={config.yMax}
                    onChange={(e) => updateConfig({ yMax: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Grid</Label>
                  <Switch
                    checked={config.showGrid}
                    onCheckedChange={(checked) => updateConfig({ showGrid: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Axes</Label>
                  <Switch
                    checked={config.showAxes}
                    onCheckedChange={(checked) => updateConfig({ showAxes: checked })}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="sm" onClick={resetGraph}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Graph canvas */}
      <div className="flex justify-center">
        <div className="relative bg-white dark:bg-gray-900 border-2 border-border rounded-lg overflow-hidden">
          <svg width={width} height={height} className="block">
            {/* Grid */}
            {config.showGrid && (
              <g className="stroke-muted-foreground/20">
                {Array.from({ length: gridSize + 1 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <line
                      x1={i * cellWidth}
                      y1={0}
                      x2={i * cellWidth}
                      y2={height}
                      strokeWidth={1}
                    />
                    <line
                      x1={0}
                      y1={i * cellHeight}
                      x2={width}
                      y2={i * cellHeight}
                      strokeWidth={1}
                    />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* Axes */}
            {config.showAxes && (
              <g className="stroke-foreground" strokeWidth={2}>
                {/* X axis */}
                <line x1={0} y1={height / 2} x2={width} y2={height / 2} />
                {/* Y axis */}
                <line x1={width / 2} y1={0} x2={width / 2} y2={height} />
                {/* Arrows */}
                <polygon
                  points={`${width - 8},${height / 2 - 4} ${width},${height / 2} ${width - 8},${height / 2 + 4}`}
                  className="fill-foreground"
                />
                <polygon
                  points={`${width / 2 - 4},8 ${width / 2},0 ${width / 2 + 4},8`}
                  className="fill-foreground"
                />
              </g>
            )}

            {/* Axis labels */}
            <text x={width - 15} y={height / 2 - 10} className="text-xs fill-foreground">x</text>
            <text x={width / 2 + 10} y={15} className="text-xs fill-foreground">y</text>
            
            {/* Scale labels */}
            <text x={width - 20} y={height / 2 + 15} className="text-xs fill-muted-foreground">{config.xMax}</text>
            <text x={5} y={height / 2 + 15} className="text-xs fill-muted-foreground">{config.xMin}</text>
            <text x={width / 2 + 8} y={height - 5} className="text-xs fill-muted-foreground">{config.yMin}</text>
            <text x={width / 2 + 8} y={20} className="text-xs fill-muted-foreground">{config.yMax}</text>

            {/* Plot points preview */}
            {config.plotPoints?.map((point, idx) => (
              <circle
                key={idx}
                cx={((point.x - config.xMin) / (config.xMax - config.xMin)) * width}
                cy={height - ((point.y - config.yMin) / (config.yMax - config.yMin)) * height}
                r={4}
                className="fill-primary"
              />
            ))}
          </svg>

          {/* Interactive overlay hint */}
          <div className="absolute inset-0 flex items-center justify-center bg-primary/5 opacity-0 hover:opacity-100 transition-opacity">
            <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              Preview to interact
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Students will be able to plot points and draw lines on this graph.
      </p>
    </div>
  );
};

export default GraphEditor;
