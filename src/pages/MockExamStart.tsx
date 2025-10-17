
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MockExamSidebar from '@/components/mock-exam/MockExamSidebar';
import MockExamHeader from '@/components/mock-exam/MockExamHeader';
import MockExamQuestion from '@/components/mock-exam/MockExamQuestion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Question {
  id: string;
  text: string;
  marks: number;
  subQuestions?: SubQuestion[];
  image?: string;
  passage?: string;
}

export interface SubQuestion {
  id: string;
  text: string;
  marks: number;
  label?: string;
}

export interface Answer {
  questionId: string;
  subQuestionId?: string;
  content: string;
  wordCount: number;
}

const MockExamStart = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { testId, subject, topic, title, subjectKey, questions: passedQuestions } = location.state || {};

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [startTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(180 * 60); // 3 hours in seconds

  // Load questions from database or use passed questions
  useEffect(() => {
    const loadTestData = async () => {
      // If questions are passed directly (from subject view), use them
      if (passedQuestions && passedQuestions.length > 0) {
        console.log('Using passed questions:', passedQuestions);
        
        const formattedQuestions: Question[] = passedQuestions.map(q => ({
          id: q.id,
          text: q.question_text,
          marks: q.marks,
          image: q.question_image_url || undefined,
          passage: undefined,
          subQuestions: q.mock_sub_questions?.map(sq => ({
            id: sq.id,
            text: sq.sub_question_text,
            marks: sq.marks,
            label: sq.sub_question_label
          })) || []
        }));
        
        setQuestions(formattedQuestions);
        setIsLoading(false);
        return;
      }

      if (!testId) {
        console.error('No test ID or questions provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        console.log('Loading test data for testId:', testId);
        
        // Fetch mock questions for this test
        const { data: questionsData, error: questionsError } = await supabase
          .from('mock_questions')
          .select(`
            *,
            mock_sub_questions (*)
          `)
          .eq('mock_test_id', testId)
          .order('question_number');

        if (questionsError) throw questionsError;

        if (questionsData && questionsData.length > 0) {
          console.log('Questions data found:', questionsData);
          
          // Format questions for the UI
          const formattedQuestions: Question[] = questionsData.map(q => ({
            id: q.id,
            text: q.question_text,
            marks: q.marks,
            image: q.question_image_url || undefined,
            passage: undefined,
            subQuestions: q.mock_sub_questions?.map(sq => ({
              id: sq.id,
              text: sq.sub_question_text,
              marks: sq.marks,
              label: sq.sub_question_label
            })) || []
          }));
          
          console.log('Formatted questions:', formattedQuestions);
          setQuestions(formattedQuestions);
        } else {
          console.log('No questions found for test:', testId);
          toast.error('No questions found for this test');
          setQuestions([]);
        }
      } catch (error) {
        console.error('Error loading test data:', error);
        toast.error('Failed to load test questions');
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTestData();
  }, [testId, passedQuestions]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-saving answers...');
      localStorage.setItem('mockExamAnswers', JSON.stringify(answers));
    }, 30000);

    return () => clearInterval(interval);
  }, [answers]);

  // Load saved answers on component mount
  useEffect(() => {
    const savedAnswers = localStorage.getItem('mockExamAnswers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  // Timer countdown with auto-submit
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Auto-submit when time runs out
      toast.info('Time is up! Submitting your test...');
      handleSubmitTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleQuestionSelect = (questionIndex: number, subQuestionIndex?: number) => {
    setCurrentQuestionIndex(questionIndex);
    setCurrentSubQuestionIndex(subQuestionIndex ?? null);
  };

  const handleNextQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    // If we're on a sub-question, try to move to next sub-question
    if (currentSubQuestionIndex !== null && currentQuestion.subQuestions) {
      if (currentSubQuestionIndex < currentQuestion.subQuestions.length - 1) {
        setCurrentSubQuestionIndex(currentSubQuestionIndex + 1);
        return;
      }
    }
    
    // Move to next main question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextQuestion = questions[currentQuestionIndex + 1];
      setCurrentSubQuestionIndex(nextQuestion.subQuestions?.length ? 0 : null);
    }
  };

  const handleAnswerChange = (questionId: string, content: string, subQuestionId?: string) => {
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    setAnswers(prev => {
      const existingIndex = prev.findIndex(
        a => a.questionId === questionId && a.subQuestionId === subQuestionId
      );

      const newAnswer: Answer = {
        questionId,
        subQuestionId,
        content,
        wordCount
      };

      let updatedAnswers;
      if (existingIndex >= 0) {
        updatedAnswers = [...prev];
        updatedAnswers[existingIndex] = newAnswer;
      } else {
        updatedAnswers = [...prev, newAnswer];
      }

      // Save to localStorage immediately
      localStorage.setItem('mockExamAnswers', JSON.stringify(updatedAnswers));
      
      return updatedAnswers;
    });
  };

  const handleSubmitTest = () => {
    // Clear saved answers from localStorage
    localStorage.removeItem('mockExamAnswers');
    
    const timeSpent = new Date().getTime() - startTime.getTime();
    const totalTimeMinutes = Math.floor(timeSpent / (1000 * 60));
    
    navigate('/mock-exams/summary', {
      state: {
        testId,
        subject,
        topic,
        title,
        answers,
        questions,
        timeSpent: totalTimeMinutes
      }
    });
  };

  const getCurrentAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return '';

    const questionId = currentQuestion.id;
    const subQuestionId = currentSubQuestionIndex !== null 
      ? currentQuestion.subQuestions?.[currentSubQuestionIndex]?.id 
      : undefined;

    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );

    return answer?.content || '';
  };

  const getAnsweredQuestions = (): Set<string> => {
    const answeredSet = new Set<string>();
    answers.forEach(answer => {
      if (answer.subQuestionId) {
        answeredSet.add(`${answer.questionId}-${answer.subQuestionId}`);
      } else {
        answeredSet.add(answer.questionId);
      }
    });
    return answeredSet;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Check if we have either testId+subject+topic OR subjectKey+subject
  const hasValidSession = (testId && subject && topic) || (subjectKey && subject) || (passedQuestions && passedQuestions.length > 0);

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-purple-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Session Error</h2>
          <p className="text-gray-600 mb-4">No exam session found.</p>
          <Button 
            onClick={() => navigate('/mock-exams/select')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Back to Selection
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-blue-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Loading Test...</h2>
          <p className="text-gray-600 mb-4">Preparing {title || topic} questions...</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <MockExamHeader 
        subject={subject || 'Subject'}
        topic={title || topic || 'Test'}
        onSubmit={handleSubmitTest}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <MockExamSidebar
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          currentSubQuestionIndex={currentSubQuestionIndex}
          answeredQuestions={getAnsweredQuestions()}
          onQuestionSelect={handleQuestionSelect}
        />
        
        <MockExamQuestion
          question={questions[currentQuestionIndex]}
          questionNumber={currentQuestionIndex + 1}
          subQuestionIndex={currentSubQuestionIndex}
          answer={getCurrentAnswer()}
          onAnswerChange={handleAnswerChange}
          onNext={handleNextQuestion}
          isLastQuestion={currentQuestionIndex === questions.length - 1 && 
            (currentSubQuestionIndex === null || 
             currentSubQuestionIndex === (questions[currentQuestionIndex]?.subQuestions?.length ?? 0) - 1)}
        />
      </div>
    </div>
  );
};

export default MockExamStart;
