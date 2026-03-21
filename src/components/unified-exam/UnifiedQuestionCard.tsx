import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UnifiedQuestion, UnifiedAnswer, getDefaultAnswerBlockType, AnswerBlockType } from '@/types/answerBlock';
import AnswerBlock from './AnswerBlock';
import InteractiveAnswerBlock from './InteractiveAnswerBlock';
import { renderLatexContent } from '@/lib/renderLatex';

const UnifiedQuestionCard: React.FC<UnifiedQuestionCardProps> = ({
  question,
  answers,
  onAnswerChange,
  interactiveMode = true
}) => {
  const getAnswer = (questionId: string, subQuestionId?: string) => {
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
    return answer?.content || '';
  };

  const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;

  return (
    <motion.div
      id={`question-${question.id}`}
      data-question-id={question.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="scroll-mt-24"
    >
      <Card className="border-2 border-border/50 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-4">
          {/* Question header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {question.questionNumber}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-medium">
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </Badge>
                  {question.commandTerm && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {question.commandTerm}
                    </Badge>
                  )}
                  {question.category && (
                    <Badge variant="outline" className="text-xs">
                      {question.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question text */}
          <div className="mt-4 prose prose-sm max-w-none">
            <div className="text-foreground leading-relaxed">
              {renderLatexContent(question.questionText)}
            </div>
          </div>

          {/* Question image */}
          {question.questionImageUrl && (
            <div className="mt-4">
              <img
                src={question.questionImageUrl}
                alt={`Question ${question.questionNumber}`}
                className="max-w-full h-auto rounded-lg border shadow-sm"
              />
            </div>
          )}

          {/* Diagram description */}
          {question.diagramDescription && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground italic">
              📊 {question.diagramDescription}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {hasSubQuestions ? (
            // Render sub-questions
            <div className="space-y-6">
              {question.subQuestions!.map((subQ, idx) => (
                <div key={subQ.id} id={`question-${question.id}-${subQ.id}`} data-question-id={question.id} data-sub-question-id={subQ.id} className="scroll-mt-24">
                  <Separator className="mb-4" />
                  
                  {/* Sub-question header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-secondary-foreground">
                        {subQ.label}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {subQ.marks} {subQ.marks === 1 ? 'mark' : 'marks'}
                        </Badge>
                        {subQ.commandTerm && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                            {subQ.commandTerm}
                          </Badge>
                        )}
                      </div>
                      <div className="text-foreground">
                        {renderLatexContent(subQ.text)}
                      </div>
                    </div>
                  </div>

                  {/* Sub-question image */}
                  {subQ.imageUrl && (
                    <div className="mb-4 ml-11">
                      <img
                        src={subQ.imageUrl}
                        alt={`Question ${question.questionNumber}${subQ.label}`}
                        className="max-w-full h-auto rounded-lg border shadow-sm"
                      />
                    </div>
                  )}

                  {/* Answer block for sub-question */}
                  <div className="ml-11">
                    <InteractiveAnswerBlock
                      questionId={question.id}
                      subQuestionId={subQ.id}
                      detectedType={mapToAnswerBlockType(subQ.interactiveType) || subQ.answerBlockType}
                      config={subQ.answerBlockConfig}
                      value={getAnswer(question.id, subQ.id)}
                      onChange={(value) => onAnswerChange(question.id, value, subQ.id)}
                      wordLimit={subQ.wordLimit}
                      placeholder={`Enter your answer for part ${subQ.label}...`}
                      questionText={subQ.text}
                      allowTypeChange={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Render single answer block for main question
            <InteractiveAnswerBlock
              questionId={question.id}
              detectedType={mapToAnswerBlockType(question.interactiveType) || question.answerBlockType}
              config={question.answerBlockConfig}
              value={getAnswer(question.id)}
              onChange={(value) => onAnswerChange(question.id, value)}
              wordLimit={question.wordLimit}
              placeholder="Enter your answer here..."
              questionText={question.questionText}
              diagramDescription={question.diagramDescription}
              allowTypeChange={false}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UnifiedQuestionCard;
