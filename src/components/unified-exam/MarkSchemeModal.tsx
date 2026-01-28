import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen,
  Target,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MarkSchemeData, MarkingCriterion } from '@/types/examMode';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  markScheme: MarkSchemeData | null;
  questionNumber?: number;
  subQuestionLabel?: string;
  answerKey?: string;
  commandTerm?: string;
}

const CATEGORY_CONFIG: Record<MarkingCriterion['category'], { label: string; color: string }> = {
  method: { label: 'Method', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  accuracy: { label: 'Accuracy', color: 'bg-green-100 text-green-700 border-green-200' },
  reasoning: { label: 'Reasoning', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  communication: { label: 'Communication', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const MarkSchemeModal: React.FC<MarkSchemeModalProps> = ({
  isOpen,
  onClose,
  markScheme,
  questionNumber,
  subQuestionLabel,
  answerKey,
  commandTerm,
}) => {
  // Render content with LaTeX support
  const renderContent = (text: string) => {
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

  // Use answerKey as model answer if no markScheme provided
  const modelAnswer = markScheme?.modelAnswer || answerKey;
  const criteria = markScheme?.markingCriteria || [];
  const totalMarks = markScheme?.totalMarks || criteria.reduce((sum, c) => sum + c.marks, 0);
  const commonMistakes = markScheme?.commonMistakes || [];
  const commandTermRequirements = markScheme?.commandTermRequirements || 
    (commandTerm ? `This question uses the command term "${commandTerm}". Make sure your answer addresses what this term requires.` : '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-lg">Mark Scheme</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Question {questionNumber}{subQuestionLabel && ` (${subQuestionLabel})`}
                  {totalMarks > 0 && ` • ${totalMarks} marks`}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Command Term Requirements */}
            {commandTermRequirements && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600" />
                  <h4 className="font-medium text-sm">Command Term</h4>
                  {commandTerm && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {commandTerm}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {commandTermRequirements}
                </p>
              </div>
            )}

            <Separator />

            {/* Model Answer */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Model Answer
              </h4>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                {modelAnswer ? (
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    {renderContent(modelAnswer)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Model answer not available for this question.
                  </p>
                )}
              </div>
            </div>

            {/* Marking Criteria */}
            {criteria.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Marking Criteria</h4>
                  <div className="space-y-2">
                    {criteria.map((criterion, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <Badge 
                          variant="outline" 
                          className={CATEGORY_CONFIG[criterion.category]?.color || 'bg-gray-100'}
                        >
                          {CATEGORY_CONFIG[criterion.category]?.label || criterion.category}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{criterion.description}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {criterion.marks} {criterion.marks === 1 ? 'mark' : 'marks'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Common Mistakes */}
            {commonMistakes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Common Mistakes to Avoid
                  </h4>
                  <ul className="space-y-2">
                    {commonMistakes.map((mistake, idx) => (
                      <li 
                        key={idx}
                        className="flex items-start gap-2 text-sm p-2 bg-amber-50 dark:bg-amber-950/30 rounded"
                      >
                        <span className="text-amber-600 shrink-0">•</span>
                        <span className="text-amber-900 dark:text-amber-200">
                          {renderContent(mistake)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <Button className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarkSchemeModal;
