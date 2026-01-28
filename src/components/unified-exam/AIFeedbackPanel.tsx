import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AIFeedbackResponse } from '@/types/examMode';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface AIFeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: AIFeedbackResponse | null;
  isLoading: boolean;
  onTryAgain?: () => void;
  questionNumber?: number;
  subQuestionLabel?: string;
}

const AIFeedbackPanel: React.FC<AIFeedbackPanelProps> = ({
  isOpen,
  onClose,
  feedback,
  isLoading,
  onTryAgain,
  questionNumber,
  subQuestionLabel,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Feedback</h3>
                  <p className="text-xs text-muted-foreground">
                    Question {questionNumber}{subQuestionLabel && ` (${subQuestionLabel})`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="h-[calc(100%-130px)]">
              <div className="p-6 space-y-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                    <p className="text-muted-foreground">Analyzing your answer...</p>
                  </div>
                ) : feedback ? (
                  <>
                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                      {feedback.isOnTrack ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 gap-1.5 py-1.5">
                          <CheckCircle className="w-4 h-4" />
                          On the Right Track
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 gap-1.5 py-1.5">
                          <AlertCircle className="w-4 h-4" />
                          Needs Improvement
                        </Badge>
                      )}
                      {feedback.partialScore !== undefined && (
                        <Badge variant="outline">
                          Partial: {Math.round(feedback.partialScore * 100)}%
                        </Badge>
                      )}
                    </div>

                    {/* Feedback */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Feedback
                      </h4>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm leading-relaxed">
                          {renderContent(feedback.feedback)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Hint */}
                    {feedback.hint && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          Hint
                        </h4>
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                            {renderContent(feedback.hint)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Missing Elements */}
                    {feedback.missingElements && feedback.missingElements.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Missing Elements
                        </h4>
                        <ul className="space-y-2">
                          {feedback.missingElements.map((element, idx) => (
                            <li 
                              key={idx}
                              className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded text-sm"
                            >
                              <span className="w-5 h-5 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-orange-900 dark:text-orange-200">
                                {renderContent(element)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No feedback available</p>
                    <p className="text-xs text-muted-foreground">
                      Try submitting your answer first
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
              <div className="flex items-center gap-3">
                {onTryAgain && (
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={onTryAgain}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Revise & Check Again
                  </Button>
                )}
                <Button 
                  className="flex-1"
                  onClick={onClose}
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIFeedbackPanel;
