import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, ArrowRight, Check, Clock, Flag, Lightbulb, 
  Send, Home, RotateCcw, ChevronLeft, ChevronRight,
  Sparkles, Grid3X3, GripVertical, MousePointer, Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mocktest2, InteractiveQuestion } from '@/data/mocktest2';
import InteractiveGraphCanvas from '@/components/mock-exam/InteractiveGraphCanvas';
import DragDropMatcher from '@/components/mock-exam/DragDropMatcher';
import ImageDropZone from '@/components/mock-exam/ImageDropZone';
import StepBuilder from '@/components/mock-exam/StepBuilder';
import SmartMathInput from '@/components/mock-exam/SmartMathInput';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const InteractiveMockDemo = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const questions = mocktest2.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLatex = (text: string) => {
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const equation = part.slice(1, -1);
        try {
          const html = katex.renderToString(equation, {
            displayMode: false,
            throwOnError: false
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={index}>{equation}</span>;
        }
      }
      // Handle markdown bold
      if (part.includes('**')) {
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bp, i) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return <strong key={`${index}-${i}`}>{bp.slice(2, -2)}</strong>;
          }
          return <span key={`${index}-${i}`}>{bp}</span>;
        });
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleHint = (questionId: string) => {
    setShowHints(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    setShowFeedback(true);
  };

  const handleReset = () => {
    setAnswers({});
    setShowFeedback(false);
    setCurrentQuestionIndex(0);
    setTimeRemaining(20 * 60);
    setFlaggedQuestions(new Set());
    setShowHints({});
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'graph_interaction': return <Grid3X3 className="w-4 h-4" />;
      case 'drag_drop_match': return <GripVertical className="w-4 h-4" />;
      case 'image_drop_zone': return <MousePointer className="w-4 h-4" />;
      case 'step_builder': return <GripVertical className="w-4 h-4" />;
      case 'math_input': return <Calculator className="w-4 h-4" />;
      default: return null;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'graph_interaction': return 'Graph Interaction';
      case 'drag_drop_match': return 'Drag & Drop';
      case 'image_drop_zone': return 'Image Drop Zone';
      case 'step_builder': return 'Step Builder';
      case 'math_input': return 'Math Input';
      default: return type;
    }
  };

  const renderQuestionContent = (question: InteractiveQuestion) => {
    const data = question.interactionData;

    switch (question.questionType) {
      case 'graph_interaction':
        return (
          <div className="space-y-4">
            <InteractiveGraphCanvas
              showGrid={true}
              allowDrawing={true}
            />
          </div>
        );

      case 'drag_drop_match':
        if (data && 'items' in data && 'targets' in data) {
          return (
            <DragDropMatcher
              items={data.items}
              targets={data.targets}
              onMatchesChange={(matches) => handleAnswerChange(question.id, matches)}
              showFeedback={showFeedback}
            />
          );
        }
        return null;

      case 'image_drop_zone':
        if (data && 'dropZones' in data && 'draggableLabels' in data) {
          return (
            <ImageDropZone
              dropZones={data.dropZones}
              draggableLabels={data.draggableLabels}
              onPlacementsChange={(placements) => handleAnswerChange(question.id, placements)}
              showFeedback={showFeedback}
            />
          );
        }
        return null;

      case 'step_builder':
        if (data && 'steps' in data) {
          return (
            <StepBuilder
              steps={data.steps}
              onOrderChange={(order) => handleAnswerChange(question.id, order)}
              showFeedback={showFeedback}
            />
          );
        }
        return null;

      case 'math_input':
        if (data && 'expectedAnswer' in data) {
          return (
            <SmartMathInput
              expectedAnswer={data.expectedAnswer}
              acceptedFormats={data.acceptedFormats}
              hint={data.hint}
              onAnswerChange={(answer) => handleAnswerChange(question.id, answer)}
              showFeedback={showFeedback}
            />
          );
        }
        return null;

      default:
        return <p>Question type not supported</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 dark:from-slate-950 dark:via-violet-950/30 dark:to-purple-950/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/mock-exams/select')}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="hidden sm:block">
                <h1 className="font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {mocktest2.title}
                </h1>
                <p className="text-xs text-muted-foreground">{mocktest2.subject} • {mocktest2.grade}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-medium",
                timeRemaining < 300 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-primary/10 text-primary"
              )}>
                <Clock className="w-4 h-4" />
                {formatTime(timeRemaining)}
              </div>

              {showFeedback ? (
                <Button onClick={handleReset} variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600">
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        <div className="grid lg:grid-cols-[1fr,280px] gap-6">
          {/* Question Area */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Question Card */}
                <Card className="overflow-hidden border-2 border-border/50 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Question {currentQuestion.questionNumber}
                          </Badge>
                          <Badge variant="secondary" className="bg-accent/10">
                            {currentQuestion.marks} marks
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            {getQuestionIcon(currentQuestion.questionType)}
                            {getQuestionTypeLabel(currentQuestion.questionType)}
                          </Badge>
                          {flaggedQuestions.has(currentQuestion.id) && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              <Flag className="w-3 h-3 mr-1 fill-current" />
                              Flagged
                            </Badge>
                          )}
                        </div>

                        <div className="text-lg font-medium text-foreground leading-relaxed whitespace-pre-line">
                          {renderLatex(currentQuestion.text)}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFlag(currentQuestion.id)}
                        className={cn(
                          "flex-shrink-0",
                          flaggedQuestions.has(currentQuestion.id) && "text-amber-500"
                        )}
                      >
                        <Flag className={cn("w-4 h-4", flaggedQuestions.has(currentQuestion.id) && "fill-current")} />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    {/* Interactive Content */}
                    {renderQuestionContent(currentQuestion)}

                    {/* Hint Section */}
                    {currentQuestion.hints && currentQuestion.hints.length > 0 && !showFeedback && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleHint(currentQuestion.id)}
                          className="gap-2"
                        >
                          <Lightbulb className={cn(
                            "w-4 h-4",
                            showHints[currentQuestion.id] && "text-amber-500 fill-amber-500"
                          )} />
                          {showHints[currentQuestion.id] ? 'Hide Hint' : 'Need a Hint?'}
                        </Button>

                        <AnimatePresence>
                          {showHints[currentQuestion.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                <ul className="space-y-2">
                                  {currentQuestion.hints.map((hint, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                                      <span className="font-bold">💡</span>
                                      {hint}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Feedback Section */}
                    {showFeedback && currentQuestion.feedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
                      >
                        <h4 className="font-medium text-foreground mb-2">Feedback</h4>
                        <p className="text-sm text-muted-foreground">{currentQuestion.feedback.correct}</p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {questions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(i)}
                        className={cn(
                          "w-8 h-8 rounded-full text-sm font-medium transition-all",
                          i === currentQuestionIndex && "bg-primary text-primary-foreground",
                          i !== currentQuestionIndex && answers[q.id] && "bg-green-500 text-white",
                          i !== currentQuestionIndex && !answers[q.id] && "bg-muted text-muted-foreground hover:bg-muted/80",
                          flaggedQuestions.has(q.id) && "ring-2 ring-amber-500"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Question Navigator */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Questions</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                      i === currentQuestionIndex && "bg-primary/10 border-2 border-primary",
                      i !== currentQuestionIndex && "hover:bg-muted border-2 border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      answers[q.id] && "bg-green-500 text-white",
                      !answers[q.id] && i === currentQuestionIndex && "bg-primary text-primary-foreground",
                      !answers[q.id] && i !== currentQuestionIndex && "bg-muted"
                    )}>
                      {answers[q.id] ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getQuestionTypeLabel(q.questionType)}</p>
                      <p className="text-xs text-muted-foreground">{q.marks} marks</p>
                    </div>
                    {flaggedQuestions.has(q.id) && (
                      <Flag className="w-4 h-4 text-amber-500 fill-amber-500" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Test Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Marks</span>
                  <span className="font-medium">{mocktest2.totalMarks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{mocktest2.duration} mins</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Answered</span>
                  <span className="font-medium">{Object.keys(answers).length} / {questions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Flagged</span>
                  <span className="font-medium">{flaggedQuestions.size}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InteractiveMockDemo;
