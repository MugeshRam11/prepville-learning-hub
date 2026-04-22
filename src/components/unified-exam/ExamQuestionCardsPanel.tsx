import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UnifiedQuestion, UnifiedAnswer, AnswerBlockType } from '@/types/answerBlock';
import ExamSubQuestionCard from './ExamSubQuestionCard';
import InteractiveAnswerBlock from './InteractiveAnswerBlock';
import { renderFinalText as renderLatexContent } from '@/lib/renderFinalText';
import { cn } from '@/lib/utils';
import { mapToAnswerBlockType } from '@/lib/answerBlockTypeMap';

interface ExamQuestionCardsPanelProps {
  question: UnifiedQuestion | null;
  answers: UnifiedAnswer[];
  onAnswerChange: (questionId: string, value: any, subQuestionId?: string) => void;
  activeSubQuestionId: string | null;
  scrollRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

const ExamQuestionCardsPanel: React.FC<ExamQuestionCardsPanelProps> = ({
  question,
  answers,
  onAnswerChange,
  activeSubQuestionId,
  scrollRef,
  className,
}) => {
  if (!question) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Select a question to begin answering</p>
        </div>
      </div>
    );
  }

  const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
  const mainAnswerConfig = question.answerBlockConfig as unknown as Record<string, unknown> | undefined;
  const shouldRenderMainQuestionAnswerCard =
    !hasSubQuestions ||
    Boolean(
      mainAnswerConfig?.requiresMainAnswer ||
      mainAnswerConfig?.renderMainAnswerCard ||
      mainAnswerConfig?.mainQuestionAnswer
    );

  const getAnswer = (questionId: string, subQuestionId?: string) => {
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
    return answer?.content || '';
  };

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      {/* Panel header */}
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {hasSubQuestions
              ? `Question ${question.questionNumber} — Sub-parts`
              : `Question ${question.questionNumber} — Answer`
            }
          </h3>
          {hasSubQuestions && (
            <Badge variant="secondary" className="text-[10px]">
              {question.subQuestions!.length} parts
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        <div className="p-4 space-y-4 pb-32">
          {hasSubQuestions ? (
            <>
              {shouldRenderMainQuestionAnswerCard && (
                <div
                  id={`question-${question.id}`}
                  data-question-id={question.id}
                  className="scroll-mt-24"
                >
                  <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold">Main Question Answer</h4>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        [{question.marks}]
                      </Badge>
                    </div>

                    <div className="text-sm text-foreground leading-relaxed">
                      {renderLatexContent(question.questionText)}
                    </div>

                    <InteractiveAnswerBlock
                      questionId={question.id}
                      detectedType={
                        mapToAnswerBlockType(question.interactiveType) ||
                        (question.answerBlockType as AnswerBlockType)
                      }
                      config={question.answerBlockConfig}
                      value={getAnswer(question.id)}
                      onChange={(value) => onAnswerChange(question.id, value)}
                      wordLimit={question.wordLimit}
                      placeholder="Enter your main question answer here..."
                      questionText={question.questionText}
                      diagramDescription={question.diagramDescription}
                      allowTypeChange={false}
                    />
                  </div>
                </div>
              )}

              {question.subQuestions!.map((subQ) => (
                <ExamSubQuestionCard
                  key={subQ.id}
                  parentQuestion={question}
                  subQuestion={subQ}
                  answers={answers}
                  onAnswerChange={onAnswerChange}
                  isActive={activeSubQuestionId === subQ.id}
                />
              ))}
            </>
          ) : (
            /* Single question without sub-parts */
            <div
              id={`question-${question.id}`}
              data-question-id={question.id}
              className="scroll-mt-24"
            >
              <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Question {question.questionNumber}</h4>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    [{question.marks}]
                  </Badge>
                </div>

                {/* Show question text if not long enough for source panel */}
                {question.questionText && question.questionText.length <= 200 && (
                  <div className="text-sm text-foreground leading-relaxed">
                    {renderLatexContent(question.questionText)}
                  </div>
                )}

                <InteractiveAnswerBlock
                  questionId={question.id}
                  detectedType={
                    mapToAnswerBlockType(question.interactiveType) ||
                    (question.answerBlockType as AnswerBlockType)
                  }
                  config={question.answerBlockConfig}
                  value={getAnswer(question.id)}
                  onChange={(value) => onAnswerChange(question.id, value)}
                  wordLimit={question.wordLimit}
                  placeholder="Enter your answer here..."
                  questionText={question.questionText}
                  diagramDescription={question.diagramDescription}
                  allowTypeChange={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamQuestionCardsPanel;