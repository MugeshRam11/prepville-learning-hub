/**
 * Student-facing Venn drag interaction.
 *
 * Stored answer shape (matches admin `correct_answer`):
 *   { [regionId]: draggableId[] }
 *
 * Behaviour:
 *   • Each label can sit in only one region at a time (drop replaces).
 *   • Dropping outside any region returns the chip to the tray.
 *   • Disabled mode shows the current state without interaction.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderFinalText } from '@/lib/renderFinalText';
import VennDiagram, { VENN_REGIONS, type VennRegionId } from './VennDiagram';
import type { VennDiagramConfig, VennDraggable } from './VennDiagramEditor';

export type VennPlayerValue = Partial<Record<VennRegionId, string[]>>;

interface VennDiagramPlayerProps {
  config: VennDiagramConfig;
  value: VennPlayerValue;
  onChange: (value: VennPlayerValue) => void;
  disabled?: boolean;
}

// Small draggable chip rendered both in the tray and inside regions when placed.
const Chip: React.FC<{ id: string; label: string; disabled?: boolean }> = ({ id, label, disabled }) => {
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
        isDragging && 'opacity-40',
        disabled && 'cursor-not-allowed opacity-70'
      )}
    >
      {renderFinalText(label)}
    </div>
  );
};

// Helper: find which region (if any) a pointer ended over, using stored DOM rects.
const findRegionAtPoint = (
  rects: Map<VennRegionId, DOMRect>,
  x: number,
  y: number
): VennRegionId | null => {
  // Smaller regions take priority — a chip near the intersection should land
  // on intersection, not "outside" which covers the whole canvas.
  const order: VennRegionId[] = ['intersection', 'A_only', 'B_only', 'outside'];
  for (const id of order) {
    const r = rects.get(id);
    if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return id;
    }
  }
  return null;
};

const VennDiagramPlayer: React.FC<VennDiagramPlayerProps> = ({
  config,
  value,
  onChange,
  disabled = false,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const regionRefs = useRef<Map<VennRegionId, HTMLDivElement>>(new Map());
  const [hoveredRegion, setHoveredRegion] = useState<VennRegionId | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const placement = value || {};

  // Reverse-lookup: which region currently holds each draggable?
  const draggableLocation = useMemo(() => {
    const map = new Map<string, VennRegionId>();
    (Object.entries(placement) as [VennRegionId, string[]][]).forEach(([region, ids]) => {
      ids.forEach((id) => map.set(id, region));
    });
    return map;
  }, [placement]);

  // Chips not yet placed in any region.
  const trayDraggables: VennDraggable[] = config.draggables.filter(
    (d) => !draggableLocation.has(d.id)
  );

  const registerRegion = useCallback((id: VennRegionId, el: HTMLDivElement | null) => {
    if (el) regionRefs.current.set(id, el);
    else regionRefs.current.delete(id);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragMove = useCallback((event: any) => {
    // Use pointer coordinates for hover feedback (dnd-kit gives us activatorEvent + delta).
    const activator = event.activatorEvent as PointerEvent | undefined;
    if (!activator) return;
    const x = activator.clientX + event.delta.x;
    const y = activator.clientY + event.delta.y;
    const rects = new Map<VennRegionId, DOMRect>();
    regionRefs.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
    setHoveredRegion(findRegionAtPoint(rects, x, y));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setHoveredRegion(null);

    const draggedId = String(event.active.id);
    const activator = event.activatorEvent as PointerEvent | undefined;
    if (!activator) return;
    const x = activator.clientX + event.delta.x;
    const y = activator.clientY + event.delta.y;

    const rects = new Map<VennRegionId, DOMRect>();
    regionRefs.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
    const target = findRegionAtPoint(rects, x, y);

    // Build next placement: remove dragged from anywhere it was, then add to target.
    const next: VennPlayerValue = {};
    (Object.entries(placement) as [VennRegionId, string[]][]).forEach(([region, ids]) => {
      const filtered = ids.filter((id) => id !== draggedId);
      if (filtered.length) next[region] = filtered;
    });
    if (target) {
      next[target] = [...(next[target] || []), draggedId];
    }
    onChange(next);
  };

  // Build region visual state for the SVG.
  const regionsState = Object.fromEntries(
    VENN_REGIONS.map(({ id }) => {
      const ids = placement[id] || [];
      const firstLabel = ids.length
        ? config.draggables.find((d) => d.id === ids[0])?.label
        : undefined;
      return [id, ids.length ? { state: 'filled' as const, badge: firstLabel } : {}];
    })
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Diagram */}
        <div className="flex justify-center bg-muted/20 rounded-lg p-4">
          <VennDiagram
            regions={regionsState}
            setLabels={config.setLabels}
            registerRegion={registerRegion}
            hoveredRegion={hoveredRegion}
          />
        </div>

        {/* Region pills — shows what's currently placed where, with stacked chips. */}
        <div className="grid grid-cols-2 gap-2">
          {VENN_REGIONS.map((r) => {
            const ids = placement[r.id] || [];
            return (
              <div key={r.id} className="border rounded-md p-2 bg-card">
                <div className="text-[11px] text-muted-foreground mb-1 font-medium">{r.label}</div>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {ids.length === 0 && (
                    <span className="text-[11px] text-muted-foreground/70 italic">empty</span>
                  )}
                  {ids.map((id) => {
                    const d = config.draggables.find((x) => x.id === id);
                    if (!d) return null;
                    return <Chip key={id} id={id} label={d.label} disabled={disabled} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tray of unplaced chips */}
        <div className="border-2 border-dashed rounded-lg p-3 bg-muted/10">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">Drag onto a region</Badge>
            <span className="text-[11px] text-muted-foreground">
              {trayDraggables.length} of {config.draggables.length} unplaced
            </span>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
            {trayDraggables.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">All labels placed.</span>
            ) : (
              trayDraggables.map((d) => (
                <Chip key={d.id} id={d.id} label={d.label} disabled={disabled} />
              ))
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default VennDiagramPlayer;
