import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import type { ImageFillBlanksConfig, FillZone } from './ImageFillBlanksEditor';

interface ImageFillBlanksPlayerProps {
  config: ImageFillBlanksConfig;
  value: Record<string, { value: string; type: string }>;
  onChange: (value: Record<string, { value: string; type: string }>) => void;
  disabled?: boolean;
}

const ImageFillBlanksPlayer: React.FC<ImageFillBlanksPlayerProps> = ({
  config,
  value = {},
  onChange,
  disabled = false,
}) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleZoneChange = useCallback((zoneId: string, inputValue: string) => {
    const zone = config.zones.find(z => z.id === zoneId);
    const newValue = {
      ...value,
      [zoneId]: {
        value: inputValue,
        type: zone?.inputMode === 'math' ? 'latex' : 'text',
      },
    };
    onChange(newValue);
  }, [config.zones, value, onChange]);

  if (!config.imageUrl) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Image Fill Blanks not configured</p>
        <p className="text-sm">No image has been set for this question.</p>
      </div>
    );
  }

  if (config.zones.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No input zones configured</p>
      </div>
    );
  }

  const totalMarks = config.zones.reduce((sum, z) => sum + z.marks, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          ✏️ Image Fill Blanks
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {config.zones.length} zone{config.zones.length !== 1 ? 's' : ''} · {totalMarks} marks
        </Badge>
      </div>

      <div className="relative border rounded-lg overflow-hidden bg-muted/10">
        <img
          src={config.imageUrl}
          alt="Question diagram"
          className="w-full h-auto max-h-[600px] object-contain mx-auto select-none"
          draggable={false}
        />

        {/* Input zones overlaid on image */}
        {config.zones.map((zone) => (
          <div
            key={zone.id}
            className="absolute"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
            }}
          >
            <input
              type={zone.inputMode === 'number' ? 'number' : 'text'}
              value={value[zone.id]?.value || ''}
              onChange={(e) => handleZoneChange(zone.id, e.target.value)}
              disabled={disabled}
              placeholder={zone.placeholder || ''}
              className={cn(
                "w-full h-full text-center text-sm font-medium",
                "bg-background/85 backdrop-blur-sm border border-input rounded",
                "focus:ring-2 focus:ring-primary focus:border-primary focus:bg-background",
                "transition-all placeholder:text-muted-foreground/50",
                disabled && "opacity-60 cursor-not-allowed"
              )}
              style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageFillBlanksPlayer;
