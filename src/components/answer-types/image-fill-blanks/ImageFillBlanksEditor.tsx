import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, Target, RotateCcw, Image as ImageIcon, Type, Hash, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FillZone {
  id: string;
  x: number;       // percentage
  y: number;       // percentage
  width: number;   // percentage
  height: number;  // percentage
  inputMode: 'text' | 'number' | 'math' | 'mixed';
  placeholder: string;
  expectedAnswers: { value: string; type: 'text' | 'latex' }[];
  caseSensitive: boolean;
  trimWhitespace: boolean;
  marks: number;
}

export interface ImageFillBlanksConfig {
  imageUrl: string;
  zones: FillZone[];
  scoring: { partialCredit: boolean };
}

interface ImageFillBlanksEditorProps {
  config: ImageFillBlanksConfig;
  onChange: (config: ImageFillBlanksConfig) => void;
  folder?: string;
}

let _counter = 0;
const genId = () => `fill-zone-${Date.now()}-${++_counter}`;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type DragStart = { x: number; y: number; zoneX: number; zoneY: number; zoneW: number; zoneH: number };

const ImageFillBlanksEditor: React.FC<ImageFillBlanksEditorProps> = ({ config, onChange, folder = 'fill-blanks' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [placingZone, setPlacingZone] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const [draggingZone, setDraggingZone] = useState<string | null>(null);
  const [resizingZone, setResizingZone] = useState<string | null>(null);

  const update = useCallback((partial: Partial<ImageFillBlanksConfig>) => {
    onChange({ ...config, ...partial });
  }, [config, onChange]);

  const updateZone = useCallback((zoneId: string, updates: Partial<FillZone>) => {
    update({ zones: config.zones.map(z => z.id === zoneId ? { ...z, ...updates } : z) });
  }, [config.zones, update]);

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
      update({ imageUrl: urlData.publicUrl });
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Click on image to place zone
  const handleImageClick = (e: React.MouseEvent) => {
    if (!placingZone || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newZone: FillZone = {
      id: genId(),
      x: clamp(x - 6, 0, 88),
      y: clamp(y - 3, 0, 94),
      width: 12,
      height: 6,
      inputMode: 'text',
      placeholder: '',
      expectedAnswers: [{ value: '', type: 'text' }],
      caseSensitive: false,
      trimWhitespace: true,
      marks: 1,
    };
    update({ zones: [...config.zones, newZone] });
    setSelectedZone(newZone.id);
    setPlacingZone(false);
  };

  // Drag/resize zones
  const handleZoneMouseDown = (e: React.MouseEvent, zoneId: string, mode: 'drag' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    const zone = config.zones.find(z => z.id === zoneId);
    if (!zone || !imageContainerRef.current) return;
    setSelectedZone(zoneId);
    if (mode === 'drag') setDraggingZone(zoneId);
    else setResizingZone(zoneId);
    dragStartRef.current = { x: e.clientX, y: e.clientY, zoneX: zone.x, zoneY: zone.y, zoneW: zone.width, zoneH: zone.height };

    const handleMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((ev.clientY - dragStartRef.current.y) / rect.height) * 100;
      const updatedZones = config.zones.map(z => {
        if (z.id !== zoneId) return z;
        if (mode === 'drag') {
          return { ...z, x: clamp(dragStartRef.current!.zoneX + dx, 0, 100 - z.width), y: clamp(dragStartRef.current!.zoneY + dy, 0, 100 - z.height) };
        }
        return { ...z, width: clamp(dragStartRef.current!.zoneW + dx, 5, 50), height: clamp(dragStartRef.current!.zoneH + dy, 3, 30) };
      });
      update({ zones: updatedZones });
    };
    const handleUp = () => {
      setDraggingZone(null);
      setResizingZone(null);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const deleteZone = (zoneId: string) => {
    update({ zones: config.zones.filter(z => z.id !== zoneId) });
    if (selectedZone === zoneId) setSelectedZone(null);
  };

  const selectedZoneData = config.zones.find(z => z.id === selectedZone);

  const addExpectedAnswer = (zoneId: string) => {
    const zone = config.zones.find(z => z.id === zoneId);
    if (!zone) return;
    updateZone(zoneId, { expectedAnswers: [...zone.expectedAnswers, { value: '', type: 'text' }] });
  };

  const updateExpectedAnswer = (zoneId: string, idx: number, updates: Partial<{ value: string; type: 'text' | 'latex' }>) => {
    const zone = config.zones.find(z => z.id === zoneId);
    if (!zone) return;
    const newAnswers = zone.expectedAnswers.map((a, i) => i === idx ? { ...a, ...updates } : a);
    updateZone(zoneId, { expectedAnswers: newAnswers });
  };

  const removeExpectedAnswer = (zoneId: string, idx: number) => {
    const zone = config.zones.find(z => z.id === zoneId);
    if (!zone || zone.expectedAnswers.length <= 1) return;
    updateZone(zoneId, { expectedAnswers: zone.expectedAnswers.filter((_, i) => i !== idx) });
  };

  const INPUT_MODES = [
    { value: 'text', label: 'Text', icon: <Type className="w-3 h-3" /> },
    { value: 'number', label: 'Number', icon: <Hash className="w-3 h-3" /> },
    { value: 'math', label: 'Math', icon: <Calculator className="w-3 h-3" /> },
    { value: 'mixed', label: 'Mixed', icon: <Type className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Step 1: Image */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Step 1 — Upload Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config.imageUrl ? (
            <div className="space-y-2">
              <div
                ref={imageContainerRef}
                className={cn("relative border rounded-lg overflow-hidden bg-muted/30", placingZone && "cursor-crosshair ring-2 ring-primary")}
                onClick={handleImageClick}
              >
                <img src={config.imageUrl} alt="Question" className="w-full select-none pointer-events-none" draggable={false} />
                {config.zones.map((zone, idx) => (
                  <div
                    key={zone.id}
                    className={cn(
                      "absolute border-2 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-move",
                      selectedZone === zone.id ? "border-primary bg-primary/20 ring-2 ring-primary/50" : "border-blue-500/70 bg-blue-500/10",
                      draggingZone === zone.id && "opacity-70"
                    )}
                    style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
                    onMouseDown={(e) => handleZoneMouseDown(e, zone.id, 'drag')}
                    onClick={(e) => { e.stopPropagation(); setSelectedZone(zone.id); }}
                  >
                    <span className="bg-background/80 px-1 rounded text-[10px]">{idx + 1}</span>
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-se-resize"
                      onMouseDown={(e) => handleZoneMouseDown(e, zone.id, 'resize')}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant={placingZone ? "default" : "outline"} size="sm" onClick={() => setPlacingZone(!placingZone)}>
                  <Target className="w-4 h-4 mr-1" />
                  {placingZone ? 'Click image to place...' : 'Add Input Zone'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => update({ imageUrl: '', zones: [] })}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Change Image
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{isUploading ? 'Uploading...' : 'Click to upload image'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          )}
          <Input className="mt-2" placeholder="Or paste image URL..." value={config.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} />
        </CardContent>
      </Card>

      {/* Step 2: Zone List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Step 2 — Input Zones ({config.zones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {config.zones.length === 0 && (
            <p className="text-xs text-muted-foreground">Upload an image, then click "Add Input Zone" to place typeable zones.</p>
          )}
          {config.zones.map((zone, idx) => (
            <div
              key={zone.id}
              className={cn("flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                selectedZone === zone.id ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
              )}
              onClick={() => setSelectedZone(zone.id)}
            >
              <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
              <span className="text-xs text-muted-foreground flex-1">
                {zone.inputMode} · {zone.marks}mk · {zone.expectedAnswers.length} answer(s)
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Step 3: Zone Configuration */}
      {selectedZoneData && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Configure Zone {config.zones.findIndex(z => z.id === selectedZone) + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Input Mode</Label>
                <Select value={selectedZoneData.inputMode} onValueChange={(v) => updateZone(selectedZone!, { inputMode: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INPUT_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center gap-1">{m.icon} {m.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Marks</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={selectedZoneData.marks} onChange={(e) => updateZone(selectedZone!, { marks: Number(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input className="h-8 text-xs" placeholder="e.g. ?" value={selectedZoneData.placeholder} onChange={(e) => updateZone(selectedZone!, { placeholder: e.target.value })} />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={selectedZoneData.caseSensitive} onCheckedChange={(v) => updateZone(selectedZone!, { caseSensitive: v })} />
                <Label className="text-xs">Case sensitive</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={selectedZoneData.trimWhitespace} onCheckedChange={(v) => updateZone(selectedZone!, { trimWhitespace: v })} />
                <Label className="text-xs">Trim whitespace</Label>
              </div>
            </div>

            {/* Expected Answers */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">Expected Answers</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addExpectedAnswer(selectedZone!)}>
                  <Plus className="w-3 h-3 mr-1" /> Add Alternative
                </Button>
              </div>
              {selectedZoneData.expectedAnswers.map((ans, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1">
                  <Select value={ans.type} onValueChange={(v) => updateExpectedAnswer(selectedZone!, idx, { type: v as any })}>
                    <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="latex">LaTeX</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-7 text-xs flex-1"
                    placeholder={ans.type === 'latex' ? '\\frac{1}{2}' : 'Answer text'}
                    value={ans.value}
                    onChange={(e) => updateExpectedAnswer(selectedZone!, idx, { value: e.target.value })}
                  />
                  {selectedZoneData.expectedAnswers.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeExpectedAnswer(selectedZone!, idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.scoring?.partialCredit ?? true}
              onCheckedChange={(v) => update({ scoring: { partialCredit: v } })}
            />
            <Label className="text-xs">Allow partial credit (marks per zone)</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageFillBlanksEditor;

export const createDefaultImageFillBlanksConfig = (): ImageFillBlanksConfig => ({
  imageUrl: '',
  zones: [],
  scoring: { partialCredit: true },
});
