import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { renderLatexContent } from '@/lib/renderLatex';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DraggableElementContent } from '@/components/image-drop/DraggableElementContent';
import GraphPlotPlayer from '@/components/mock-exam/GraphPlotPlayer';
import { CheckCircle, XCircle, MapPin, ArrowRight, GripVertical, Image as ImageIcon, ListOrdered, Calculator } from 'lucide-react';

interface AnswerRendererProps {
  answerBlockType: string;
  answerBlockConfig: any;
  studentAnswer: string | object;
  correctAnswer?: string;
  questionImageUrl?: string | null;
  mode: 'admin-review' | 'student-review';
}

// Parse answer safely — always returns native object/array/string
const parseAnswer = (answer: string | object): any => {
  if (answer === null || answer === undefined) return null;
  if (typeof answer === 'object') return answer;
  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { return JSON.parse(trimmed); } catch { /* not JSON */ }
    }
  }
  return answer;
};

// Auto-detect answer type from data shape when answerBlockType is wrong/default
const detectAnswerType = (answerBlockType: string, config: any, parsedAnswer: any): string => {
  // Trust explicit non-default types
  if (answerBlockType && answerBlockType !== 'text_equation') return answerBlockType;
  
  // Try to detect from config
  if (config) {
    if (config.dropZones || config.zones || config.draggableLabels || config.elements) return 'image_drop';
    if ((config.items && config.targets) || (config.sourceItems && config.targetItems)) return 'drag_drop';
    if (config.options) return 'multiple_choice';
    if (config.headers && config.rows) return 'table_input';
    if ((config.items && !config.targets && !config.sourceItems) || config.correctOrder) return 'arrange_order';
    if (config.expectedAnswers || config.palettes) return 'smart_math';
    if (config.xRange || config.yRange || config.showGrid) return 'graph_plot';
  }
  
  // Try to detect from answer shape
  if (parsedAnswer && typeof parsedAnswer === 'object' && !Array.isArray(parsedAnswer)) {
    const keys = Object.keys(parsedAnswer);
    if (keys.some(k => k.startsWith('zone-'))) return 'image_drop';
    if (keys.some(k => k.startsWith('target-'))) return 'drag_drop';
  }
  
  return answerBlockType || 'text_equation';
};

// Compute auto-score for interactive types
const computeAutoScore = (type: string, config: any, parsedAnswer: any): { correct: number; total: number } | null => {
  if (!parsedAnswer || typeof parsedAnswer !== 'object' && type !== 'multiple_choice') return null;
  
  if (type === 'multiple_choice') {
    const options = config?.options || config?.mcqConfig?.options || [];
    const correctIds: string[] = config?.correctOptionIds || 
      options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
    const selectedIds = Array.isArray(parsedAnswer) ? parsedAnswer : (parsedAnswer ? [String(parsedAnswer)] : []);
    const isCorrect = correctIds.length > 0 && 
      correctIds.every((id: string) => selectedIds.includes(id)) && 
      selectedIds.every((id: string) => correctIds.includes(id));
    return { correct: isCorrect ? 1 : 0, total: 1 };
  }
  
  if (!parsedAnswer || typeof parsedAnswer !== 'object') return null;
  
  if (type === 'image_drop') {
    const zones = config?.dropZones || config?.zones || [];
    const correctMapping = config?.correctMapping || {};
    let correct = 0;
    zones.forEach((zone: any) => {
      const correctId = correctMapping[zone.id] || zone.correctItemId;
      if (correctId && parsedAnswer[zone.id] === correctId) correct++;
    });
    return { correct, total: zones.length };
  }
  
  if (type === 'drag_drop') {
    // Support new format (sourceItems/targetItems/correctMatches) and legacy (items/targets with correctItemId)
    const targets = config?.targetItems || config?.targets || [];
    const correctMatches: Record<string, string> = config?.correctMatches || {};
    
    // Build reverse map: targetId -> sourceId
    const reverseCorrect: Record<string, string> = {};
    Object.entries(correctMatches).forEach(([srcId, tgtId]) => {
      reverseCorrect[tgtId as string] = srcId;
    });
    
    let correct = 0;
    targets.forEach((target: any) => {
      const correctSourceId = reverseCorrect[target.id] || target.correctItemId;
      if (correctSourceId && parsedAnswer[target.id] === correctSourceId) correct++;
    });
    return { correct, total: targets.length };
  }
  
  return null;
};

// ═══════════════════════════════════════════════
// Image Drop Zone — Visual Review
// ═══════════════════════════════════════════════
const normalizeImageDropConfig = (config: any) => {
  const nested = config?.imageDropConfig || {};
  return {
    zones: config?.zones || config?.dropZones || nested?.zones || nested?.dropZones || [],
    elements: config?.elements || config?.draggableLabels || nested?.elements || nested?.draggableLabels || [],
    answers: config?.answers || config?.correctMapping || nested?.answers || nested?.correctMapping || {},
    imageUrl: config?.imageUrl || nested?.imageUrl || null,
  };
};

const resolveElementIdFromValue = (value: any, elements: any[]): string | null => {
  if (!value) return null;
  const raw = String(value);
  const byId = elements.find((e: any) => e?.id === raw);
  if (byId?.id) return byId.id;

  const byContent = elements.find((e: any) => {
    const text = e?.content || e?.label || '';
    return text && text === raw;
  });
  return byContent?.id || null;
};

const ImageDropZoneReview: React.FC<{
  config: any;
  studentAnswer: any;
  questionImageUrl?: string | null;
  mode: string;
}> = ({ config, studentAnswer, questionImageUrl, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  if (!config || typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return <FallbackJsonView data={studentAnswer} label="Image Drop Zone" />;
  }

  const normalized = normalizeImageDropConfig(config);
  const zones = normalized.zones;
  const elements = normalized.elements;
  const answers = normalized.answers;
  const imageUrl = normalized.imageUrl || questionImageUrl;

  const elementMap: Record<string, any> = {};
  elements.forEach((el: any) => {
    if (el?.id) elementMap[el.id] = el;
  });

  const toPlacement = (zoneId: string, sourceMap: Record<string, any>) => {
    const rawValue = sourceMap?.[zoneId];
    const resolvedId = resolveElementIdFromValue(rawValue, elements);
    if (!resolvedId) return rawValue ? { id: `unknown-${zoneId}`, content: 'Unmapped element' } : null;
    return elementMap[resolvedId] || null;
  };

  const placementRows = zones.map((zone: any) => {
    const studentElement = toPlacement(zone.id, parsed);
    const correctElement = toPlacement(zone.id, answers);
    const isCorrect = !!studentElement && !!correctElement && studentElement.id === correctElement.id;

    return {
      zone,
      studentElement,
      correctElement,
      isCorrect,
    };
  });

  const correctCount = placementRows.filter((r) => r.isCorrect).length;

  const renderElement = (element: any, emptyLabel = 'Not placed') => {
    if (!element) return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
    return <DraggableElementContent element={element} size="review" />;
  };

  const renderOverlay = (map: Record<string, any>, viewType: 'student' | 'correct') => (
    <div className="relative rounded-lg overflow-hidden border bg-muted/10">
      {imageUrl ? (
        <img src={imageUrl} alt="Question diagram" className="w-full object-contain max-h-[420px]" />
      ) : (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No image configured</div>
      )}

      {zones.map((zone: any) => {
        if (zone?.x === undefined || zone?.y === undefined) return null;

        const placedElement = toPlacement(zone.id, map);
        const width = Number(zone.width) || 14;
        const height = Number(zone.height) || 10;

        return (
          <div
            key={`${viewType}-${zone.id}`}
            className="absolute border border-dashed border-primary/50 bg-primary/10 rounded-md p-1 flex items-center justify-center"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            {placedElement ? (
              <div className="max-w-full max-h-full rounded border bg-background/80 px-2 py-1 shadow-sm">
                {renderElement(placedElement)}
              </div>
            ) : (
              renderElement(null, 'Not placed')
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image Drop Zone</span>
        </div>
        <Badge variant={correctCount === zones.length ? 'default' : 'secondary'} className="text-xs">
          Auto: {correctCount}/{zones.length} correct
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Student Attempt</p>
          {renderOverlay(parsed, 'student')}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Correct Answer</p>
          {renderOverlay(answers, 'correct')}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Zone-by-zone review</p>
        <div className="grid gap-1.5">
          {placementRows.map(({ zone, studentElement, correctElement, isCorrect }) => (
            <div
              key={zone.id}
              className={cn(
                'grid grid-cols-1 md:grid-cols-[minmax(120px,180px)_1fr_1fr] items-center gap-2 rounded-lg border p-2.5',
                isCorrect
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-center gap-2">
                {isCorrect ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span className="text-sm font-medium text-muted-foreground">{zone.label || 'Zone'}</span>
              </div>
              <div className="rounded border bg-background px-2 py-1">{renderElement(studentElement, 'Not placed')}</div>
              <div className="rounded border bg-background px-2 py-1">{renderElement(correctElement, 'No correct mapping')}</div>
            </div>
          ))}
        </div>
      </div>

      {mode === 'admin-review' && elements.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1.5">Configured draggable elements</p>
          <div className="flex flex-wrap gap-1.5">
            {elements.map((el: any) => (
              <div key={el.id} className="rounded border px-2 py-1 bg-muted/20">
                <DraggableElementContent element={el} size="review" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Drag & Drop — Visual Review
// ═══════════════════════════════════════════════
const DragDropReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  if (!config || typeof parsed !== 'object' || parsed === null) {
    return <FallbackJsonView data={studentAnswer} label="Drag & Drop" />;
  }

  // Support both new flat admin format (sourceItems/targetItems/correctMatches)
  // and legacy format (items/targets with correctItemId)
  const sourceItems = config.sourceItems || config.items || [];
  const targetItems = config.targetItems || config.targets || [];
  const correctMatches: Record<string, string> = config.correctMatches || {};
  
  // Build source item lookup
  const sourceMap: Record<string, string> = {};
  sourceItems.forEach((item: any) => { sourceMap[item.id] = item.content || item.label || item.id; });

  // Build reverse map: targetId -> sourceId (for new format)
  const reverseCorrect: Record<string, string> = {};
  Object.entries(correctMatches).forEach(([srcId, tgtId]) => {
    reverseCorrect[tgtId as string] = srcId;
  });

  // Build per-target review rows
  const reviewRows = targetItems.map((target: any) => {
    const targetLabel = target.content || target.label || target.id;
    
    // What did the student place here?
    const studentSourceId = parsed[target.id];
    const studentLabel = studentSourceId ? (sourceMap[studentSourceId] || studentSourceId) : '— Empty —';
    
    // What is the correct source for this target?
    // New format: correctMatches maps sourceId->targetId, so reverse lookup
    // Legacy format: target.correctItemId
    const correctSourceId = reverseCorrect[target.id] || target.correctItemId;
    const correctLabel = correctSourceId ? (sourceMap[correctSourceId] || correctSourceId) : 'N/A';
    
    const isCorrect = !!studentSourceId && !!correctSourceId && studentSourceId === correctSourceId;
    
    return { targetId: target.id, targetLabel, studentLabel, correctLabel, isCorrect, studentSourceId, correctSourceId };
  });

  const correctCount = reviewRows.filter((r: any) => r.isCorrect).length;

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drag & Drop Matching</span>
        </div>
        <Badge variant={correctCount === reviewRows.length ? 'default' : 'secondary'} className="text-xs">
          Auto: {correctCount}/{reviewRows.length} correct
        </Badge>
      </div>

      {/* Visual matching layout */}
      <div className="grid gap-2">
        {reviewRows.map((row: any) => (
          <div
            key={row.targetId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border text-sm",
              row.isCorrect
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            )}
          >
            {/* Target label */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {row.isCorrect ? (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{row.targetLabel}</span>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

            {/* Student's choice */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn(
                "px-3 py-1 rounded-md border font-medium text-xs",
                row.isCorrect
                  ? "bg-green-100 dark:bg-green-900/30 border-green-300 text-green-800 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/30 border-red-300 text-red-800 dark:text-red-300"
              )}>
                {row.studentLabel}
              </div>
              {!row.isCorrect && row.correctSourceId && (
                <div className="px-3 py-1 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-medium">
                  ✓ {row.correctLabel}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unplaced items */}
      {(() => {
        const placedIds = new Set(Object.values(parsed));
        const unplaced = sourceItems.filter((i: any) => !placedIds.has(i.id));
        if (unplaced.length === 0) return null;
        return (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1.5">Not placed by student:</p>
            <div className="flex flex-wrap gap-1.5">
              {unplaced.map((item: any) => (
                <Badge key={item.id} variant="outline" className="text-xs opacity-60">
                  {item.content || item.id}
                </Badge>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Explanation & eval notes */}
      {config?.explanation && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Explanation</p>
          <p className="text-sm">{config.explanation}</p>
        </div>
      )}
      {config?.evaluationNotes && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Evaluation Notes</p>
          <p className="text-sm">{config.evaluationNotes}</p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Arrange / Order Review
// ═══════════════════════════════════════════════
const ArrangeOrderReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  // Support both new flat format (items + correctOrder array) and legacy (items with correctOrder field)
  const items = config?.items || [];
  const correctOrderArr: string[] = config?.correctOrder || [];

  // If student answer is an object with orderedItemIds key, extract it
  const studentOrder: string[] = Array.isArray(parsed)
    ? parsed
    : (parsed?.orderedItemIds || []);

  if (!Array.isArray(studentOrder) || studentOrder.length === 0) {
    return <FallbackJsonView data={studentAnswer} label="Arrange / Order" />;
  }

  // Build correct order: prefer explicit correctOrder array, else sort by correctOrder field
  const correctOrder = correctOrderArr.length > 0
    ? correctOrderArr
    : items
        .filter((i: any) => i.correctOrder !== undefined)
        .sort((a: any, b: any) => a.correctOrder - b.correctOrder)
        .map((i: any) => i.id);

  const itemMap: Record<string, any> = {};
  items.forEach((i: any) => { itemMap[i.id] = i; });

  const correctCount = studentOrder.filter((id: string, idx: number) => correctOrder[idx] === id).length;
  const instruction = config?.instruction || '';

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arrange / Order</span>
        </div>
        <Badge variant={correctCount === correctOrder.length ? 'default' : 'secondary'} className="text-xs">
          Auto: {correctCount}/{correctOrder.length} correct
        </Badge>
      </div>

      {instruction && (
        <p className="text-sm text-muted-foreground italic">{instruction}</p>
      )}

      {/* Side-by-side comparison */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Student Order</p>
          <div className="grid gap-1.5">
            {studentOrder.map((itemId: string, idx: number) => {
              const item = itemMap[itemId];
              const isCorrectPosition = correctOrder[idx] === itemId;
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border text-sm",
                    isCorrectPosition
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  )}
                >
                  <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                  {isCorrectPosition ? <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                  <span className="flex-1">{item?.content || itemId}</span>
                </div>
              );
            })}
          </div>
        </div>

        {mode === 'admin-review' && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Correct Order</p>
            <div className="grid gap-1.5">
              {correctOrder.map((itemId: string, idx: number) => {
                const item = itemMap[itemId];
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 text-sm"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span className="flex-1">{item?.content || itemId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {config?.explanation && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Explanation</p>
          <p className="text-sm">{config.explanation}</p>
        </div>
      )}
      {config?.evaluationNotes && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Evaluation Notes</p>
          <p className="text-sm">{config.evaluationNotes}</p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Graph Plot — Visual Review with compare overlay
// ═══════════════════════════════════════════════
const GraphPlotReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const [viewMode, setViewMode] = useState<'student' | 'correct' | 'compare'>('compare');
  const parsed = parseAnswer(studentAnswer);

  const studentPts = parsed?.points || [];
  const studentLns = parsed?.lines || [];
  const expectedPts = config?.expectedAnswer?.points || [];
  const expectedLns = config?.expectedAnswer?.lines || [];
  const canvas = config?.canvas || { xMin: -10, xMax: 10, yMin: -10, yMax: 10, gridStep: 1, showNumbers: true, showAxisLabels: true };
  const scoring = config?.scoring || {};

  // Auto-score: count matched points within tolerance
  const tolerance = scoring.pointTolerance || 0.5;
  let matchedPts = 0;
  expectedPts.forEach((ep: any) => {
    if (studentPts.some((sp: any) => Math.abs(sp.x - ep.x) <= tolerance && Math.abs(sp.y - ep.y) <= tolerance)) {
      matchedPts++;
    }
  });

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📊 Graph Plot</span>
        <div className="flex items-center gap-2">
          {expectedPts.length > 0 && (
            <Badge variant={matchedPts === expectedPts.length ? 'default' : 'secondary'} className="text-xs">
              Points: {matchedPts}/{expectedPts.length}
            </Badge>
          )}
        </div>
      </div>

      {/* View mode switcher */}
      {mode === 'admin-review' && (expectedPts.length > 0 || expectedLns.length > 0) && (
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['compare', 'student', 'correct'] as const).map(m => (
            <Button key={m} size="sm" variant={viewMode === m ? 'default' : 'ghost'} className="h-7 text-xs flex-1" onClick={() => setViewMode(m)}>
              {m === 'compare' ? 'Compare' : m === 'student' ? 'Student' : 'Expected'}
            </Button>
          ))}
        </div>
      )}

      <GraphPlotPlayer
        canvasConfig={canvas}
        allowedTools={[]}
        value={{ points: studentPts, lines: studentLns }}
        onChange={() => {}}
        readonly
        expectedAnswer={{ points: expectedPts, lines: expectedLns }}
        viewMode={viewMode}
        width={380}
        height={380}
      />

      {config?.evaluationNotes && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Evaluation Notes</p>
          <p className="text-sm">{config.evaluationNotes}</p>
        </div>
      )}
    </div>
  );
};


const MCQReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  const options = config?.options || config?.mcqConfig?.options || [];
  const selectedIds = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
  
  // Determine correct IDs from either correctOptionIds array or isCorrect flag
  const correctIds: string[] = config?.correctOptionIds || 
    options.filter((o: any) => o.isCorrect).map((o: any) => o.id);

  const correctCount = selectedIds.filter((id: string) => correctIds.includes(id)).length;
  const totalCorrectNeeded = correctIds.length;
  const isFullyCorrect = correctCount === totalCorrectNeeded && selectedIds.length === totalCorrectNeeded;

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">☑️ Multiple Choice</span>
        <Badge variant={isFullyCorrect ? 'default' : 'secondary'} className="text-xs">
          Auto: {isFullyCorrect ? '✓ Correct' : '✗ Incorrect'}
        </Badge>
      </div>
      <div className="grid gap-1.5">
        {options.map((opt: any, idx: number) => {
          const isSelected = selectedIds.includes(opt.id);
          const isCorrect = correctIds.includes(opt.id);
          return (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 text-sm transition-colors",
                isSelected && isCorrect && "bg-green-50 dark:bg-green-950/20 border-green-500",
                isSelected && !isCorrect && "bg-red-50 dark:bg-red-950/20 border-red-500",
                !isSelected && isCorrect && mode === 'admin-review' && "bg-green-50/50 dark:bg-green-950/10 border-green-200 border-dashed",
                !isSelected && !isCorrect && "bg-muted/20 border-border/50"
              )}
            >
              {/* Label circle */}
              <span className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                isSelected && isCorrect && 'bg-green-500 text-white',
                isSelected && !isCorrect && 'bg-red-500 text-white',
                !isSelected && isCorrect && mode === 'admin-review' && 'bg-green-200 text-green-800',
                !isSelected && !isCorrect && 'border-2 border-muted-foreground/30'
              )}>
                {isSelected && isCorrect && <CheckCircle className="w-3.5 h-3.5" />}
                {isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5" />}
                {!isSelected && isCorrect && mode === 'admin-review' && <CheckCircle className="w-3.5 h-3.5" />}
                {(!isSelected || (!isCorrect && !isSelected)) && !(isCorrect && mode === 'admin-review') && (opt.label || String.fromCharCode(65 + idx))}
              </span>
              
              <span className="flex-1">{opt.content || opt.id}</span>
              
              {isSelected && (
                <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-xs ml-auto">
                  {isCorrect ? '✓ Correct' : '✗ Wrong'}
                </Badge>
              )}
              {!isSelected && isCorrect && mode === 'admin-review' && (
                <Badge variant="outline" className="text-xs ml-auto text-green-600 border-green-300">
                  Correct answer
                </Badge>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Explanation if available */}
      {config?.explanation && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Explanation</p>
          <p className="text-sm">{config.explanation}</p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Table Input Review
// ═══════════════════════════════════════════════
const TableInputReview: React.FC<{
  config: any;
  studentAnswer: any;
}> = ({ config, studentAnswer }) => {
  const parsed = parseAnswer(studentAnswer);
  const headers = config?.headers || [];
  const rows = config?.rows || [];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return <FallbackJsonView data={studentAnswer} label="Table" />;
  }

  return (
    <div className="space-y-2 border rounded-xl p-4 bg-background">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📋 Table Answer</span>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h: string, i: number) => (
                <th key={i} className="px-3 py-1.5 text-left font-medium border-b">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.map((row: any, ri: number) => {
              const cells = Array.isArray(row) ? row : row?.cells || [];
              const correctRow = rows[ri]?.cells || [];
              return (
                <tr key={ri} className="border-b last:border-0">
                  {cells.map((cell: any, ci: number) => {
                    const val = typeof cell === 'object' ? cell.value : cell;
                    const correct = correctRow[ci]?.correct;
                    const isCorrect = correct && val === correct;
                    return (
                      <td
                        key={ci}
                        className={cn(
                          "px-3 py-1.5",
                          correct && (isCorrect ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20")
                        )}
                      >
                        {val}
                        {correct && !isCorrect && (
                          <span className="text-xs text-green-600 ml-1">({correct})</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Smart Math — Visual Review
// ═══════════════════════════════════════════════
const renderLatexSafe = (latex: string): string => {
  if (!latex) return '';
  try {
    const katex = (window as any).katex;
    if (katex) return katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch { /* fallback */ }
  return latex;
};

const SmartMathReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  
  // Extract student latex
  const studentLatex = typeof parsed === 'object' && parsed?.latex
    ? parsed.latex
    : (typeof parsed === 'string' ? parsed : '');
  
  // Expected answers from config
  const expectedAnswers: { latex: string }[] = config?.expectedAnswers || [];
  const evaluationMode = config?.evaluationMode || 'exact_match';
  
  // Check match
  const isExactMatch = expectedAnswers.some(ea => ea.latex === studentLatex);
  const matchStatus = isExactMatch ? 'correct' : (evaluationMode === 'manual_only' ? 'manual_review' : 'incorrect');

  // Lazy-load katex for rendering
  const [katexLoaded, setKatexLoaded] = React.useState(false);
  React.useEffect(() => {
    import('katex').then(mod => {
      (window as any).katex = mod.default;
      setKatexLoaded(true);
    });
  }, []);

  const renderMath = (latex: string) => {
    if (!latex) return <span className="text-muted-foreground text-sm italic">No answer</span>;
    if (!katexLoaded) return <span className="font-mono text-sm">{latex}</span>;
    return <span dangerouslySetInnerHTML={{ __html: renderLatexSafe(latex) }} />;
  };

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Smart Math</span>
        </div>
        <Badge
          variant={matchStatus === 'correct' ? 'default' : matchStatus === 'manual_review' ? 'outline' : 'secondary'}
          className="text-xs"
        >
          {matchStatus === 'correct' ? '✓ Correct' : matchStatus === 'manual_review' ? '⏳ Manual Review' : '✗ Incorrect'}
        </Badge>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Student Answer</p>
          <div className={cn(
            "p-3 rounded-lg border-2 text-center min-h-[48px] flex items-center justify-center",
            matchStatus === 'correct'
              ? "border-green-300 bg-green-50 dark:bg-green-950/20"
              : matchStatus === 'incorrect'
              ? "border-red-300 bg-red-50 dark:bg-red-950/20"
              : "border-border bg-muted/20"
          )}>
            <div className="text-lg">{renderMath(studentLatex)}</div>
          </div>
          {studentLatex && (
            <p className="text-xs font-mono text-muted-foreground truncate" title={studentLatex}>
              LaTeX: {studentLatex}
            </p>
          )}
        </div>

        {mode === 'admin-review' && expectedAnswers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Expected Answer{expectedAnswers.length > 1 ? 's' : ''}</p>
            {expectedAnswers.map((ea: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 text-center min-h-[48px] flex items-center justify-center"
              >
                <div className="text-lg">{renderMath(ea.latex)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation mode badge */}
      {mode === 'admin-review' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            Mode: {evaluationMode.replace('_', ' ')}
          </Badge>
          {config?.scoring?.partialCredit && (
            <Badge variant="outline" className="text-xs">Partial credit</Badge>
          )}
        </div>
      )}

      {config?.explanation && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Explanation</p>
          <p className="text-sm">{config.explanation}</p>
        </div>
      )}
      {config?.evaluationNotes && mode === 'admin-review' && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Evaluation Notes</p>
          <p className="text-sm">{config.evaluationNotes}</p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Fallback JSON viewer — for when we can't render visually
// ═══════════════════════════════════════════════
const FallbackJsonView: React.FC<{ data: any; label?: string }> = ({ data, label }) => {
  const parsed = parseAnswer(data);
  const display = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed || 'No answer');
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      {label && <p className="text-xs font-medium text-muted-foreground mb-1">{label} Answer</p>}
      <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">{display}</pre>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Main Renderer — switches by detected type
// ═══════════════════════════════════════════════
const EvaluationAnswerRenderer: React.FC<AnswerRendererProps> = ({
  answerBlockType,
  answerBlockConfig,
  studentAnswer,
  correctAnswer,
  questionImageUrl,
  mode,
}) => {
  const config = answerBlockConfig || {};
  const parsed = parseAnswer(studentAnswer);
  const resolvedType = detectAnswerType(answerBlockType, config, parsed);

  switch (resolvedType) {
    case 'image_fill_blanks': {
      const ImageFillBlanksReview = React.lazy(() => import('@/components/answer-types/ImageFillBlanksReview'));
      return (
        <React.Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading...</div>}>
          <ImageFillBlanksReview config={config as any} studentAnswer={parsed} mode={mode} />
        </React.Suspense>
      );
    }
    case 'image_drop':
      return <ImageDropZoneReview config={config} studentAnswer={parsed} questionImageUrl={questionImageUrl} mode={mode} />;
    case 'drag_drop':
      return <DragDropReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'arrange_order':
      return <ArrangeOrderReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'multiple_choice':
      return <MCQReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'table_input':
      return <TableInputReview config={config} studentAnswer={parsed} />;
    case 'graph_plot':
      return <GraphPlotReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'smart_math':
      return <SmartMathReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'text_equation':
    default: {
      // For text types, render cleanly
      const text = typeof parsed === 'string' ? parsed : (typeof studentAnswer === 'string' ? studentAnswer : '');
      if (!text && typeof parsed === 'object' && parsed !== null) {
        // Object answer with text_equation type — likely misclassified, show structured
        return <FallbackJsonView data={parsed} label="Answer" />;
      }
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">📝 Student Answer</p>
          <div className="text-sm whitespace-pre-wrap">{text ? renderLatexContent(text) : 'No answer'}</div>
        </div>
      );
    }
  }
};

export default EvaluationAnswerRenderer;
