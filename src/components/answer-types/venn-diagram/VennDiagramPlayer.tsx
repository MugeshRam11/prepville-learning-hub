/**
 * Student-facing Venn drag interaction.
 *
 * Stored answer shape:  { [regionId]: draggableId[] }
 *
 * Drop detection: uses dnd-kit `useDroppable` on the region cards so
 * collision detection is handled by the library (no manual rect tracking).
 */
import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderFinalText } from '@/lib/renderFinalText';
import VennDiagram, { VENN_REGIONS, REGION_COLORS, type VennRegionId } from './VennDiagram';
import type { VennDiagramConfig, VennDraggable } from './VennDiagramEditor';

export type VennPlayerValue = Partial<Record<VennRegionId, string[]>>;

// ── Draggable chip ────────────────────────────────────────────────────────────
const Chip: React.FC<{ id: string; label: string; disabled?: boolean; ghost?: boolean }> = ({
  id, label, disabled, ghost,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border-2',
        'bg-primary/10 border-primary text-primary cursor-grab active:cursor-grabbing',
        'shadow-sm transition-opacity touch-none select-none',
        (isDragging || ghost) && 'opacity-30',
        disabled && 'cursor-not-allowed opacity-70',
      )}
    >
      {renderFinalText(label)}
    </div>
  );
};

// Floating chip shown under the cursor while dragging
const ChipOverlay: React.FC<{ label: string }> = ({ label }) => (
  <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border-2 border-primary bg-primary/20 text-primary shadow-lg cursor-grabbing select-none">
    {renderFinalText(label)}
  </div>
);

// ── Droppable region card ─────────────────────────────────────────────────────
const RegionCard: React.FC<{
  regionId: VennRegionId;
  label: string;
  chips: VennDraggable[];
  disabled?: boolean;
}> = ({ regionId, label, chips, disabled }) => {
  const { isOver, setNodeRef } = useDroppable({ id: regionId });
  const colorCfg = REGION_COLORS[regionId];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-2 rounded-xl p-3 transition-all min-h-[72px]',
        colorCfg.cardBg,
        chips.length > 0 ? colorCfg.cardBorder : 'border-border/60',
        isOver
          ? 'border-primary ring-2 ring-primary/30 shadow-md scale-[1.01]'
          : 'hover:border-muted-foreground/30',
      )}
    >
      <p className={cn('text-xs font-semibold mb-2', colorCfg.cardHeader)}>{label}</p>
      <div className="flex flex-wrap gap-1.5 min-h-[32px] items-start">
        {chips.length === 0 ? (
          <span className={cn('text-xs italic', isOver ? 'text-primary/70 font-medium' : 'text-muted-foreground/50')}>
            {isOver ? '⟶ drop here' : 'empty'}
          </span>
        ) : (
          chips.map(d => <Chip key={d.id} id={d.id} label={d.label} disabled={disabled} />)
        )}
      </div>
    </div>
  );
};

// ── Droppable tray (returns chip when dropped here) ───────────────────────────
const TrayDropZone: React.FC<{
  draggables: VennDraggable[];
  total: number;
  disabled?: boolean;
  activeId: string | null;
}> = ({ draggables, total, disabled, activeId }) => {
  const { isOver, setNodeRef } = useDroppable({ id: '__tray__' });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-2 border-dashed rounded-xl p-3 transition-all',
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">Drag onto a region</Badge>
        <span className="text-[11px] text-muted-foreground">
          {draggables.length} of {total} unplaced
        </span>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
        {draggables.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">All labels placed.</span>
        ) : (
          draggables.map(d => (
            <Chip key={d.id} id={d.id} label={d.label} disabled={disabled}
              ghost={d.id === activeId} />
          ))
        )}
      </div>
    </div>
  );
};

// ── Main player ───────────────────────────────────────────────────────────────
const VennDiagramPlayer: React.FC<{
  config: VennDiagramConfig;
  value: VennPlayerValue;
  onChange: (value: VennPlayerValue) => void;
  disabled?: boolean;
}> = ({ config, value, onChange, disabled = false }) => {

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const placement = value || {};

  // reverse-lookup: chip id → region
  const chipRegion = useMemo(() => {
    const map = new Map<string, VennRegionId>();
    (Object.entries(placement) as [VennRegionId, string[]][])
      .forEach(([region, ids]) => ids.forEach(id => map.set(id, region)));
    return map;
  }, [placement]);

  const trayChips = config.draggables.filter(d => !chipRegion.has(d.id));

  const activeChip = activeId ? config.draggables.find(d => d.id === activeId) : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const draggedId = String(active.id);
    const targetId  = over ? String(over.id) : null;

    // Build next placement — remove from wherever it was
    const next: VennPlayerValue = {};
    (Object.entries(placement) as [VennRegionId, string[]][]).forEach(([region, ids]) => {
      const filtered = ids.filter(id => id !== draggedId);
      if (filtered.length) next[region] = filtered;
    });

    // Add to new region (skip tray or unknown targets)
    if (targetId && VENN_REGIONS.some(r => r.id === targetId)) {
      next[targetId as VennRegionId] = [
        ...(next[targetId as VennRegionId] || []),
        draggedId,
      ];
    }
    // If dropped on __tray__ or outside, chip simply returns to tray (already removed above)
    onChange(next);
  };

  // SVG region state for colour fills
  const regionsState = Object.fromEntries(
    VENN_REGIONS.map(({ id }) => {
      const ids = placement[id] || [];
      return [id, ids.length
        ? { state: 'filled' as const, badge: config.draggables.find(d => d.id === ids[0])?.label }
        : {}
      ];
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Venn diagram (visual only, no drop targets here) */}
        <div className="flex justify-center bg-muted/20 rounded-xl p-4">
          <VennDiagram
            regions={regionsState}
            setLabels={config.setLabels}
          />
        </div>

        {/* Region drop cards */}
        <div className="grid grid-cols-2 gap-2">
          {VENN_REGIONS.map(r => (
            <RegionCard
              key={r.id}
              regionId={r.id}
              label={r.label}
              chips={(placement[r.id] || [])
                .map(id => config.draggables.find(d => d.id === id))
                .filter(Boolean) as VennDraggable[]}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Tray */}
        <TrayDropZone
          draggables={trayChips}
          total={config.draggables.length}
          disabled={disabled}
          activeId={activeId}
        />
      </div>

      {/* Floating chip under cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeChip ? <ChipOverlay label={activeChip.label} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default VennDiagramPlayer;
