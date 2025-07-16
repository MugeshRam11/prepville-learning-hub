
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MockExamSidebar from '@/components/mock-exam/MockExamSidebar';
import MockExamHeader from '@/components/mock-exam/MockExamHeader';
import MockExamQuestion from '@/components/mock-exam/MockExamQuestion';
import { mathGraphMockTest } from '@/data/mathGraphMockTest';
import { sampleMathGraphTest } from '@/data/sampleMathGraphTest';
import { Button } from '@/components/ui/button';

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
  const { subject, topic } = location.state || {};

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [startTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load questions based on selected topic
  useEffect(() => {
    let testData = null;
    
    console.log('Loading test data for:', { subject, topic });
    
    if (topic === 'Graph Theory and Analysis') {
      testData = mathGraphMockTest;
    } else if (topic === 'Graphs and Linear Equations') {
      testData = sampleMathGraphTest;
    }
    
    if (testData) {
      console.log('Test data found:', testData);
      const formattedQuestions: Question[] = testData.questions.map(q => ({
        id: q.id.toString(),
        text: q.question_text,
        marks: q.marks,
        image: q.question_image_url || undefined,
        passage: undefined,
        subQuestions: q.sub_questions?.map(sq => ({
          id: sq.id?.toString() || sq.sub_question_label,
          text: sq.sub_question_text,
          marks: sq.marks
        }))
      }));
      
      console.log('Formatted questions:', formattedQuestions);
      setQuestions(formattedQuestions);
    } else {
      console.log('No test data found for topic:', topic);
      setQuestions([]);
    }
  }, [subject, topic]);

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

  const handleQuestionSelect = (questionIndex: number, subQuestionIndex?: number) => {
    setCurrentQuestionIndex(questionIndex);
    setCurrentSubQuestionIndex(subQuestionIndex ?? null);
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

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      } else {
        return [...prev, newAnswer];
      }
    });
  };

  const handleSubmitTest = () => {
    const timeSpent = new Date().getTime() - startTime.getTime();
    const totalTimeMinutes = Math.floor(timeSpent / (1000 * 60));
    
    navigate('/mock-exams/summary', {
      state: {
        subject,
        topic,
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

  if (!subject || !topic) {
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-blue-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center animate-spin">
            <span className="text-white text-2xl">📚</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Loading Test...</h2>
          <p className="text-gray-600 mb-4">Preparing {topic} questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <MockExamHeader 
        subject={subject}
        topic={topic}
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
          subQuestionIndex={currentSubQuestionIndex}
          answer={getCurrentAnswer()}
          onAnswerChange={handleAnswerChange}
        />
      </div>
    </div>
  );
};

export default MockExamStart;
