import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, MessageSquare, Lightbulb, BookOpen, GraduationCap } from 'lucide-react';
import Header from '@/components/Header';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import UnifiedQuestionCard from '@/components/unified-exam/UnifiedQuestionCard';
import { EnhancedAITutor } from '@/components/EnhancedAITutor';
import { UnifiedQuestion, UnifiedAnswer, getDefaultAnswerBlockType } from '@/types/answerBlock';
import { detectQuestionType } from '@/lib/interactiveQuestionMapper';
import { ExamModeProvider } from '@/contexts/ExamModeContext';
import MarkSchemeButton from '@/components/unified-exam/MarkSchemeButton';
import MarkSchemeModal from '@/components/unified-exam/MarkSchemeModal';
import AIFeedbackButton from '@/components/unified-exam/AIFeedbackButton';
import AIFeedbackPanel from '@/components/unified-exam/AIFeedbackPanel';
import { AIFeedbackResponse } from '@/types/examMode';

const PracticeQuestionView = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState<UnifiedQuestion | null>(null);
  const [answers, setAnswers] = useState<UnifiedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [showMarkScheme, setShowMarkScheme] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackResponse | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!questionId) return;
      
      setIsLoading(true);
      
      try {
        // Try fetching from subject_questions first (Practice-QA)
        const { data: subjectQ, error: subjectError } = await supabase
          .from('subject_questions')
          .select('*')
          .eq('id', questionId)
          .single();

        if (subjectQ && !subjectError) {
          const detectedType = detectQuestionType({
            id: subjectQ.id,
            question_text: subjectQ.question_text,
            marks: 1,
            question_number: 1,
            answer_key: subjectQ.answer_key
          });

          setQuestion({
            id: subjectQ.id,
            questionNumber: 1,
            questionText: subjectQ.question_text,
            questionImageUrl: subjectQ.question_image_url,
            marks: subjectQ.xp_reward || 10,
            commandTerm: undefined,
            answerKey: subjectQ.answer_key,
            answerBlockType: getDefaultAnswerBlockType(),
            interactiveType: detectedType,
            subQuestions: []
          });
          
          setIsLoading(false);
          return;
        }

        // Try fetching from questions table (quick tests)
        const { data: testQ, error: testError } = await supabase
          .from('questions')
          .select('*')
          .eq('id', questionId)
          .single();

        if (testQ && !testError) {
          setQuestion({
            id: testQ.id,
            questionNumber: 1,
            questionText: testQ.question_text,
            questionImageUrl: testQ.question_image_url,
            marks: 1,
            commandTerm: undefined,
            answerKey: testQ.correct_answer,
            answerBlockType: 'text_equation',
            interactiveType: 'text_input',
            subQuestions: []
          });
          
          setIsLoading(false);
          return;
        }

        toast.error('Question not found');
        navigate('/practice');
      } catch (error) {
        console.error('Error fetching question:', error);
        toast.error('Failed to load question');
        navigate('/practice');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [questionId, navigate]);

  const handleAnswerChange = (questionId: string, value: any, subQuestionId?: string) => {
    setAnswers(prev => {
      const existingIndex = prev.findIndex(
        a => a.questionId === questionId && a.subQuestionId === subQuestionId
      );

      const newAnswer: UnifiedAnswer = {
        questionId,
        subQuestionId,
        answerType: getDefaultAnswerBlockType(),
        content: value,
        wordCount: typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0,
        timestamp: new Date()
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });
  };

  const handleSubmit = () => {
    if (!question) return;
    
    // Simple check: compare answer to answer key
    const userAnswer = answers.find(a => a.questionId === question.id)?.content;
    const correct = question.answerKey && 
      String(userAnswer).toLowerCase().trim() === String(question.answerKey).toLowerCase().trim();
    
    setIsCorrect(!!correct);
    setShowResults(true);
    
    if (correct) {
      toast.success('Correct! Well done!');
    } else {
      toast.info('Not quite right. Check the solution below.');
    }
  };

  const handleRetry = () => {
    setAnswers([]);
    setShowResults(false);
    setIsCorrect(false);
    setAiFeedback(null);
  };

  const handleAIFeedback = useCallback(async () => {
    if (!question) return;
    const userAnswer = answers.find(a => a.questionId === question.id)?.content;
    if (!userAnswer) return;

    setAiFeedbackLoading(true);
    setShowAIFeedback(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-feedback', {
        body: {
          questionText: question.questionText,
          studentAnswer: typeof userAnswer === 'object' && userAnswer !== null && 'text' in userAnswer
            ? (userAnswer as any).text
            : String(userAnswer),
          answerKey: question.answerKey || '',
          commandTerm: question.commandTerm || '',
          marks: question.marks,
        }
      });

      if (error) throw error;
      setAiFeedback(data as AIFeedbackResponse);
    } catch (err) {
      console.error('AI feedback error:', err);
      toast.error('Failed to get AI feedback');
    } finally {
      setAiFeedbackLoading(false);
    }
  }, [question, answers]);

  const hasAnswer = question ? answers.some(a => a.questionId === question?.id) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 bg-white dark:bg-card rounded-2xl shadow-xl border"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Loading Question...</h2>
          </motion.div>
        </main>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <ExamModeProvider initialMode="study">
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 py-6">
          <div className="container max-w-4xl">
            {/* Back Button and Header */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/practice')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Practice
              </Button>
              
              <div className="flex items-center gap-2">
                <MarkSchemeButton
                  hasAttempted={hasAnswer}
                  onClick={() => setShowMarkScheme(true)}
                />
                <AIFeedbackButton
                  questionId={question.id}
                  hasAnswer={hasAnswer}
                  isLoading={aiFeedbackLoading}
                  onClick={handleAIFeedback}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowTutor(true)}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask Tutor
                </Button>
              </div>
            </div>

            {/* Question Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <UnifiedQuestionCard
                question={question}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                interactiveMode={true}
              />
            </motion.div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {!showResults ? (
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  disabled={answers.length === 0}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Answer
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleRetry}
                  className="gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </Button>
              )}
            </div>

            {/* Results Section */}
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card className={isCorrect ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">Correct!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-amber-600" />
                          <span className="text-amber-700 dark:text-amber-400">Not quite right</span>
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Correct Answer:</h4>
                        <p className="text-foreground">{question.answerKey || 'Answer not available'}</p>
                      </div>
                      
                      {!isCorrect && (
                        <Button
                          variant="outline"
                          onClick={() => setShowTutor(true)}
                          className="gap-2"
                        >
                          <Lightbulb className="w-4 h-4" />
                          Get Help from Tutor
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </main>

        {/* Mark Scheme Modal */}
        <MarkSchemeModal
          isOpen={showMarkScheme}
          onClose={() => setShowMarkScheme(false)}
          markScheme={null}
          questionNumber={question.questionNumber}
          answerKey={question.answerKey}
          commandTerm={question.commandTerm}
        />

        {/* AI Feedback Panel */}
        <AIFeedbackPanel
          isOpen={showAIFeedback}
          onClose={() => setShowAIFeedback(false)}
          feedback={aiFeedback}
          isLoading={aiFeedbackLoading}
          questionNumber={question.questionNumber}
          onTryAgain={() => {
            setShowAIFeedback(false);
            setAiFeedback(null);
          }}
        />

        {/* AI Tutor */}
        <EnhancedAITutor
          question={{
            id: question.id,
            title: `Question ${question.questionNumber}`,
            content: question.questionText,
            answerKey: question.answerKey || '',
            topic: 'Practice',
            difficulty: 'medium'
          }}
          subject="Mathematics"
          isOpen={showTutor}
          onClose={() => setShowTutor(false)}
          mode="practice"
        />
      </div>
    </ExamModeProvider>
  );
};

export default PracticeQuestionView;
