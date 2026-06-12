import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ChevronLeft, ChevronRight, Check, Menu, Undo2, Redo2, Copy, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

// Interactive Components
import InteractiveGraphCanvas from '@/components/answer-types/graph-plot/InteractiveGraphCanvas';
import DragDropMatcher from '@/components/answer-types/drag-drop/DragDropMatcher';
import ImageDropZone from '@/components/answer-types/image-drop/ImageDropZone';
import StepBuilder from '@/components/answer-types/arrange-order/StepBuilder';
import SmartMathInput from '@/components/answer-types/smart-math/SmartMathInput';
import EquationEditor from '@/components/admin/EquationEditor';

import type { 
  InteractiveQuestion, 
  GraphInteractionData,
  DragDropMatchData,
  ImageDropZoneData,
  StepBuilderData,
  MathInputData
} from '@/data/mocktest2';

interface InteractiveExamQuestionProps {
  question: InteractiveQuestion;
  onAnswerChange: (questionId: string, answer: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  currentAnswer?: any;
}

const questionTypeBadges: Record<string, { label: string; color: string }> = {
  graph_interaction: { label: 'Graph', color: 'bg-blue-500 text-white' },
  drag_drop_match: { label: 'Drag & Drop', color: 'bg-purple-500 text-white' },
  image_drop_zone: { label: 'Image Drop', color: 'bg-amber-500 text-white' },
  step_builder: { label: 'Arrange', color: 'bg-teal-500 text-white' },
  math_input: { label: 'Calculate', color: 'bg-pink-500 text-white' },
  text_input: { label: 'Text', color: 'bg-gray-500 text-white' }
};

const commandTermBadges: Record<string, string> = {
  'Plot': 'bg-blue-100 text-blue-700',
  'Match': 'bg-purple-100 text-purple-700',
  'Drag': 'bg-amber-100 text-amber-700',
  'Arrange': 'bg-teal-100 text-teal-700',
  'Calculate': 'bg-pink-100 text-pink-700',
  'Solve': 'bg-green-100 text-green-700'
};

const InteractiveExamQuestion = ({
  question,
  onAnswerChange,
  onNext,
  onPrevious,
  isFirstQuestion,
  isLastQuestion,
  currentAnswer
}: InteractiveExamQuestionProps) => {
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setShowHint(false);
    setHintIndex(0);
    setShowMathEditor(false);
  }, [question.id]);

  const mathTemplates = [
    { label: 'Fraction', symbol: '⁄' },
    { label: 'Power', symbol: 'xⁿ' },
    { label: 'Subscript', symbol: 'x₁' },
    { label: 'Square Root', symbol: '√' },
    { label: 'Nth Root', symbol: 'ⁿ√' },
    { label: 'Sum', symbol: '∑' },
    { label: 'Integral', symbol: '∫' },
    { label: 'Limit', symbol: 'lim' },
  ];

  const mathSymbols = ['α', 'β', 'γ', 'π', '∞', '∂', '∇', '≤', '≥', '≠', '±', '÷', '×', '·'];

  const renderLatexContent = (text: string) => {
    const parts = text.split(/(\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const equation = part.slice(1, -1);
        try {
          const html = katex.renderToString(equation, {
            displayMode: false,
            throwOnError: false,
            strict: false
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (error) {
          return <span key={index} className="text-destructive">{equation}</span>;
        }
      }
      // Handle line breaks and formatting
      return part.split('\n').map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line.startsWith('**') && line.endsWith('**') 
            ? <strong>{line.slice(2, -2)}</strong> 
            : line}
        </span>
      ));
    });
  };

  const detectCommandTerm = (text: string): string | null => {
    const terms = ['Plot', 'Match', 'Drag', 'Arrange', 'Calculate', 'Solve', 'Draw', 'Show'];
    for (const term of terms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        return term;
      }
    }
    return null;
  };

  const commandTerm = detectCommandTerm(question.text);
  const typeBadge = questionTypeBadges[question.questionType];

  const handleHintClick = () => {
    if (!showHint) {
      setShowHint(true);
    } else if (question.hints && hintIndex < question.hints.length - 1) {
      setHintIndex(prev => prev + 1);
    }
  };

  const renderInteractiveComponent = () => {
    switch (question.questionType) {
      case 'graph_interaction':
        const graphData = question.interactionData as GraphInteractionData;
        return (
          <Card className="border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Badge className="bg-blue-500 text-white">Graph Tools</Badge>
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <InteractiveGraphCanvas 
                showGrid={true}
                allowDrawing={true}
                onPointsChange={(points) => onAnswerChange(question.id, { points })}
                onLinesChange={(lines) => onAnswerChange(question.id, { lines })}
              />
              {graphData?.equation && (
                <div className="mt-3 p-2 bg-background rounded-lg text-sm">
                  <span className="text-muted-foreground">Equation: </span>
                  <span className="font-mono">{renderLatexContent(`$${graphData.equation}$`)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'drag_drop_match':
        const ddData = question.interactionData as DragDropMatchData;
        return (
          <DragDropMatcher
            items={ddData.items}
            targets={ddData.targets}
            onMatchesChange={(matches) => onAnswerChange(question.id, matches)}
            showFeedback={false}
          />
        );

      case 'image_drop_zone':
        const imgData = question.interactionData as ImageDropZoneData;
        return (
          <ImageDropZone
            dropZones={imgData.dropZones}
            draggableLabels={imgData.draggableLabels}
            onPlacementsChange={(placements) => onAnswerChange(question.id, placements)}
            showFeedback={false}
          />
        );

      case 'step_builder':
        const stepData = question.interactionData as StepBuilderData;
        return (
          <StepBuilder
            steps={stepData.steps}
            onOrderChange={(order) => onAnswerChange(question.id, order)}
            showFeedback={false}
          />
        );

      case 'math_input':
        const mathData = question.interactionData as MathInputData;
        return (
          <div className="space-y-4">
            <Card className="border-2 border-pink-200 bg-pink-50/30 dark:bg-pink-950/20">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Badge className="bg-pink-500 text-white">Math Tools</Badge>
                </h3>
              </CardHeader>
              <CardContent>
                <SmartMathInput
                  expectedAnswer={mathData.expectedAnswer}
                  acceptedFormats={mathData.acceptedFormats}
                  hint={mathData.hint}
                  onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
                  showFeedback={false}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 'text_input':
      default:
        return (
          <Card className="border-2 border-muted bg-card">
            <CardHeader className="pb-2">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Badge variant="secondary">Text Response</Badge>
              </h3>
            </CardHeader>
            <CardContent>
              <EquationEditor
                value={currentAnswer || ''}
                onChange={(val) => onAnswerChange(question.id, val)}
                placeholder="Type your answer here. Use math templates for equations..."
              />
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <motion.div 
      className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Math Editor Toggle Button */}
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMathEditor(!showMathEditor)}
            className="gap-2"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Collapsible Math Editor */}
        <AnimatePresence>
          {showMathEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Word-like Math Editor
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Undo2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Redo2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => setShowMathEditor(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Math Templates */}
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Math Templates</h4>
                    <div className="flex flex-wrap gap-2">
                      {mathTemplates.map((template) => (
                        <Button
                          key={template.label}
                          variant="outline"
                          size="sm"
                          className="text-sm font-normal"
                        >
                          {template.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Editable Area */}
                  <div 
                    contentEditable
                    className="min-h-[100px] p-3 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    data-placeholder="Type your equation here..."
                  />

                  {/* Symbols */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Symbols</h4>
                    <div className="flex flex-wrap gap-1">
                      {mathSymbols.map((symbol) => (
                        <Button
                          key={symbol}
                          variant="outline"
                          size="sm"
                          className="w-9 h-9 text-lg font-normal p-0"
                        >
                          {symbol}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 text-sm">
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" className="text-sm">
                        LaTeX
                      </Button>
                      <Button variant="outline" size="sm" className="text-sm">
                        Unicode
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 text-sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="w-3 h-3" />
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                  </div>

                  {/* Tip */}
                  <p className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    ✨ Copy equations from Word or type directly. Fractions, powers, roots work visually.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Card */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="bg-white dark:bg-card pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Question Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-foreground">
                      Question {question.questionNumber}
                    </span>
                    <span className="text-muted-foreground">
                      ({question.marks} marks)
                    </span>
                    <Badge className={cn(typeBadge.color, "text-xs")}>
                      {typeBadge.label}
                    </Badge>
                    {commandTerm && (
                      <Badge variant="outline" className={cn(commandTermBadges[commandTerm] || 'bg-gray-100')}>
                        {commandTerm}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Question Text */}
                  <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                    {renderLatexContent(question.text)}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Interactive Component */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {renderInteractiveComponent()}
        </motion.div>

        {/* Hint Section */}
        <AnimatePresence>
          {question.hints && question.hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleHintClick}
                className="gap-2"
              >
                <Lightbulb className={cn(
                  "w-4 h-4",
                  showHint && "text-amber-500 fill-amber-500"
                )} />
                {showHint ? `Hint ${hintIndex + 1}/${question.hints.length}` : 'Need a Hint?'}
              </Button>

              {showHint && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                            Helpful Hint
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300 text-sm">
                            {question.hints[hintIndex]}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Word Count (for display) */}
        <div className="text-xs text-muted-foreground">
          Words count: 0
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-border bg-white dark:bg-card p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check className="w-3 h-3" />
            Auto-saved
          </div>

          <Button
            onClick={onNext}
            className="gap-2 bg-gradient-to-r from-[#1e88e5] to-[#42a5f5] text-white hover:opacity-90"
          >
            {isLastQuestion ? 'Submit Test' : 'Next Question'}
            {!isLastQuestion && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default InteractiveExamQuestion;
