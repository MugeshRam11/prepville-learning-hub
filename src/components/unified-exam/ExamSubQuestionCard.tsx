import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UnifiedQuestion, UnifiedAnswer, AnswerBlockType } from '@/types/answerBlock';
import InteractiveAnswerBlock from './InteractiveAnswerBlock';
import { renderLatexContent } from '@/lib/renderLatex';
import { cn } from '@/lib/utils';

function mapToAnswerBlockType(interactiveType?: string): AnswerBlockType | undefined {
  if (!interactiveType) return undefined;
  const typeMap: Record<string, AnswerBlockType> = {
    'graph_interaction': 'graph_plot',
    'graph_plot': 'graph_plot',
    'drag_drop_match': 'drag_drop',
    'drag_drop': 'drag_drop',
    'image_drop_zone': 'image_drop',
    'image_drop': 'image_drop',
    'step_builder': 'arrange_order',
    'arrange_order': 'arrange_order',
    'math_input': 'smart_math',
    'smart_math': 'smart_math',
    'text_input': 'text_equation',
    'text_equation': 'text_equation',
    'multiple_choice': 'multiple_choice',
    'image_fill_blanks': 'image_fill_blanks'
  };
  return typeMap[interactiveType] || 'text_equation';
}

interface SubQuestion {
  id: string;
  label: string;
  text: string;
  imageUrl?: string;
  marks: number;
  commandTerm?: string;
  wordLimit?: number;
  answerKey?: string;
  answerBlockType?: string;
  answerBlockConfig?: any;
  interactiveType?: string;
}

interface ExamSubQuestionCardProps {
  parentQuestion: UnifiedQuestion;
  subQuestion: SubQuestion;
  answers: UnifiedAnswer[];
  onAnswerChange: (questionId: string, value: any, subQuestionId?: string) => void;
  isActive?: boolean;
}

const ExamSubQuestionCard: React.FC<ExamSubQuestionCardProps> = ({
  parentQuestion,
  subQuestion,
  answers,
  onAnswerChange,
  isActive = false,
}) => {
  const getAnswer = (questionId: string, subQuestionId?: string) => {
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
    return answer?.content || '';
  };

  const isAnswered = !!getAnswer(parentQuestion.id, subQuestion.id);

  return (
    <motion.div
      id={`question-${parentQuestion.id}-${subQuestion.id}`}
      data-question-id={parentQuestion.id}
      data-sub-question-id={subQuestion.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="scroll-mt-24"
    >
      <Card className={cn(
        "border transition-all duration-200",
        isActive
          ? "border-primary/40 shadow-md ring-1 ring-primary/20"
          : "border-border/60 shadow-sm hover:shadow-md",
        isAnswered && !isActive && "border-green-200/60"
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Sub-question header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isAnswered
                    ? "bg-green-100 text-green-700"
                    : "bg-secondary text-secondary-foreground"
              )}>
                {subQuestion.label}
              </div>
              {subQuestion.commandTerm && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  {subQuestion.commandTerm}
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
              [{subQuestion.marks}]
            </Badge>
          </div>

          {/* Question text */}
          <div className="text-sm text-foreground leading-relaxed">
            {renderLatexContent(subQuestion.text)}
          </div>

          {/* Sub-question image */}
          {subQuestion.imageUrl && (
            <div className="rounded-lg border overflow-hidden">
              <img
                src={subQuestion.imageUrl}
                alt={`Q${parentQuestion.questionNumber}${subQuestion.label}`}
                className="max-w-full h-auto"
              />
            </div>
          )}

          {/* Answer area */}
          <div className="pt-1">
            <InteractiveAnswerBlock
              questionId={parentQuestion.id}
              subQuestionId={subQuestion.id}
              detectedType={mapToAnswerBlockType(subQuestion.interactiveType) || (subQuestion.answerBlockType as AnswerBlockType)}
              config={subQuestion.answerBlockConfig}
              value={getAnswer(parentQuestion.id, subQuestion.id)}
              onChange={(value) => onAnswerChange(parentQuestion.id, value, subQuestion.id)}
              wordLimit={subQuestion.wordLimit}
              placeholder={`Answer for part (${subQuestion.label})...`}
              questionText={subQuestion.text}
              allowTypeChange={false}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExamSubQuestionCard;