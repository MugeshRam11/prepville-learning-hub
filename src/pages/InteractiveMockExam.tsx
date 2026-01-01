import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import InteractiveExamHeader from '@/components/mock-exam/InteractiveExamHeader';
import InteractiveExamSidebar from '@/components/mock-exam/InteractiveExamSidebar';
import InteractiveExamQuestion from '@/components/mock-exam/InteractiveExamQuestion';

import { mocktest2, type InteractiveMockTest } from '@/data/mocktest2';

const InteractiveMockExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get test data from location state or use default mocktest2
  const testData: InteractiveMockTest = location.state?.testData || mocktest2;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [startTime] = useState(new Date());

  // Auto-save to localStorage
  useEffect(() => {
    const saveKey = `interactiveExam_${testData.id}`;
    const savedData = localStorage.getItem(saveKey);
    
    if (savedData) {
      const { answers: savedAnswers, answered } = JSON.parse(savedData);
      setAnswers(savedAnswers);
      setAnsweredQuestions(new Set(answered));
    }
  }, [testData.id]);

  useEffect(() => {
    const saveKey = `interactiveExam_${testData.id}`;
    const interval = setInterval(() => {
      localStorage.setItem(saveKey, JSON.stringify({
        answers,
        answered: Array.from(answeredQuestions)
      }));
    }, 10000); // Auto-save every 10 seconds

    return () => clearInterval(interval);
  }, [answers, answeredQuestions, testData.id]);

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
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question - submit
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
