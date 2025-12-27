import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Lightbulb, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface SmartMathInputProps {
  expectedAnswer: string;
  acceptedFormats?: string[];
  hint?: string;
  onAnswerChange?: (answer: string) => void;
  showFeedback?: boolean;
}

const SmartMathInput: React.FC<SmartMathInputProps> = ({
  expectedAnswer,
  acceptedFormats = [],
  hint,
  onAnswerChange,
  showFeedback = false
}) => {
  const [numerator, setNumerator] = useState('');
  const [denominator, setDenominator] = useState('');
  const [inputMode, setInputMode] = useState<'fraction' | 'decimal' | 'percentage'>('fraction');

  const getFractionAnswer = () => {
    if (inputMode === 'fraction' && numerator && denominator) {
      return `${numerator}/${denominator}`;
    }
    return numerator || '';
  };

  useEffect(() => {
    const answer = getFractionAnswer();
    onAnswerChange?.(answer);
  }, [numerator, denominator, inputMode]);

  const handleReset = () => {
    setNumerator('');
    setDenominator('');
  };

  // Safe math expression parser - replaces unsafe eval()
  const safeParseMath = (expr: string): number | null => {
    // Only allow digits, operators, decimal points, and slashes (for fractions)
    const safePattern = /^[\d+\-*/().%\s]+$/;
    if (!safePattern.test(expr)) return null;
    
    try {
      // Handle percentage
      let normalized = expr.replace(/%/g, '/100');
      
      // Handle fractions like "2/5"
      const fractionMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (fractionMatch) {
        const num = parseFloat(fractionMatch[1]);
        const den = parseFloat(fractionMatch[2]);
        if (den === 0) return null;
        return num / den;
      }
      
      // Handle simple decimals
      const decimalMatch = normalized.match(/^-?\d+(?:\.\d+)?$/);
      if (decimalMatch) {
        return parseFloat(normalized);
      }
      
      // Handle expressions like "40/100" (percentage converted)
      const divisionMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (divisionMatch) {
        return parseFloat(divisionMatch[1]) / parseFloat(divisionMatch[2]);
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const isCorrect = () => {
    const answer = getFractionAnswer();
    const allAccepted = [expectedAnswer, ...acceptedFormats];
    
    // Normalize answers for comparison
    const normalizedAnswer = answer.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2').trim();
    
    return allAccepted.some(accepted => {
      const normalizedAccepted = accepted.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2').trim();
      
      // Direct match
      if (normalizedAnswer === normalizedAccepted) return true;
      
      // Numerical comparison using safe parser
      const answerNum = safeParseMath(normalizedAnswer);
      const acceptedNum = safeParseMath(normalizedAccepted);
      
      if (answerNum !== null && acceptedNum !== null) {
        return Math.abs(answerNum - acceptedNum) < 0.001;
      }
      
      return false;
    });
  };

  const renderLatex = (content: string) => {
    try {
      const latex = `\\frac{${numerator || '?'}}{${denominator || '?'}}`;
      const html = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span>{numerator || '?'}/{denominator || '?'}</span>;
    }
  };

  const correct = showFeedback && isCorrect();
  const incorrect = showFeedback && !isCorrect() && (numerator || denominator);

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2">
        <Button
          variant={inputMode === 'fraction' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('fraction')}
        >
          Fraction
        </Button>
        <Button
          variant={inputMode === 'decimal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('decimal')}
        >
          Decimal
        </Button>
        <Button
          variant={inputMode === 'percentage' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('percentage')}
        >
          Percentage
        </Button>
      </div>

      {/* Fraction Input */}
      {inputMode === 'fraction' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={cn(
            "overflow-hidden border-2",
            !showFeedback && "border-primary/30",
            correct && "border-green-500 bg-green-50 dark:bg-green-950/30",
            incorrect && "border-red-500 bg-red-50 dark:bg-red-950/30"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-8">
                {/* Fraction Input UI */}
                <div className="flex flex-col items-center gap-1">
                  {/* Numerator */}
                  <motion.input
                    type="number"
                    value={numerator}
                    onChange={(e) => setNumerator(e.target.value)}
                    placeholder="?"
                    className={cn(
                      "w-20 h-12 text-center text-2xl font-bold rounded-lg border-2 bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                      "transition-all",
                      !showFeedback && "border-primary/30",
                      correct && "border-green-500",
                      incorrect && "border-red-500"
                    )}
                    whileFocus={{ scale: 1.05 }}
                    disabled={showFeedback}
                  />
                  
                  {/* Fraction Line */}
                  <div className={cn(
                    "w-20 h-1 rounded-full",
                    !showFeedback && "bg-foreground",
                    correct && "bg-green-500",
                    incorrect && "bg-red-500"
                  )} />
                  
                  {/* Denominator */}
                  <motion.input
                    type="number"
                    value={denominator}
                    onChange={(e) => setDenominator(e.target.value)}
                    placeholder="?"
                    className={cn(
                      "w-20 h-12 text-center text-2xl font-bold rounded-lg border-2 bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                      "transition-all",
                      !showFeedback && "border-primary/30",
                      correct && "border-green-500",
                      incorrect && "border-red-500"
                    )}
                    whileFocus={{ scale: 1.05 }}
                    disabled={showFeedback}
                  />
                </div>

                {/* Preview */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preview</span>
                  <div className="text-3xl">
                    {renderLatex('')}
                  </div>
                </div>

                {/* Feedback Icon */}
                {showFeedback && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                  >
                    {correct ? (
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                        <X className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Reset Button */}
              {!showFeedback && (numerator || denominator) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-4"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Decimal/Percentage Input */}
      {(inputMode === 'decimal' || inputMode === 'percentage') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={cn(
            "overflow-hidden border-2",
            !showFeedback && "border-primary/30",
            correct && "border-green-500 bg-green-50 dark:bg-green-950/30",
            incorrect && "border-red-500 bg-red-50 dark:bg-red-950/30"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4">
                <motion.input
                  type="text"
                  value={numerator}
                  onChange={(e) => setNumerator(e.target.value)}
                  placeholder={inputMode === 'decimal' ? '0.0' : '0'}
                  className={cn(
                    "w-32 h-14 text-center text-3xl font-bold rounded-lg border-2 bg-background",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                    "transition-all",
                    !showFeedback && "border-primary/30",
                    correct && "border-green-500",
                    incorrect && "border-red-500"
                  )}
                  whileFocus={{ scale: 1.02 }}
                  disabled={showFeedback}
                />
                {inputMode === 'percentage' && (
                  <span className="text-3xl font-bold text-foreground">%</span>
                )}

                {showFeedback && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                  >
                    {correct ? (
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                        <X className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Hint */}
      {hint && !showFeedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
        >
          <Lightbulb className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{hint}</span>
        </motion.div>
      )}

      {/* Score Display */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-center p-4 rounded-xl",
            correct 
              ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30"
              : "bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-950/30 dark:to-pink-950/30"
          )}
        >
          <div className="text-lg font-bold text-foreground">
            {correct ? '✓ Correct!' : '✗ Not quite right'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {correct 
              ? `Perfect! ${expectedAnswer} is correct. There are 2 blue balls out of 5 total.`
              : `The correct answer is ${expectedAnswer}. Count the blue balls (numerator) and total balls (denominator).`}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Marks: {correct ? 2 : 0} / 2
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SmartMathInput;
