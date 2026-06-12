import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Eye, Flag, ChevronRight, Lightbulb, ThumbsUp, ArrowRight, ZoomIn, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EquationEditor from '@/components/admin/EquationEditor';
import InteractiveGraphCanvas from '@/components/answer-types/graph-plot/InteractiveGraphCanvas';
import MathKeyboard from './MathKeyboard';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Question } from '@/pages/MockExamStart';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MockExamQuestionProps {
  question: Question;
  questionNumber: number;
  subQuestionIndex: number | null;
  answer: string;
  onAnswerChange: (questionId: string, content: string, subQuestionId?: string) => void;
  onNext?: () => void;
  isLastQuestion?: boolean;
  focusMode?: boolean;
  onFlag?: (questionId: string) => void;
  isFlagged?: boolean;
}

const MockExamQuestion = ({
  question,
  questionNumber,
  subQuestionIndex,
  answer,
  onAnswerChange,
  onNext,
  isLastQuestion,
  focusMode = false,
  onFlag,
  isFlagged = false
}: MockExamQuestionProps) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showMathKeyboard, setShowMathKeyboard] = useState(false);
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high' | null>(null);

  useEffect(() => {
    setCurrentAnswer(answer);
    setShowHint(false);
    setConfidence(null);
  }, [answer, question.id, subQuestionIndex]);

  const handleAnswerChange = (content: string) => {
    setCurrentAnswer(content);
    const subQuestionId = subQuestionIndex !== null 
      ? question.subQuestions?.[subQuestionIndex]?.id 
      : undefined;
    onAnswerChange(question.id, content, subQuestionId);
  };

  const saveDraft = () => {
    console.log('Draft saved');
    if (onNext) {
      onNext();
    }
  };

  const renderLatexContent = (text: string) => {
    const hasLatex = /\\[a-zA-Z]+/.test(text);
    
    if (hasLatex) {
      try {
        const html = katex.renderToString(text, {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (error) {
        console.error('LaTeX rendering error:', error);
        return <span className="text-destructive">LaTeX Error: {text}</span>;
      }
    } else {
      const parts = text.split(/(\$[^$]+\$)/g);
      
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const equation = part.slice(1, -1);
          try {
            const html = katex.renderToString(equation, {
              displayMode: false,
              throwOnError: false,
              errorColor: '#cc0000',
              strict: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (error) {
            return <span key={index} className="text-destructive">Error: {equation}</span>;
          }
        } else {
          return <span key={index}>{part}</span>;
        }
      });
    }
  };

  const wordCount = currentAnswer.trim().split(/\s+/).filter(word => word.length > 0).length;

  const displayQuestion = subQuestionIndex !== null 
    ? question.subQuestions?.[subQuestionIndex] 
    : question;

  if (!displayQuestion) return null;

  // Hints based on question type (simplified for demo)
  const hints = [
    "Think about the relationship between variables",
    "Consider drawing a diagram first",
    "Check your units carefully"
  ];

  return (
    <motion.div 
      className={cn(
        "flex-1 flex flex-col",
        focusMode && "max-w-4xl mx-auto"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Question Card with floating effect */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden border-2 border-border/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Question badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Question {questionNumber}
                      {subQuestionIndex !== null && ` (${String.fromCharCode(97 + subQuestionIndex)})`}
                    </Badge>
                    <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
                      {displayQuestion.marks} marks
                    </Badge>
                    {isFlagged && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <Flag className="w-3 h-3 mr-1" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                  
                  {/* Question text */}
                  <div className="text-lg font-medium text-foreground leading-relaxed">
                    {subQuestionIndex !== null ? (
                      <div className="space-y-2">
                        <div className="text-muted-foreground text-base">
                          {renderLatexContent(question.text)}
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-primary">
                            ({String.fromCharCode(97 + subQuestionIndex)})
                          </span>
                          <span>{renderLatexContent(displayQuestion.text)}</span>
                        </div>
                      </div>
                    ) : (
                      <div>{renderLatexContent(displayQuestion.text)}</div>
                    )}
                  </div>
                </div>

                {/* Flag button */}
                {onFlag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFlag(question.id)}
                    className={cn(
                      "flex-shrink-0",
                      isFlagged && "text-amber-500 hover:text-amber-600"
                    )}
                  >
                    <Flag className={cn("w-4 h-4", isFlagged && "fill-current")} />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-4 space-y-4">
              {/* Passage if exists */}
              {question.passage && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-primary/5 rounded-xl border-l-4 border-primary"
                >
                  <h4 className="font-medium text-primary mb-2">Reference Passage:</h4>
                  <p className="text-foreground/80 leading-relaxed">{question.passage}</p>
                </motion.div>
              )}

              {/* Image with zoom */}
              {question.image && (
                <Dialog>
                  <DialogTrigger asChild>
                    <motion.div 
                      className="relative group cursor-zoom-in"
                      whileHover={{ scale: 1.01 }}
                    >
                      <img 
                        src={question.image} 
                        alt="Question illustration" 
                        className="max-w-full max-h-[300px] object-contain rounded-xl shadow-md mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm">
                          <ZoomIn className="w-4 h-4" />
                          Click to enlarge
                        </div>
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    <img 
                      src={question.image} 
                      alt="Question illustration" 
                      className="w-full h-auto"
                    />
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Interactive Tools Section */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showGraph ? "default" : "outline"}
            size="sm"
            onClick={() => setShowGraph(!showGraph)}
            className="gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 6-6" />
            </svg>
            {showGraph ? 'Hide Graph' : 'Show Graph Tool'}
          </Button>

          <Button
            variant={showMathKeyboard ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMathKeyboard(!showMathKeyboard)}
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            {showMathKeyboard ? 'Hide Math Keyboard' : 'Math Keyboard'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHint(!showHint)}
            className="gap-2"
          >
            <Lightbulb className={cn("w-4 h-4", showHint && "text-amber-500 fill-amber-500")} />
            {showHint ? 'Hide Hint' : 'Need a Hint?'}
          </Button>
        </div>

        {/* Hint Section */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">Helpful Hint</h4>
                      <p className="text-amber-700 dark:text-amber-300 text-sm">
                        {hints[Math.floor(Math.random() * hints.length)]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Graph Canvas */}
        <AnimatePresence>
          {showGraph && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="font-medium text-foreground">Interactive Graph</h3>
                  <p className="text-sm text-muted-foreground">Plot points, draw lines, or sketch your solution</p>
                </CardHeader>
                <CardContent>
                  <InteractiveGraphCanvas 
                    showGrid={true}
                    allowDrawing={true}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Math Keyboard Section */}
        <AnimatePresence>
          {showMathKeyboard && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Smart Math Keyboard
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use fractions, roots, powers, and symbols for your mathematical answers
                  </p>
                </CardHeader>
                <CardContent>
                  <MathKeyboard
                    value={currentAnswer}
                    onChange={handleAnswerChange}
                    placeholder="Enter your mathematical expression..."
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Answer Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Your Answer</h3>
              <div className="flex items-center gap-2">
                {/* Confidence selector */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground mr-1">Confidence:</span>
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <Button
                      key={level}
                      variant={confidence === level ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        "h-6 px-2 text-xs",
                        confidence === level && level === 'high' && "bg-green-500 hover:bg-green-600",
                        confidence === level && level === 'medium' && "bg-amber-500 hover:bg-amber-600",
                        confidence === level && level === 'low' && "bg-red-500 hover:bg-red-600"
                      )}
                      onClick={() => setConfidence(level)}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Math-enabled Answer Editor */}
            <div className="space-y-2">
              <EquationEditor
                value={currentAnswer}
                onChange={handleAnswerChange}
                placeholder="Type your answer here... Use math notation, fractions, symbols, and equations directly."
                className="min-h-[200px]"
              />
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Words: {currentAnswer ? wordCount : 0}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1 h-8"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showPreview ? 'Hide Preview' : 'Preview'}
                  </Button>
                </div>
              </div>
            </div>

            {/* LaTeX Preview */}
            <AnimatePresence>
              {showPreview && currentAnswer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-4 bg-muted/50 rounded-lg border overflow-hidden"
                >
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Formatted Preview:</h4>
                  <div className="text-base leading-relaxed text-foreground">
                    {renderLatexContent(currentAnswer)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-save indicator */}
            <motion.div 
              className="text-xs text-green-600 flex items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Check className="w-3 h-3" />
              Auto-saved
            </motion.div>

            {/* Navigation Buttons */}
            {onNext && (
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button 
                  variant="outline"
                  onClick={saveDraft}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save & Continue
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={onNext}
                    size="lg"
                    className={cn(
                      "gap-2",
                      isLastQuestion 
                        ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" 
                        : "bg-gradient-to-r from-primary to-primary/80"
                    )}
                  >
                    {isLastQuestion ? (
                      <>
                        Review & Submit
                        <ThumbsUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Next Question
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default MockExamQuestion;
