/**
 * Pure SVG Venn diagram for the 2-set Venn drag interaction.
 *
 * Used by:
 *   • VennDiagramPlayer (student) — interactive drop targets
 *   • VennDiagramReview (review)  — colour-coded correctness overlay
 *   • VennDiagramEditor (admin)   — visual preview when picking correct regions
 *
 * Geometry note:
 *   Two circles A and B overlap horizontally inside a 320×220 viewBox.
 *   The four regions are derived from the same two circles via SVG clip
 *   paths, so labels and hit-tests stay perfectly aligned.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { cleanMathContent, normalizeMath, stripLatexFormatting } from '@/lib/mathFormat';

export type VennRegionId = 'A_only' | 'B_only' | 'intersection' | 'outside';

export const VENN_REGIONS: { id: VennRegionId; label: string }[] = [
  { id: 'A_only', label: "A only" },
  { id: 'intersection', label: 'A ∩ B' },
  { id: 'B_only', label: 'B only' },
  { id: 'outside', label: "Outside (A ∪ B)'" },
];

export interface VennRegionState {
  /** Visual state for each region. Player passes 'idle' / 'hover' / 'filled'.
   *  Review passes 'correct' / 'wrong' / 'missed' / 'idle'. */
  state?: 'idle' | 'hover' | 'filled' | 'correct' | 'wrong' | 'missed';
  /** Optional label rendered inside the region (e.g. dropped chip text). */
  badge?: string;
}

interface VennDiagramProps {
  /** Visual state per region. Missing entries default to 'idle'. */
  regions?: Partial<Record<VennRegionId, VennRegionState>>;
  /** Names of the two sets and universal set. */
  setLabels?: { A: string; B: string; universal?: string };
  /** Renders an interactive ring around the region under the user's pointer. */
  hoveredRegion?: VennRegionId | null;
  /** Per-region ref so dnd-kit can register droppables over the SVG. */
  registerRegion?: (id: VennRegionId, el: HTMLDivElement | null) => void;
  className?: string;
  /** Compact mode shrinks padding for review previews. */
  compact?: boolean;
}

// Geometry constants (single source of truth — change once, all maths follow).
const VB_W = 320;
const VB_H = 220;
const R = 70;            // circle radius
const CX_A = 120;        // centre of A
const CX_B = 200;        // centre of B
const CY = 110;          // shared vertical centre

// Universal Set Box geometry constants
const BOX_X = 12;
const BOX_Y = 12;
const BOX_W = 296;
const BOX_H = 196;
const BOX_RX = 8;

// Approximate centroid points for label / chip placement inside each region.
const REGION_CENTROIDS: Record<VennRegionId, { x: number; y: number }> = {
  A_only:       { x: 80,  y: CY },
  intersection: { x: 160, y: CY },
  B_only:       { x: 240, y: CY },
  outside:      { x: 45,  y: 180 },
};

const stateToFill = (s: VennRegionState['state']): string => {
  switch (s) {
    case 'correct': return 'hsl(var(--primary) / 0.18)';
    case 'wrong':   return 'hsl(var(--destructive) / 0.18)';
    case 'missed':  return 'hsl(45 95% 55% / 0.22)';
    case 'filled':  return 'hsl(var(--primary) / 0.12)';
    case 'hover':   return 'hsl(var(--primary) / 0.08)';
    default:        return 'transparent';
  }
};

const stateToStroke = (s: VennRegionState['state']): string => {
  switch (s) {
    case 'correct': return 'hsl(var(--primary))';
    case 'wrong':   return 'hsl(var(--destructive))';
    case 'missed':  return 'hsl(45 95% 45%)';
    case 'hover':   return 'hsl(var(--primary))';
    default:        return 'transparent';
  }
};

const VennDiagram: React.FC<VennDiagramProps> = ({
  regions = {},
  setLabels = { A: 'A', B: 'B', universal: 'ξ' },
  hoveredRegion,
  registerRegion,
  className,
  compact = false,
}) => {
  // Resolve region state, with hover taking precedence when nothing else applies.
  const resolved = (id: VennRegionId): VennRegionState => {
    const r = regions[id] ?? {};
    if (!r.state && hoveredRegion === id) return { ...r, state: 'hover' };
    return r;
  };

  // Each droppable wrapper is positioned absolutely over its region's centroid
  // so dnd-kit gets a real DOM element with a sensible hit-rect.
  const renderDroppable = (id: VennRegionId) => {
    const c = REGION_CENTROIDS[id];
    // Convert SVG coords → percentage of the container so the overlay scales.
    const left = `${(c.x / VB_W) * 100}%`;
    const top = `${(c.y / VB_H) * 100}%`;
    return (
      <div
        key={id}
        ref={(el) => registerRegion?.(id, el)}
        data-venn-region={id}
        style={{
          position: 'absolute',
          left,
          top,
          transform: 'translate(-50%, -50%)',
          width: id === 'outside' ? '60px' : '70px',
          height: id === 'outside' ? '40px' : '70px',
          pointerEvents: 'auto',
        }}
      />
    );
  };

  return (
    <div
      className={cn(
        'relative w-full select-none',
        compact ? 'max-w-[260px]' : 'max-w-[420px]',
        className
      )}
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-full"
        role="img"
        aria-label={`Venn diagram with sets ${setLabels.A} and ${setLabels.B}`}
      >
        <defs>
          {/* Clip paths isolate each region so we can fill them independently. */}
          <clipPath id="venn-clip-A">
            <circle cx={CX_A} cy={CY} r={R} />
          </clipPath>
          <clipPath id="venn-clip-B">
            <circle cx={CX_B} cy={CY} r={R} />
          </clipPath>
        </defs>

        {/* Outside region: background inside Universal set box */}
        <rect
          x={BOX_X}
          y={BOX_Y}
          width={BOX_W}
          height={BOX_H}
          rx={BOX_RX}
          fill={stateToFill(resolved('outside').state)}
        />

        {/* A only: inside A, outside B */}
        <g clipPath="url(#venn-clip-A)">
          <rect x={0} y={0} width={VB_W} height={VB_H} fill={stateToFill(resolved('A_only').state)} />
        </g>
        {/* B only: inside B, outside A */}
        <g clipPath="url(#venn-clip-B)">
          <rect x={0} y={0} width={VB_W} height={VB_H} fill={stateToFill(resolved('B_only').state)} />
        </g>
        {/* Intersection: inside both — paint A clipped by B */}
        <g clipPath="url(#venn-clip-A)">
          <g clipPath="url(#venn-clip-B)">
            <rect
              x={0}
              y={0}
              width={VB_W}
              height={VB_H}
              fill={stateToFill(resolved('intersection').state)}
            />
          </g>
        </g>

        {/* Highlight strokes for the active regions */}
        {resolved('A_only').state && resolved('A_only').state !== 'idle' && (
          <path
            d={`M ${CX_A - R},${CY} A ${R} ${R} 0 1 1 ${CX_A + R},${CY} A ${R} ${R} 0 1 1 ${CX_A - R},${CY} Z`}
            fill="none"
            stroke={stateToStroke(resolved('A_only').state)}
            strokeWidth={2}
            opacity={0.6}
          />
        )}
        {resolved('B_only').state && resolved('B_only').state !== 'idle' && (
          <path
            d={`M ${CX_B - R},${CY} A ${R} ${R} 0 1 1 ${CX_B + R},${CY} A ${R} ${R} 0 1 1 ${CX_B - R},${CY} Z`}
            fill="none"
            stroke={stateToStroke(resolved('B_only').state)}
            strokeWidth={2}
            opacity={0.6}
          />
        )}

        {/* Universal Set outer box border */}
        <rect
          x={BOX_X}
          y={BOX_Y}
          width={BOX_W}
          height={BOX_H}
          rx={BOX_RX}
          fill="none"
          stroke={
            resolved('outside').state && resolved('outside').state !== 'idle'
              ? stateToStroke(resolved('outside').state)
              : 'hsl(var(--foreground))'
          }
          strokeWidth={
            resolved('outside').state && resolved('outside').state !== 'idle' ? 2.5 : 1.5
          }
          opacity={resolved('outside').state && resolved('outside').state !== 'idle' ? 1 : 0.8}
        />

        {/* Universal Set symbol (e.g. ξ or U) */}
        <text
          x={BOX_X + 10}
          y={BOX_Y + 22}
          className="fill-foreground"
          fontSize="16"
          fontWeight="700"
          fontFamily="serif, var(--font-sans)"
        >
          {setLabels?.universal || 'ξ'}
        </text>

        {/* Circle outlines (drawn last so they sit on top of fills) */}
        <circle cx={CX_A} cy={CY} r={R} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5} opacity={0.7} />
        <circle cx={CX_B} cy={CY} r={R} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5} opacity={0.7} />

        {/* Set labels */}
        <text x={CX_A - R + 8} y={CY - R - 6} className="fill-foreground" fontSize="14" fontWeight="600">
          {setLabels.A}
        </text>
        <text x={CX_B + R - 18} y={CY - R - 6} className="fill-foreground" fontSize="14" fontWeight="600">
          {setLabels.B}
        </text>

        {/* Region badges (e.g. dropped chip text) */}
        {VENN_REGIONS.map(({ id }) => {
          const r = resolved(id);
          if (!r.badge) return null;
          const c = REGION_CENTROIDS[id];
          const badgeText = normalizeMath(stripLatexFormatting(cleanMathContent(r.badge)));
          const badgeW = Math.max(40, badgeText.length * 6.5 + 16);
          const badgeH = 20;
          return (
            <g key={`badge-${id}`}>
              <rect
                x={c.x - badgeW / 2}
                y={c.y - badgeH / 2}
                width={badgeW}
                height={badgeH}
                rx={badgeH / 2}
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth={1}
              />
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.min(11, 130 / badgeText.length + 4)}
                fontWeight="600"
                className="fill-primary"
              >
                {badgeText}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Droppable hit-rects positioned over the SVG. Hidden when no register fn. */}
      {registerRegion && (
        <div className="absolute inset-0 pointer-events-none">
          {VENN_REGIONS.map(({ id }) => renderDroppable(id))}
        </div>
      )}
    </div>
  );
};

export default VennDiagram;
