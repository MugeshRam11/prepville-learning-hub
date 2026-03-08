import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, MapPin, ArrowRight } from 'lucide-react';

interface AnswerRendererProps {
  answerBlockType: string;
  answerBlockConfig: any;
  studentAnswer: string | object;
  correctAnswer?: string;
  mode: 'admin-review' | 'student-review';
}

// Parse answer safely
const parseAnswer = (answer: string | object): any => {
  if (typeof answer === 'object') return answer;
  try { return JSON.parse(answer); } catch { return answer; }
};

// Image Drop Zone Review
const ImageDropZoneReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  if (!config || typeof parsed !== 'object' || parsed === null) {
    return <p className="text-sm text-muted-foreground italic">No valid answer data</p>;
  }

  const zones = config.dropZones || config.zones || [];
  const elements = config.draggableLabels || config.elements || [];
  const correctMapping = config.correctMapping || {};

  // Build element lookup
  const elementMap: Record<string, string> = {};
  elements.forEach((el: any) => { elementMap[el.id] = el.content || el.label || el.id; });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image Drop Zone Answer</span>
      </div>

      {config.imageUrl && (
        <div className="relative rounded-lg overflow-hidden border bg-muted/20 max-h-48">
          <img src={config.imageUrl} alt="Question" className="w-full h-full object-contain" />
        </div>
      )}

      <div className="grid gap-2">
        {zones.map((zone: any) => {
          const studentPlacement = parsed[zone.id];
          const correctElementId = correctMapping[zone.id] || zone.correctItemId;
          const isCorrect = studentPlacement === correctElementId;
          const studentLabel = studentPlacement ? (elementMap[studentPlacement] || studentPlacement) : 'Empty';
          const correctLabel = correctElementId ? (elementMap[correctElementId] || correctElementId) : 'N/A';

          return (
            <div
              key={zone.id}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-sm",
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
                <span className="font-medium truncate">{zone.label || zone.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-xs">
                  {studentLabel}
                </Badge>
                {!isCorrect && mode === 'admin-review' && (
                  <>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                      {correctLabel}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Drag & Drop Review
const DragDropReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  if (!config || typeof parsed !== 'object' || parsed === null) {
    return <p className="text-sm text-muted-foreground italic">No valid answer data</p>;
  }

  const items = config.items || [];
  const targets = config.targets || [];

  const itemMap: Record<string, string> = {};
  items.forEach((item: any) => { itemMap[item.id] = item.content || item.label || item.id; });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🧩</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drag & Drop Answer</span>
      </div>

      <div className="grid gap-2">
        {targets.map((target: any) => {
          const studentItemId = parsed[target.id];
          const correctItemId = target.correctItemId;
          const isCorrect = studentItemId === correctItemId;
          const studentLabel = studentItemId ? (itemMap[studentItemId] || studentItemId) : 'Empty';
          const correctLabel = correctItemId ? (itemMap[correctItemId] || correctItemId) : 'N/A';

          return (
            <div
              key={target.id}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-sm",
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
                <span className="font-medium truncate">{target.label || target.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-xs">
                  {studentLabel}
                </Badge>
                {!isCorrect && mode === 'admin-review' && (
                  <>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                      {correctLabel}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show unmatched items */}
      {(() => {
        const placedIds = new Set(Object.values(parsed));
        const unplaced = items.filter((i: any) => !placedIds.has(i.id));
        if (unplaced.length === 0) return null;
        return (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Not placed:</p>
            <div className="flex flex-wrap gap-1">
              {unplaced.map((item: any) => (
                <Badge key={item.id} variant="outline" className="text-xs">{item.content || item.id}</Badge>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Arrange / Order Review
const ArrangeOrderReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  const items = config?.items || [];

  if (!Array.isArray(parsed)) {
    return <p className="text-sm text-muted-foreground italic">No valid arrangement data</p>;
  }

  const correctOrder = items
    .filter((i: any) => i.correctOrder !== undefined)
    .sort((a: any, b: any) => a.correctOrder - b.correctOrder)
    .map((i: any) => i.id);

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🔢 Arrange / Order Answer</span>
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

// Multiple Choice Review
const MCQReview: React.FC<{
  config: any;
  studentAnswer: any;
  mode: string;
}> = ({ config, studentAnswer, mode }) => {
  const parsed = parseAnswer(studentAnswer);
  const options = config?.options || [];
  const selectedIds = Array.isArray(parsed) ? parsed : [parsed];

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">☑️ Multiple Choice Answer</span>
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

// Table Input Review
const TableInputReview: React.FC<{
  config: any;
  studentAnswer: any;
}> = ({ config, studentAnswer }) => {
  const parsed = parseAnswer(studentAnswer);
  const headers = config?.headers || [];
  const rows = config?.rows || [];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No table data</p>;
  }

  return (
    <div className="space-y-2">
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

// Main renderer
const EvaluationAnswerRenderer: React.FC<AnswerRendererProps> = ({
  answerBlockType,
  answerBlockConfig,
  studentAnswer,
  correctAnswer,
  mode,
}) => {
  const config = answerBlockConfig || {};

  switch (answerBlockType) {
    case 'image_drop':
      return <ImageDropZoneReview config={config} studentAnswer={studentAnswer} mode={mode} />;
    case 'drag_drop':
      return <DragDropReview config={config} studentAnswer={studentAnswer} mode={mode} />;
    case 'arrange_order':
      return <ArrangeOrderReview config={config} studentAnswer={studentAnswer} mode={mode} />;
    case 'multiple_choice':
      return <MCQReview config={config} studentAnswer={studentAnswer} mode={mode} />;
    case 'table_input':
      return <TableInputReview config={config} studentAnswer={studentAnswer} />;
    case 'graph_plot':
      return (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📊 Graph Answer</span>
          <div className="bg-muted/30 rounded-lg p-3">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {typeof studentAnswer === 'string' ? studentAnswer : JSON.stringify(parseAnswer(studentAnswer), null, 2)}
            </pre>
          </div>
        </div>
      );
    case 'text_equation':
    case 'smart_math':
    default: {
      const text = typeof studentAnswer === 'string' ? studentAnswer : JSON.stringify(studentAnswer);
      // Check if it looks like JSON but is actually a simple type
      const looksLikeJson = text.startsWith('{') || text.startsWith('[');
      if (looksLikeJson) {
        // Try to render it more nicely
        try {
          const obj = JSON.parse(text);
          if (typeof obj === 'object' && obj !== null) {
            // Could be a misclassified interactive answer
            return (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {answerBlockType === 'smart_math' ? '🤖 Smart Math Answer' : '📝 Answer'}
                </p>
                <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(obj, null, 2)}</pre>
              </div>
            );
          }
        } catch { /* not JSON, render as text */ }
      }
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Student Answer</p>
          <p className="text-sm whitespace-pre-wrap">{text || 'No answer'}</p>
        </div>
      );
    }
  }
};

export default EvaluationAnswerRenderer;
