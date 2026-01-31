import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  ArrowLeft,
  BookOpen,
  Eye,
  Trophy
} from 'lucide-react';
import { UnifiedQuestion, UnifiedAnswer } from '@/types/answerBlock';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface PracticeResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: UnifiedQuestion[];
  answers: UnifiedAnswer[];
  onReTest: () => void;
  onBackToPractice: () => void;
}

// Helper to render LaTeX content
const renderLatexContent = (text: string): React.ReactNode => {
  if (!text) return null;

  const parts = text.split(/(\$[^$]+\$)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      try {
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(latex, { throwOnError: false })
            }}
          />
        );
      } catch {
        return <span key={index}>{part}</span>;
      }
    }
    return <span key={index}>{part}</span>;
  });
};

const PracticeResultsModal: React.FC<PracticeResultsModalProps> = ({
  isOpen,
  onClose,
  questions,
  answers,
  onReTest,
  onBackToPractice
}) => {
  // Calculate stats
  const getTotalSlots = () => {
    return questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        return total + q.subQuestions.length;
      }
      return total + 1;
    }, 0);
  };

  const getAnsweredCount = () => {
    return answers.filter(a => {
      const content = a.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (typeof content === 'object' && content !== null) return Object.keys(content).length > 0;
      return false;
    }).length;
  };

  const getAnswer = (questionId: string, subQuestionId?: string) => {
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
    return answer?.content || '';
  };

  const formatAnswer = (content: any): string => {
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content, null, 2);
    }
    return '';
  };

  const hasAnswer = (questionId: string, subQuestionId?: string) => {
    const content = getAnswer(questionId, subQuestionId);
    if (typeof content === 'string') return content.trim().length > 0;
    if (typeof content === 'object' && content !== null) return Object.keys(content).length > 0;
    return false;
  };

  const totalSlots = getTotalSlots();
  const answeredCount = getAnsweredCount();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-amber-500" />
            Practice Complete!
          </DialogTitle>
          <DialogDescription>
            Review your answers and compare with the correct solutions.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 py-4 shrink-0">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{answeredCount}</div>
                <div className="text-sm text-muted-foreground">of {totalSlots} answered</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round((answeredCount / totalSlots) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">completion rate</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Review */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {questions.map((question) => {
              const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;

              return (
                <Card key={question.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {question.questionNumber}
                          </span>
                        </div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {question.marks} marks
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm mt-2">
                      {renderLatexContent(question.questionText)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {hasSubQuestions ? (
                      question.subQuestions!.map((subQ) => {
                        const answered = hasAnswer(question.id, subQ.id);
                        const userAnswer = getAnswer(question.id, subQ.id);
                        const correctAnswer = subQ.answerKey;

                        return (
                          <div key={subQ.id} className="pl-4 border-l-2 border-muted space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                ({subQ.label})
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {subQ.marks} marks
                              </span>
                              {answered ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="text-sm">{renderLatexContent(subQ.text)}</div>
                            
                            {/* Your answer */}
                            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">Your Answer:</div>
                              <div className="text-sm">
                                {answered ? (
                                  renderLatexContent(formatAnswer(userAnswer))
                                ) : (
                                  <span className="text-muted-foreground italic">Not answered</span>
                                )}
                              </div>
                            </div>

                            {/* Correct answer */}
                            {correctAnswer && (
                              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-1 border border-green-200 dark:border-green-800">
                                <div className="text-xs font-medium text-green-700 dark:text-green-400">Correct Answer:</div>
                                <div className="text-sm text-green-800 dark:text-green-300">
                                  {renderLatexContent(correctAnswer)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {/* Single question answer */}
                        <div className="flex items-center gap-2 mb-2">
                          {hasAnswer(question.id) ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-green-600">Answered</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Not answered</span>
                            </>
                          )}
                        </div>

                        {/* Your answer */}
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Your Answer:</div>
                          <div className="text-sm">
                            {hasAnswer(question.id) ? (
                              renderLatexContent(formatAnswer(getAnswer(question.id)))
                            ) : (
                              <span className="text-muted-foreground italic">Not answered</span>
                            )}
                          </div>
                        </div>

                        {/* Correct answer */}
                        {question.answerKey && (
                          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-1 border border-green-200 dark:border-green-800">
                            <div className="text-xs font-medium text-green-700 dark:text-green-400">Correct Answer:</div>
                            <div className="text-sm text-green-800 dark:text-green-300">
                              {renderLatexContent(question.answerKey)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t shrink-0">
          <Button variant="outline" onClick={onBackToPractice} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Practice
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="gap-2">
              <Eye className="w-4 h-4" />
              Review Questions
            </Button>
            <Button onClick={onReTest} className="gap-2 bg-green-600 hover:bg-green-700">
              <RotateCcw className="w-4 h-4" />
              Re-Test
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PracticeResultsModal;
