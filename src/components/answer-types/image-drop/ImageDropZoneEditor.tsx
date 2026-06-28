import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Target, GripVertical, Link2, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { cleanMathContent, normalizeMath, stripLatexFormatting } from '@/lib/mathFormat';
import MathInput from '@/components/ui/MathInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DropZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragElement {
  id: string;
  content: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

interface CorrectMapping {
  [zoneId: string]: string;
}

export interface ImageDropZoneConfig {
  imageUrl: string;
  zones: DropZone[];
  elements: DragElement[];
  answers: CorrectMapping;
}

interface ImageDropZoneEditorProps {
  config: ImageDropZoneConfig;
  onChange: (config: ImageDropZoneConfig) => void;
  folder?: string;
}

let _zoneCounter = 0;
let _elemCounter = 0;
const genZoneId = () => `zone-${Date.now()}-${++_zoneCounter}`;
const genElemId = () => `elem-${Date.now()}-${++_elemCounter}`;
const ZONE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type DragStart = {
  x: number;
  y: number;
  zoneX: number;
  zoneY: number;
  zoneW: number;
  zoneH: number;
};

const ImageDropZoneEditor: React.FC<ImageDropZoneEditorProps> = ({ config, onChange, folder = 'image-drop' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [placingZone, setPlacingZone] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const [draggingZone, setDraggingZone] = useState<string | null>(null);
  const [resizingZone, setResizingZone] = useState<string | null>(null);

  const update = useCallback((partial: Partial<ImageDropZoneConfig>) => {
    onChange({ ...config, ...partial });
  }, [config, onChange]);

  const mappedCount = useMemo(() => Object.keys(config.answers || {}).length, [config.answers]);

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
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Add drop zone by clicking on image
  const handleImageClick = (e: React.MouseEvent) => {
    if (!placingZone || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const idx = config.zones.length;
    const newZone: DropZone = {
      id: genZoneId(),
      label: ZONE_LABELS[idx] || `Z${idx + 1}`,
      x: clamp(x - 5, 0, 90),
      y: clamp(y - 4, 0, 92),
      width: 10,
      height: 8,
    };
    update({ zones: [...config.zones, newZone] });
    setPlacingZone(false);
  };

  // Zone dragging/resizing
  const handleZoneMouseDown = (e: React.MouseEvent, zoneId: string, mode: 'drag' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    const zone = config.zones.find(z => z.id === zoneId);
    if (!zone || !imageContainerRef.current) return;

    if (mode === 'drag') setDraggingZone(zoneId);
    else setResizingZone(zoneId);

    dragStartRef.current = {
      x: e.clientX, y: e.clientY,
      zoneX: zone.x, zoneY: zone.y,
      zoneW: zone.width, zoneH: zone.height,
    };

    const handleMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((ev.clientY - dragStartRef.current.y) / rect.height) * 100;

      const updatedZones = config.zones.map(z => {
        if (z.id !== zoneId) return z;
        if (mode === 'drag') {
          return {
            ...z,
            x: clamp(dragStartRef.current!.zoneX + dx, 0, 100 - z.width),
            y: clamp(dragStartRef.current!.zoneY + dy, 0, 100 - z.height),
          };
        }
        return {
          ...z,
          width: clamp(dragStartRef.current!.zoneW + dx, 5, 100),
          height: clamp(dragStartRef.current!.zoneH + dy, 5, 100),
        };
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
    const newAnswers = { ...(config.answers || {}) };
    delete newAnswers[zoneId];
    update({ zones: config.zones.filter(z => z.id !== zoneId), answers: newAnswers });
  };

  // Elements
  const addElement = (type: 'text' | 'image') => {
    const elem: DragElement = type === 'text'
      ? { id: genElemId(), content: '', type }
      : { id: genElemId(), content: '', type, imageUrl: '' };
    update({ elements: [...config.elements, elem] });
  };

  const updateElement = (id: string, updates: Partial<DragElement>) => {
    update({ elements: config.elements.map(el => el.id === id ? { ...el, ...updates } : el) });
  };

  const deleteElement = (id: string) => {
    const newAnswers = { ...(config.answers || {}) };
    Object.keys(newAnswers).forEach(k => { if (newAnswers[k] === id) delete newAnswers[k]; });
    update({ elements: config.elements.filter(el => el.id !== id), answers: newAnswers });
  };

  // Upload element image
  const uploadElementImage = async (elementId: string, file: File) => {
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${folder}/elements/${elementId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
      updateElement(elementId, { imageUrl: urlData.publicUrl });
      toast.success('Element image uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Mapping
  const setMapping = (zoneId: string, elementId: string) => {
    update({ answers: { ...(config.answers || {}), [zoneId]: elementId } });
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Image Upload */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Step 1 — Question Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config.imageUrl ? (
            <div className="space-y-2">
              <div
                ref={imageContainerRef}
                className={cn(
                  "relative border rounded-lg overflow-hidden bg-muted/30",
                  placingZone && "cursor-crosshair ring-2 ring-primary"
                )}
                onClick={handleImageClick}
              >
                <img src={config.imageUrl} alt="Question" className="w-full select-none pointer-events-none" draggable={false} />

                {/* Drop Zones Overlay */}
                {config.zones.map(zone => (
                  <div
                    key={zone.id}
                    className={cn(
                      "absolute border-2 border-dashed rounded flex items-center justify-center text-xs font-bold transition-colors",
                      draggingZone === zone.id || resizingZone === zone.id
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-destructive/70 bg-destructive/10 text-destructive"
                    )}
                    style={{
                      left: `${zone.x}%`, top: `${zone.y}%`,
                      width: `${zone.width}%`, height: `${zone.height}%`,
                    }}
                    onMouseDown={(e) => handleZoneMouseDown(e, zone.id, 'drag')}
                  >
                    <span className="bg-background/80 px-1 rounded text-[10px]">{zone.label}</span>
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-se-resize"
                      onMouseDown={(e) => handleZoneMouseDown(e, zone.id, 'resize')}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={placingZone ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlacingZone(!placingZone)}
                >
                  <Target className="w-4 h-4 mr-1" />
                  {placingZone ? 'Click on image to place zone...' : 'Add Drop Zone'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => update({ imageUrl: '', zones: [], elements: [], answers: {} })}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Change Image
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{isUploading ? 'Uploading...' : 'Click to upload question image'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          )}
          <Input
            className="mt-2"
            placeholder="Or paste image URL..."
            value={config.imageUrl}
            onChange={(e) => update({ imageUrl: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Step 2: Drop Zones List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Step 2 — Drop Zones ({config.zones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {config.zones.length === 0 && (
            <p className="text-xs text-muted-foreground">Upload an image, then click "Add Drop Zone" and click on the image to place zones.</p>
          )}
          {config.zones.map(zone => (
            <div key={zone.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
              <Badge variant="destructive" className="text-xs">{zone.label}</Badge>
              <Input
                value={zone.label}
                onChange={(e) => update({ zones: config.zones.map(z => z.id === zone.id ? { ...z, label: e.target.value } : z) })}
                className="h-7 text-xs w-20"
              />
              <span className="text-[10px] text-muted-foreground">({zone.x.toFixed(0)}%, {zone.y.toFixed(0)}%)</span>
              <span className="text-[10px] text-muted-foreground">{zone.width.toFixed(0)}×{zone.height.toFixed(0)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => deleteZone(zone.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Step 3: Draggable Elements */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-primary" />
              Step 3 — Draggable Elements ({config.elements.length})
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => addElement('text')}>
                <Plus className="w-3 h-3 mr-1" /> Text
              </Button>
              <Button variant="outline" size="sm" onClick={() => addElement('image')}>
                <Plus className="w-3 h-3 mr-1" /> Image
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {config.elements.length === 0 && (
            <p className="text-xs text-muted-foreground">Add draggable elements for students to drag into zones.</p>
          )}
          {config.elements.map((elem, idx) => (
            <div key={elem.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
              <Badge variant="secondary" className="text-xs shrink-0">E{idx + 1}</Badge>
              {elem.type === 'text' ? (
                <MathInput
                  value={elem.content}
                  onChange={(val) => updateElement(elem.id, { content: val })}
                  placeholder="Label text (e.g. 45°, Angle A)"
                  className="h-7 text-sm flex-1"
                />
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <label className="cursor-pointer text-xs text-primary hover:underline shrink-0">
                    {elem.imageUrl ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadElementImage(elem.id, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {elem.imageUrl ? (
                    <img src={elem.imageUrl} alt={`Element ${idx + 1}`} className="h-8 w-8 object-contain rounded border" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                  <MathInput
                    value={elem.content}
                    onChange={(val) => updateElement(elem.id, { content: val })}
                    placeholder="Alt label (optional)"
                    className="h-7 text-xs flex-1"
                  />
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteElement(elem.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Step 4: Correct Mapping */}
      {config.zones.length > 0 && config.elements.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Step 4 — Correct Mapping (Answer Key)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.zones.map(zone => (
              <div key={zone.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                <Badge variant="destructive" className="text-xs shrink-0">{zone.label}</Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Select
                  value={(config.answers || {})[zone.id] || ''}
                  onValueChange={(v) => setMapping(zone.id, v)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Select correct element..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.elements.map((elem, idx) => (
                      <SelectItem key={elem.id} value={elem.id}>
                        E{idx + 1}: {elem.type === 'text' ? (elem.content || '(empty)') : elem.imageUrl ? '(image)' : '(no image)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="text-xs text-muted-foreground mt-1">
              {mappedCount}/{config.zones.length} zones mapped
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageDropZoneEditor;

export const createDefaultImageDropConfig = (): ImageDropZoneConfig => ({
  imageUrl: '',
  zones: [],
  elements: [],
  answers: {},
});
