import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import type { ImageFillBlanksConfig } from './ImageFillBlanksEditor';

interface ImageFillBlanksReviewProps {
  config: ImageFillBlanksConfig;
  studentAnswer: Record<string, { value: string; type: string }>;
  mode: 'admin-review' | 'student-review';
}

const normalizeValue = (val: string, zone: { caseSensitive: boolean; trimWhitespace: boolean }): string => {
  let v = val || '';
  if (zone.trimWhitespace) v = v.trim().replace(/\s+/g, ' ');
  if (!zone.caseSensitive) v = v.toLowerCase();
  return v;
};

const checkZoneCorrectness = (
  zone: { expectedAnswers: { value: string; type: string }[]; caseSensitive: boolean; trimWhitespace: boolean },
  studentValue: string
): boolean => {
  const normalized = normalizeValue(studentValue, zone);
  return zone.expectedAnswers.some(ea => {
    const expected = normalizeValue(ea.value, zone);
    return normalized === expected;
  });
};

const ImageFillBlanksReview: React.FC<ImageFillBlanksReviewProps> = ({ config, studentAnswer, mode }) => {
  const parsed = typeof studentAnswer === 'object' && studentAnswer !== null ? studentAnswer : {};

  const zoneResults = config.zones.map(zone => {
    const studentVal = parsed[zone.id]?.value || '';
    const isCorrect = checkZoneCorrectness(zone, studentVal);
    return { zone, studentVal, isCorrect };
  });

  const correctCount = zoneResults.filter(r => r.isCorrect).length;
  const totalMarks = config.zones.reduce((s, z) => s + z.marks, 0);
  const earnedMarks = zoneResults.reduce((s, r) => s + (r.isCorrect ? r.zone.marks : 0), 0);

  return (
    <div className="space-y-3 border rounded-xl p-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image Fill Blanks</span>
        </div>
        <Badge variant={correctCount === config.zones.length ? 'default' : 'secondary'} className="text-xs">
          Auto: {correctCount}/{config.zones.length} correct · {earnedMarks}/{totalMarks} marks
        </Badge>
      </div>

      {/* Visual overlay — student answers */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Student attempt */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Student Attempt</p>
          <div className="relative rounded-lg overflow-hidden border bg-muted/10">
            {config.imageUrl ? (
              <img src={config.imageUrl} alt="Question" className="w-full object-contain max-h-[420px]" />
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No image</div>
            )}
            {config.zones.map((zone, idx) => {
              const result = zoneResults[idx];
              return (
                <div
                  key={zone.id}
                  className={cn(
                    "absolute border rounded flex items-center justify-center text-xs font-medium",
                    result.isCorrect
                      ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                      : "border-red-500 bg-red-500/15 text-red-700 dark:text-red-400"
                  )}
                  style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
                >
                  <span className="truncate px-1">{result.studentVal || '—'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Correct answers */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Correct Answers</p>
          <div className="relative rounded-lg overflow-hidden border bg-muted/10">
            {config.imageUrl ? (
              <img src={config.imageUrl} alt="Question" className="w-full object-contain max-h-[420px]" />
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No image</div>
            )}
            {config.zones.map(zone => (
              <div
                key={zone.id}
                className="absolute border border-green-500 bg-green-500/15 rounded flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-400"
                style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
              >
                <span className="truncate px-1">{zone.expectedAnswers[0]?.value || '?'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone-by-zone table */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Zone-by-zone review</p>
        <div className="grid gap-1.5">
          {zoneResults.map(({ zone, studentVal, isCorrect }, idx) => (
            <div
              key={zone.id}
              className={cn(
                "grid grid-cols-[40px_1fr_1fr_60px] items-center gap-2 rounded-lg border p-2.5 text-sm",
                isCorrect
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              )}
            >
              <div className="flex items-center gap-1">
                {isCorrect ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span className="text-xs font-medium">{idx + 1}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Student: </span>
                <span className="font-medium">{studentVal || '(empty)'}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Expected: </span>
                <span className="font-medium">{zone.expectedAnswers.map(a => a.value).join(' / ')}</span>
              </div>
              <Badge variant="outline" className="text-[10px] justify-center">
                {isCorrect ? zone.marks : 0}/{zone.marks}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageFillBlanksReview;
