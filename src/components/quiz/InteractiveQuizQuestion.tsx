import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  ZoomIn,
  Lightbulb,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface QuestionOption {
  text: string;
  imageUrl?: string;
  isLatex?: boolean;
}

interface InteractiveQuestion {
  id: number;
  question: string;
  questionImageUrl?: string;
  graphImageUrl?: string;
  diagramType?: 'graph' | 'venn' | 'geometry' | 'coordinate' | 'chart' | 'other';
  options: QuestionOption[] | string[];
  correctAnswer: number;
  explanation?: string;
  hints?: string[];
  commandTerm?: string;
  optionFeedback?: {
    [key: number]: {
      type: 'correct' | 'calculation-error' | 'interpretation-error' | 'carelessness' | 'concept-error';
      message: string;
    };
  };
}

interface InteractiveQuizQuestionProps {
  question: InteractiveQuestion;
  selectedAnswer?: number;
  onAnswerSelect: (answerIndex: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  showFeedback?: boolean;
}

const InteractiveQuizQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  onNext,
  onPrevious,
  isFirstQuestion,
  isLastQuestion,
  showFeedback = false
}: InteractiveQuizQuestionProps) => {
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState<string | null>(null);

  // Render LaTeX content
  const renderLatex = (text: string) => {
    if (!text) return '';
    try {
      // Check if text contains LaTeX delimiters
      const hasLatex = /\$.*?\$/.test(text) || /\\[a-zA-Z]+/.test(text);
      if (!hasLatex) return text;

      // Replace inline math $...$ with rendered HTML
      return text.replace(/\$([^$]+)\$/g, (match, latex) => {
        try {
          return katex.renderToString(latex, { throwOnError: false, displayMode: false });
        } catch {
          return match;
        }
      });
    } catch {
      return text;
    }
  };

  const getDiagramBadge = (type?: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      graph: { label: '📈 Graph', color: 'bg-blue-500' },
      venn: { label: '⭕ Venn Diagram', color: 'bg-purple-500' },
      geometry: { label: '📐 Geometry', color: 'bg-green-500' },
      coordinate: { label: '📊 Coordinate Plane', color: 'bg-amber-500' },
      chart: { label: '📉 Chart', color: 'bg-teal-500' },
      other: { label: '🖼️ Diagram', color: 'bg-gray-500' }
    };
    return badges[type || 'other'] || badges.other;
  };

  const getCommandTermBadge = (term?: string) => {
    if (!term) return null;
    const termLower = term.toLowerCase();
    const colors: Record<string, string> = {
      calculate: 'bg-blue-500',
      determine: 'bg-purple-500',
      show: 'bg-green-500',
      explain: 'bg-amber-500',
      describe: 'bg-teal-500',
      identify: 'bg-pink-500',
      state: 'bg-indigo-500'
    };
    const color = Object.entries(colors).find(([key]) => termLower.includes(key))?.[1] || 'bg-gray-500';
    return { label: term, color };
  };

  const getFeedbackStyle = (type: string) => {
    switch (type) {
      case 'correct':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300';
      case 'calculation-error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300';
      case 'interpretation-error':
        return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300';
      case 'carelessness':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300';
      case 'concept-error':
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const hasImages = question.questionImageUrl || question.graphImageUrl;
  const commandTermBadge = getCommandTermBadge(question.commandTerm);
  const diagramBadge = question.diagramType ? getDiagramBadge(question.diagramType) : null;

  // Normalize options to QuestionOption format
  const normalizedOptions: QuestionOption[] = question.options.map(opt => 
    typeof opt === 'string' ? { text: opt } : opt
  );

  const showNextHint = () => {
    if (question.hints && currentHintIndex < question.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="space-y-3">
            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              {commandTermBadge && (
                <Badge className={cn('text-white text-xs', commandTermBadge.color)}>
                  <Calculator className="w-3 h-3 mr-1" />
                  {commandTermBadge.label}
                </Badge>
              )}
              {diagramBadge && (
                <Badge className={cn('text-white text-xs', diagramBadge.color)}>
                  {diagramBadge.label}
                </Badge>
              )}
              {hasImages && (
                <Badge variant="secondary" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Reference Image
                </Badge>
              )}
            </div>

            {/* Question Text */}
            <CardTitle 
              className="text-xl leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderLatex(question.question) }}
            />

            {/* Question Image / Graph */}
            {(question.questionImageUrl || question.graphImageUrl) && (
              <motion.div 
                className="mt-4 relative group"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img
                    src={question.questionImageUrl || question.graphImageUrl}
                    alt="Question diagram"
                    className="w-full max-h-80 object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => setImageZoom(question.questionImageUrl || question.graphImageUrl || null)}
                  />
                  <button
                    onClick={() => setImageZoom(question.questionImageUrl || question.graphImageUrl || null)}
                    className="absolute top-2 right-2 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Options */}
            <div className="space-y-3">
              {normalizedOptions.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = showFeedback && index === question.correctAnswer;
                const isWrong = showFeedback && isSelected && index !== question.correctAnswer;
                const feedback = question.optionFeedback?.[index];

                return (
                  <motion.button
                    key={index}
                    onClick={() => onAnswerSelect(index)}
                    className={cn(
                      "w-full p-4 text-left rounded-lg border transition-all duration-200",
                      "hover:shadow-md",
                      isSelected && !showFeedback && "border-primary bg-primary/10 ring-2 ring-primary/20",
                      !isSelected && !showFeedback && "border-border hover:border-muted-foreground hover:bg-muted/50",
                      isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                      isWrong && "border-red-500 bg-red-50 dark:bg-red-900/20"
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      
                      <div className="flex-1">
                        {option.imageUrl ? (
                          <div className="space-y-2">
                            <img 
                              src={option.imageUrl} 
                              alt={`Option ${String.fromCharCode(65 + index)}`}
                              className="max-h-32 rounded-md border"
                            />
                            {option.text && (
                              <span 
                                dangerouslySetInnerHTML={{ __html: renderLatex(option.text) }}
                              />
                            )}
                          </div>
                        ) : (
                          <span 
                            className="text-base"
                            dangerouslySetInnerHTML={{ __html: renderLatex(option.text) }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Feedback for wrong answers */}
                    {showFeedback && isSelected && feedback && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={cn(
                          "mt-3 p-3 rounded-md border text-sm",
                          getFeedbackStyle(feedback.type)
                        )}
                      >
                        {feedback.message}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Hints Section */}
            {question.hints && question.hints.length > 0 && (
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-amber-600 hover:text-amber-700"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showHint ? 'Hide Hint' : 'Need a Hint?'}
                </Button>

                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <p className="text-amber-800 dark:text-amber-200 text-sm">
                        💡 {question.hints[currentHintIndex]}
                      </p>
                      {question.hints.length > 1 && currentHintIndex < question.hints.length - 1 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={showNextHint}
                          className="mt-2 p-0 h-auto text-amber-600"
                        >
                          Show another hint ({currentHintIndex + 1}/{question.hints.length})
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Explanation after feedback */}
            {showFeedback && question.explanation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Explanation</h4>
                <p 
                  className="text-blue-700 dark:text-blue-300 text-sm"
                  dangerouslySetInnerHTML={{ __html: renderLatex(question.explanation) }}
                />
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={isFirstQuestion}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={onNext}
                disabled={selectedAnswer === undefined}
                className="min-w-32"
              >
                {isLastQuestion ? 'Submit Quiz' : 'Next'}
                {!isLastQuestion && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {imageZoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setImageZoom(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={imageZoom}
              alt="Zoomed diagram"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setImageZoom(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InteractiveQuizQuestion;
