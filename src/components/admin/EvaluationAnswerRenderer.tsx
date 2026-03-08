import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, MapPin, ArrowRight, GripVertical, Image as ImageIcon } from 'lucide-react';

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
    if (config.items && config.targets) return 'drag_drop';
    if (config.options) return 'multiple_choice';
    if (config.headers && config.rows) return 'table_input';
    if (config.items && !config.targets) return 'arrange_order';
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
    const targets = config?.targets || [];
    let correct = 0;
    targets.forEach((target: any) => {
      if (target.correctItemId && parsedAnswer[target.id] === target.correctItemId) correct++;
    });
    return { correct, total: targets.length };
  }
  
  return null;
};

// ═══════════════════════════════════════════════
// Image Drop Zone — Visual Review
// ═══════════════════════════════════════════════
const ImageDropZoneReview: React.FC<{
  config: any;
  studentAnswer: any;
  questionImageUrl?: string | null;
  mode: string;
}> = ({ config, studentAnswer, questionImageUrl, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  if (!config || typeof parsed !== 'object' || parsed === null) {
    return <FallbackJsonView data={studentAnswer} label="Image Drop Zone" />;
  }

  const zones = config.dropZones || config.zones || [];
  const elements = config.draggableLabels || config.elements || [];
  const correctMapping = config.correctMapping || {};
  const imageUrl = config.imageUrl || questionImageUrl;

  // Build element lookup
  const elementMap: Record<string, string> = {};
  elements.forEach((el: any) => { elementMap[el.id] = el.content || el.label || el.id; });

  const autoScore = computeAutoScore('image_drop', config, parsed);

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image Drop Zone</span>
        </div>
        {autoScore && (
          <Badge variant={autoScore.correct === autoScore.total ? 'default' : 'secondary'} className="text-xs">
            Auto: {autoScore.correct}/{autoScore.total} correct
          </Badge>
        )}
      </div>

      {/* Visual image with overlaid zones */}
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden border bg-muted/10" style={{ minHeight: 200 }}>
          <img
            src={imageUrl}
            alt="Question diagram"
            className="w-full object-contain max-h-[300px]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Overlay student placements on the image */}
          {zones.map((zone: any) => {
            const studentPlacement = parsed[zone.id];
            const correctId = correctMapping[zone.id] || zone.correctItemId;
            const isCorrect = studentPlacement === correctId;
            const studentLabel = studentPlacement ? (elementMap[studentPlacement] || studentPlacement) : '—';
            
            // Use percentage-based positioning if available
            const style: React.CSSProperties = zone.x !== undefined && zone.y !== undefined ? {
              position: 'absolute',
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              transform: 'translate(-50%, -50%)',
            } : {};

            if (zone.x === undefined) return null; // Skip overlay if no coordinates

            return (
              <div
                key={zone.id}
                style={style}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold shadow-md border-2 backdrop-blur-sm",
                  isCorrect
                    ? "bg-green-100/90 border-green-500 text-green-800"
                    : "bg-red-100/90 border-red-500 text-red-800"
                )}
              >
                {studentLabel}
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed zone-by-zone comparison */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Zone-by-Zone Comparison</p>
        <div className="grid gap-1.5">
          {zones.map((zone: any) => {
            const studentPlacement = parsed[zone.id];
            const correctId = correctMapping[zone.id] || zone.correctItemId;
            const isCorrect = studentPlacement === correctId;
            const studentLabel = studentPlacement ? (elementMap[studentPlacement] || studentPlacement) : '— Empty —';
            const correctLabel = correctId ? (elementMap[correctId] || correctId) : 'N/A';

            return (
              <div
                key={zone.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border text-sm transition-colors",
                  isCorrect
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-medium text-muted-foreground">{zone.label || `Zone ${zone.id}`}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-xs font-medium">
                    {studentLabel}
                  </Badge>
                  {!isCorrect && (
                    <>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400">
                        ✓ {correctLabel}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available elements reference */}
      {mode === 'admin-review' && elements.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1.5">Available Elements:</p>
          <div className="flex flex-wrap gap-1.5">
            {elements.map((el: any) => {
              const wasPlaced = Object.values(parsed).includes(el.id);
              return (
                <Badge
                  key={el.id}
                  variant={wasPlaced ? 'secondary' : 'outline'}
                  className={cn("text-xs", !wasPlaced && "opacity-50")}
                >
                  {el.content || el.label || el.id}
                  {!wasPlaced && ' (unused)'}
                </Badge>
              );
            })}
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

  const items = config.items || [];
  const targets = config.targets || [];
  const itemMap: Record<string, string> = {};
  items.forEach((item: any) => { itemMap[item.id] = item.content || item.label || item.id; });

  const autoScore = computeAutoScore('drag_drop', config, parsed);

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drag & Drop Matching</span>
        </div>
        {autoScore && (
          <Badge variant={autoScore.correct === autoScore.total ? 'default' : 'secondary'} className="text-xs">
            Auto: {autoScore.correct}/{autoScore.total} correct
          </Badge>
        )}
      </div>

      {/* Visual matching layout */}
      <div className="grid gap-2">
        {targets.map((target: any) => {
          const studentItemId = parsed[target.id];
          const correctItemId = target.correctItemId;
          const isCorrect = studentItemId === correctItemId;
          const studentLabel = studentItemId ? (itemMap[studentItemId] || studentItemId) : '— Empty —';
          const correctLabel = correctItemId ? (itemMap[correctItemId] || correctItemId) : 'N/A';

          return (
            <div
              key={target.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-sm",
                isCorrect
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              )}
            >
              {/* Target label */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-medium">{target.label || target.id}</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

              {/* Student's choice */}
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn(
                  "px-3 py-1 rounded-md border font-medium text-xs",
                  isCorrect
                    ? "bg-green-100 dark:bg-green-900/30 border-green-300 text-green-800 dark:text-green-300"
                    : "bg-red-100 dark:bg-red-900/30 border-red-300 text-red-800 dark:text-red-300"
                )}>
                  {studentLabel}
                </div>
                {!isCorrect && (
                  <div className="px-3 py-1 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-medium">
                    ✓ {correctLabel}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unplaced items */}
      {(() => {
        const placedIds = new Set(Object.values(parsed));
        const unplaced = items.filter((i: any) => !placedIds.has(i.id));
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
    </div>
  );
};

// ═══════════════════════════════════════════════
// Arrange / Order Review
// ═══════════════════════════════════════════════
const ArrangeOrderReview: React.FC<{
  config: any;
  studentAnswer: any;
}> = ({ config, studentAnswer }) => {
  const parsed = parseAnswer(studentAnswer);
  const items = config?.items || [];

  if (!Array.isArray(parsed)) {
    return <FallbackJsonView data={studentAnswer} label="Arrange / Order" />;
  }

  const correctOrder = items
    .filter((i: any) => i.correctOrder !== undefined)
    .sort((a: any, b: any) => a.correctOrder - b.correctOrder)
    .map((i: any) => i.id);

  return (
    <div className="space-y-2 border rounded-xl p-4 bg-background">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🔢 Arrange / Order</span>
      <div className="grid gap-1.5">
        {parsed.map((itemId: string, idx: number) => {
          const item = items.find((i: any) => i.id === itemId);
          const isCorrectPosition = correctOrder[idx] === itemId;
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2 p-2 rounded border text-sm",
                isCorrectPosition
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200"
              )}
            >
              <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
              {isCorrectPosition ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
              <span>{item?.content || itemId}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Multiple Choice Review
// ═══════════════════════════════════════════════
const MCQReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  const options = config?.options || [];
  const selectedIds = Array.isArray(parsed) ? parsed : [parsed];

  return (
    <div className="space-y-2 border rounded-xl p-4 bg-background">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">☑️ Multiple Choice</span>
      <div className="grid gap-1.5">
        {options.map((opt: any) => {
          const isSelected = selectedIds.includes(opt.id);
          const isCorrect = opt.isCorrect;
          return (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded border text-sm",
                isSelected && isCorrect && "bg-green-50 dark:bg-green-950/20 border-green-200",
                isSelected && !isCorrect && "bg-red-50 dark:bg-red-950/20 border-red-200",
                !isSelected && isCorrect && mode === 'admin-review' && "bg-green-50/50 dark:bg-green-950/10 border-green-100",
                !isSelected && !isCorrect && "bg-muted/20 border-border/50"
              )}
            >
              {isSelected && isCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
              {isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-red-600" />}
              {!isSelected && isCorrect && mode === 'admin-review' && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
              {!isSelected && !isCorrect && <div className="w-3.5 h-3.5" />}
              <span>{opt.content || opt.id}</span>
              {isSelected && <Badge variant="outline" className="ml-auto text-xs">Selected</Badge>}
            </div>
          );
        })}
      </div>
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
    case 'image_drop':
      return <ImageDropZoneReview config={config} studentAnswer={parsed} questionImageUrl={questionImageUrl} mode={mode} />;
    case 'drag_drop':
      return <DragDropReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'arrange_order':
      return <ArrangeOrderReview config={config} studentAnswer={parsed} />;
    case 'multiple_choice':
      return <MCQReview config={config} studentAnswer={parsed} mode={mode} />;
    case 'table_input':
      return <TableInputReview config={config} studentAnswer={parsed} />;
    case 'graph_plot':
      return (
        <div className="space-y-2 border rounded-xl p-4 bg-background">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📊 Graph Answer</span>
          <FallbackJsonView data={parsed} />
        </div>
      );
    case 'text_equation':
    case 'smart_math':
    default: {
      // For text types, render cleanly
      const text = typeof parsed === 'string' ? parsed : (typeof studentAnswer === 'string' ? studentAnswer : '');
      if (!text && typeof parsed === 'object' && parsed !== null) {
        // Object answer with text_equation type — likely misclassified, show structured
        return <FallbackJsonView data={parsed} label="Answer" />;
      }
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {resolvedType === 'smart_math' ? '🤖 Smart Math Answer' : '📝 Student Answer'}
          </p>
          <p className="text-sm whitespace-pre-wrap">{text || 'No answer'}</p>
        </div>
      );
    }
  }
};

export default EvaluationAnswerRenderer;
