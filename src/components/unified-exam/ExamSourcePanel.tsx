import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon, BarChart3 } from 'lucide-react';
import { UnifiedQuestion } from '@/types/answerBlock';
import { renderLatexContent } from '@/lib/renderLatex';
import { cn } from '@/lib/utils';

interface ExamSourcePanelProps {
  question: UnifiedQuestion | null;
  className?: string;
}

const ExamSourcePanel: React.FC<ExamSourcePanelProps> = ({ question, className }) => {
  if (!question) {
    return (
      <div className={cn("flex flex-col bg-card overflow-hidden", className)}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a question to view source material</p>
          </div>
        </div>
      </div>
    );
  }

  const hasImage = !!question.questionImageUrl;
  const hasDiagram = !!question.diagramDescription;
  const hasExtract = question.questionText && question.questionText.length > 200;
  const hasSourceContent = hasImage || hasDiagram || hasExtract;

  return (
    <div className={cn("flex flex-col bg-card overflow-hidden", className)}>
      {/* Source panel header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{question.questionNumber}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">Question {question.questionNumber}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
              </Badge>
              {question.commandTerm && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                  {question.commandTerm}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable source content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-4">
          {/* Question text / passage */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {hasExtract ? 'Extract / Passage' : 'Question'}
              </span>
            </div>
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed bg-muted/20 rounded-lg p-4 border">
              {renderLatexContent(question.questionText)}
            </div>
          </div>

          {/* Question image */}
          {hasImage && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Figure / Diagram
                </span>
              </div>
              <div className="rounded-lg border overflow-hidden bg-white">
                <img
                  src={question.questionImageUrl!}
                  alt={`Question ${question.questionNumber}`}
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          {/* Diagram description */}
          {hasDiagram && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Diagram
                </span>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border text-sm text-muted-foreground italic">
                📊 {question.diagramDescription}
              </div>
            </div>
          )}

          {/* Category info */}
          {question.category && (
            <div className="pt-2">
              <Badge variant="outline" className="text-xs">
                {question.category}
              </Badge>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ExamSourcePanel;