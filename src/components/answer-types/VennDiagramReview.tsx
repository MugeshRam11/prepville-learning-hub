/**
 * Review renderer for `venn_drag` answers.
 *
 * Single colour-coded Venn:
 *   green  → student placed correctly
 *   red    → student placed in wrong region
 *   yellow → correct region missed (no chip placed there)
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import VennDiagram, { VENN_REGIONS, type VennRegionId } from './VennDiagram';
import type { VennDiagramConfig } from './VennDiagramEditor';
import type { VennPlayerValue } from './VennDiagramPlayer';
import { renderFinalText } from '@/lib/renderFinalText';

interface VennDiagramReviewProps {
  config: VennDiagramConfig;
  studentAnswer: VennPlayerValue | any;
  mode?: 'admin-review' | 'student-review';
}

type RegionVerdict = 'correct' | 'wrong' | 'missed' | 'idle';

const VennDiagramReview: React.FC<VennDiagramReviewProps> = ({ config, studentAnswer }) => {
  const student: VennPlayerValue =
    studentAnswer && typeof studentAnswer === 'object' && !Array.isArray(studentAnswer)
      ? studentAnswer
      : {};
  const correct = config.correct_answer || {};

  // Per-region verdict for the SVG, plus per-label verdict for the legend.
  const regionVerdict: Record<VennRegionId, RegionVerdict> = {
    A_only: 'idle',
    B_only: 'idle',
    intersection: 'idle',
    outside: 'idle',
  };

  let correctCount = 0;
  let wrongCount = 0;
  let missedCount = 0;

  config.draggables.forEach((d) => {
    const placedRegion = (Object.entries(student) as [VennRegionId, string[]][])
      .find(([, ids]) => ids.includes(d.id))?.[0] as VennRegionId | undefined;
    const correctRegions = (Object.entries(correct) as [VennRegionId, string[]][])
      .filter(([, ids]) => ids.includes(d.id))
      .map(([r]) => r);

    if (placedRegion && correctRegions.includes(placedRegion)) {
      regionVerdict[placedRegion] = 'correct';
      correctCount += 1;
    } else if (placedRegion) {
      // Only downgrade to wrong if not already marked correct by a different chip.
      if (regionVerdict[placedRegion] !== 'correct') regionVerdict[placedRegion] = 'wrong';
      wrongCount += 1;
    }

    // Mark any expected region the student didn't reach.
    correctRegions.forEach((r) => {
      if (!placedRegion || placedRegion !== r) {
        if (regionVerdict[r] === 'idle') regionVerdict[r] = 'missed';
        if (!placedRegion) missedCount += 1;
      }
    });
  });

  const regionsState = Object.fromEntries(
    VENN_REGIONS.map(({ id }) => [id, { state: regionVerdict[id] }])
  );

  const isFullyCorrect = wrongCount === 0 && missedCount === 0 && correctCount > 0;

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">🎯 Venn Diagram Answer</p>
        <Badge variant={isFullyCorrect ? 'default' : 'destructive'} className="text-[10px]">
          {isFullyCorrect ? 'Correct' : 'Review'}
        </Badge>
      </div>

      <div className="flex justify-center bg-background rounded-md p-2">
        <VennDiagram regions={regionsState} setLabels={config.setLabels} compact />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-primary" /> Correct ({correctCount})
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="w-3 h-3 text-destructive" /> Wrong ({wrongCount})
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" style={{ color: 'hsl(45 95% 45%)' }} /> Missed ({missedCount})
        </span>
      </div>

      {/* Per-label breakdown */}
      <div className="space-y-1">
        {config.draggables.map((d) => {
          const placedRegion = (Object.entries(student) as [VennRegionId, string[]][])
            .find(([, ids]) => ids.includes(d.id))?.[0] as VennRegionId | undefined;
          const correctRegions = (Object.entries(correct) as [VennRegionId, string[]][])
            .filter(([, ids]) => ids.includes(d.id))
            .map(([r]) => VENN_REGIONS.find((x) => x.id === r)?.label || r);
          const isOk = placedRegion && (correct[placedRegion] || []).includes(d.id);
          return (
            <div key={d.id} className="flex items-center justify-between text-xs gap-2">
              <span className="font-medium truncate">{renderFinalText(d.label)}</span>
              <span className="text-muted-foreground text-right">
                {placedRegion ? (
                  <>
                    placed in{' '}
                    <span className={isOk ? 'text-primary font-medium' : 'text-destructive font-medium'}>
                      {VENN_REGIONS.find((x) => x.id === placedRegion)?.label}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'hsl(45 95% 35%)' }}>not placed</span>
                )}
                {!isOk && correctRegions.length > 0 && (
                  <> · expected <span className="text-primary">{correctRegions.join(', ')}</span></>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VennDiagramReview;
