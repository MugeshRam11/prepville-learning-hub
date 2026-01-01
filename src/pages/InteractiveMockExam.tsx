import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import InteractiveExamHeader from '@/components/mock-exam/InteractiveExamHeader';
import InteractiveExamSidebar from '@/components/mock-exam/InteractiveExamSidebar';
import InteractiveExamQuestion from '@/components/mock-exam/InteractiveExamQuestion';

import { mocktest2, type InteractiveMockTest, type InteractiveQuestion } from '@/data/mocktest2';
import { mapDBQuestionsToInteractive, mapDBQuestionsToInteractiveWithAI } from '@/lib/interactiveQuestionMapper';

const InteractiveMockExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get test data from location state
  const { testId, subject, topic, title, questions: passedQuestions } = location.state || {};
  
  const [testData, setTestData] = useState<InteractiveMockTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [startTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Load questions from database or use default mocktest2
  useEffect(() => {
    const loadTestData = async () => {
      setIsLoading(true);
      
      try {
        // If questions are passed directly (from subject view), convert them
        if (passedQuestions && passedQuestions.length > 0) {
          console.log('Converting passed questions to interactive format with AI:', passedQuestions);
          
          // Use AI-powered detection for better question type accuracy
          const interactiveQuestions = await mapDBQuestionsToInteractiveWithAI(passedQuestions);
          const totalMarks = interactiveQuestions.reduce((sum, q) => sum + q.marks, 0);
          
          setTestData({
            id: testId || 'dynamic-test',
            title: title || topic || 'Interactive Model Test',
            subject: subject || 'Mathematics',
            board: 'IB',
            grade: '8-9',
            duration: 120, // 2 hours default
            totalMarks,
            questions: interactiveQuestions
          });
          
          setIsLoading(false);
          return;
        }

        // If testId is provided, fetch from database
        if (testId) {
          console.log('Loading test data for testId:', testId);
          
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
            console.log('Questions data found, using AI detection:', questionsData);
            
            // Use AI-powered detection
            const interactiveQuestions = await mapDBQuestionsToInteractiveWithAI(questionsData);
            const totalMarks = interactiveQuestions.reduce((sum, q) => sum + q.marks, 0);
            
            // Fetch test metadata
            const { data: testMeta } = await supabase
              .from('mock_tests')
              .select('title, subject, topic')
              .eq('id', testId)
              .single();
            
            setTestData({
              id: testId,
              title: testMeta?.title || title || 'Interactive Model Test',
              subject: testMeta?.subject || subject || 'Mathematics',
              board: 'IB',
              grade: '8-9',
              duration: 120,
              totalMarks,
              questions: interactiveQuestions
            });
            
            setIsLoading(false);
            return;
          }
        }

        // Default to mocktest2 demo data
        console.log('Using default mocktest2 demo data');
        setTestData(mocktest2);
        
      } catch (error) {
        console.error('Error loading test data:', error);
        toast.error('Failed to load test questions. Using demo data.');
        setTestData(mocktest2);
      } finally {
        setIsLoading(false);
      }
    };

    loadTestData();
  }, [testId, passedQuestions, title, topic, subject]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!testData) return;
    
    const saveKey = `interactiveExam_${testData.id}`;
    const savedData = localStorage.getItem(saveKey);
    
    if (savedData) {
      const { answers: savedAnswers, answered } = JSON.parse(savedData);
      setAnswers(savedAnswers);
      setAnsweredQuestions(new Set(answered));
    }
  }, [testData?.id]);

  useEffect(() => {
    if (!testData) return;
    
    const saveKey = `interactiveExam_${testData.id}`;
    const interval = setInterval(() => {
      localStorage.setItem(saveKey, JSON.stringify({
        answers,
        answered: Array.from(answeredQuestions)
      }));
    }, 10000); // Auto-save every 10 seconds

    return () => clearInterval(interval);
  }, [answers, answeredQuestions, testData?.id]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    setAnsweredQuestions(prev => {
      const newSet = new Set(prev);
      if (answer && (
        (typeof answer === 'object' && Object.keys(answer).length > 0) ||
        (typeof answer === 'string' && answer.trim().length > 0) ||
        (Array.isArray(answer) && answer.length > 0)
      )) {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (!testData) return;
    
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = () => {
    if (!testData) return;
    
    // Clear saved data
    localStorage.removeItem(`interactiveExam_${testData.id}`);
    
    const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / (1000 * 60));
    
    // Navigate to summary with results
    navigate('/mock-exams/summary', {
      state: {
        testId: testData.id,
        title: testData.title,
        subject: testData.subject,
        answers,
        questions: testData.questions,
        timeSpent,
        totalMarks: testData.totalMarks,
        isInteractive: true
      }
    });

    toast.success('Test submitted successfully!');
  };

  // Loading state
  if (isLoading || !testData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-blue-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading Interactive Test...
          </h2>
          <p className="text-gray-600">Preparing your questions...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (answeredQuestions.size / testData.questions.length) * 100;
  const currentQuestion = testData.questions[currentQuestionIndex];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <InteractiveExamHeader
        title={testData.title}
        subject={`${testData.subject} ${testData.grade}`}
        onSubmit={handleSubmit}
        timeLimit={testData.duration}
        progressPercentage={progressPercentage}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={testData.questions.length}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Area */}
        <AnimatePresence mode="wait">
          <InteractiveExamQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswerChange={handleAnswerChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstQuestion={currentQuestionIndex === 0}
            isLastQuestion={currentQuestionIndex === testData.questions.length - 1}
            currentAnswer={answers[currentQuestion.id]}
          />
        </AnimatePresence>

        {/* Sidebar */}
        <InteractiveExamSidebar
          questions={testData.questions.map(q => ({
            id: q.id,
            questionNumber: q.questionNumber,
            questionType: q.questionType,
            marks: q.marks
          }))}
          currentQuestionIndex={currentQuestionIndex}
          answeredQuestions={answeredQuestions}
          onQuestionSelect={handleQuestionSelect}
        />
      </div>
    </div>
  );
};

export default InteractiveMockExam;
