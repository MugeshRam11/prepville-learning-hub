import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

import UnifiedExamHeader from '@/components/unified-exam/UnifiedExamHeader';
import UnifiedExamSidebar from '@/components/unified-exam/UnifiedExamSidebar';
import UnifiedQuestionCard from '@/components/unified-exam/UnifiedQuestionCard';

import { 
  UnifiedExamData, 
  UnifiedQuestion, 
  UnifiedAnswer,
  getDefaultAnswerBlockType 
} from '@/types/answerBlock';

const UnifiedMockExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { testId, subject, topic, title, questions: passedQuestions } = location.state || {};
  
  const [examData, setExamData] = useState<UnifiedExamData | null>(null);
  const [answers, setAnswers] = useState<UnifiedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeSubQuestionId, setActiveSubQuestionId] = useState<string | null>(null);
  const [startTime] = useState(new Date());
  
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Map database questions to unified format
  const mapDBQuestionsToUnified = (dbQuestions: any[]): UnifiedQuestion[] => {
    return dbQuestions.map((q, index) => {
      const subQuestions = q.mock_sub_questions?.map((sq: any, sqIndex: number) => ({
        id: sq.id,
        label: sq.sub_question_label || String.fromCharCode(97 + sqIndex), // a, b, c...
        text: sq.sub_question_text,
        imageUrl: sq.sub_question_image_url,
        marks: sq.marks || 1,
        commandTerm: sq.command_term,
        wordLimit: sq.word_limit,
        answerKey: sq.answer_key,
        answerBlockType: sq.answer_block_type || getDefaultAnswerBlockType(),
        answerBlockConfig: sq.answer_block_config ? JSON.parse(sq.answer_block_config) : undefined
      })) || [];

      return {
        id: q.id,
        questionNumber: q.question_number || index + 1,
        questionText: q.question_text,
        questionImageUrl: q.question_image_url,
        marks: q.marks || 1,
        commandTerm: q.command_term,
        category: q.category,
        difficulty: q.difficulty,
        wordLimit: q.word_limit,
        answerKey: q.answer_key,
        diagramDescription: q.diagram_description,
        answerBlockType: q.answer_block_type || getDefaultAnswerBlockType(),
        answerBlockConfig: q.answer_block_config ? JSON.parse(q.answer_block_config) : undefined,
        subQuestions
      };
    });
  };

  // Load exam data
  useEffect(() => {
    const loadExamData = async () => {
      setIsLoading(true);
      
      try {
        // If questions are passed directly
        if (passedQuestions && passedQuestions.length > 0) {
          const unifiedQuestions = mapDBQuestionsToUnified(passedQuestions);
          const totalMarks = unifiedQuestions.reduce((sum, q) => {
            const subMarks = q.subQuestions?.reduce((s, sq) => s + sq.marks, 0) || 0;
            return sum + (q.subQuestions?.length ? subMarks : q.marks);
          }, 0);
          
          setExamData({
            id: testId || 'dynamic-test',
            title: title || topic || 'Mock Examination',
            subject: subject || 'Mathematics',
            topic: topic,
            duration: 120,
            totalMarks,
            questions: unifiedQuestions
          });
          
          // Set initial active question
          if (unifiedQuestions.length > 0) {
            setActiveQuestionId(unifiedQuestions[0].id);
            if (unifiedQuestions[0].subQuestions?.length) {
              setActiveSubQuestionId(unifiedQuestions[0].subQuestions[0].id);
            }
          }
          
          setIsLoading(false);
          return;
        }

        // Fetch from database
        if (testId) {
          const { data: questionsData, error } = await supabase
            .from('mock_questions')
            .select(`
              *,
              mock_sub_questions (*)
            `)
            .eq('mock_test_id', testId)
            .order('question_number');

          if (error) throw error;

          if (questionsData && questionsData.length > 0) {
            const unifiedQuestions = mapDBQuestionsToUnified(questionsData);
            const totalMarks = unifiedQuestions.reduce((sum, q) => {
              const subMarks = q.subQuestions?.reduce((s, sq) => s + sq.marks, 0) || 0;
              return sum + (q.subQuestions?.length ? subMarks : q.marks);
            }, 0);

            // Get test metadata
            const { data: testMeta } = await supabase
              .from('mock_tests')
              .select('title, subject, topic')
              .eq('id', testId)
              .single();
            
            setExamData({
              id: testId,
              title: testMeta?.title || title || 'Mock Examination',
              subject: testMeta?.subject || subject || 'Mathematics',
              topic: testMeta?.topic || topic,
              duration: 120,
              totalMarks,
              questions: unifiedQuestions
            });

            if (unifiedQuestions.length > 0) {
              setActiveQuestionId(unifiedQuestions[0].id);
              if (unifiedQuestions[0].subQuestions?.length) {
                setActiveSubQuestionId(unifiedQuestions[0].subQuestions[0].id);
              }
            }
          }
        }

        // Demo data fallback
        if (!examData) {
          setExamData({
            id: 'demo-exam',
            title: 'Demo Mock Examination',
            subject: 'Mathematics',
            duration: 60,
            totalMarks: 25,
            questions: [
              {
                id: 'q1',
                questionNumber: 1,
                questionText: 'Solve the quadratic equation: $x^2 - 5x + 6 = 0$',
                marks: 5,
                commandTerm: 'SOLVE',
                subQuestions: [
                  {
                    id: 'q1a',
                    label: 'a',
                    text: 'Find the values of x',
                    marks: 3,
                    commandTerm: 'CALCULATE',
                    answerBlockType: 'text_equation'
                  },
                  {
                    id: 'q1b',
                    label: 'b',
                    text: 'Verify your answer by substitution',
                    marks: 2,
                    commandTerm: 'VERIFY',
                    answerBlockType: 'text_equation'
                  }
                ]
              },
              {
                id: 'q2',
                questionNumber: 2,
                questionText: 'A bag contains 3 red balls and 2 blue balls. What is the probability of picking a blue ball?',
                marks: 4,
                commandTerm: 'CALCULATE',
                answerBlockType: 'smart_math'
              }
            ]
          });
          setActiveQuestionId('q1');
          setActiveSubQuestionId('q1a');
        }
        
      } catch (error) {
        console.error('Error loading exam:', error);
        toast.error('Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    loadExamData();
  }, [testId, passedQuestions, title, topic, subject]);

  // Load saved answers
  useEffect(() => {
    if (!examData) return;
    
    const saveKey = `unifiedExam_${examData.id}`;
    const savedData = localStorage.getItem(saveKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setAnswers(parsed.answers || []);
      } catch (e) {
        console.error('Failed to load saved answers');
      }
    }
  }, [examData?.id]);

  // Auto-save answers
  useEffect(() => {
    if (!examData) return;
    
    const saveKey = `unifiedExam_${examData.id}`;
    const saveData = () => {
      localStorage.setItem(saveKey, JSON.stringify({ answers }));
    };
    
    const interval = setInterval(saveData, 10000);
    return () => clearInterval(interval);
  }, [answers, examData?.id]);

  // Handle scroll to track active question
  const handleScroll = useCallback(() => {
    if (!mainContentRef.current || !examData) return;

    const containerRect = mainContentRef.current.getBoundingClientRect();
    const scrollTop = mainContentRef.current.scrollTop;

    let closestQuestion: { questionId: string; subQuestionId?: string } | null = null;
    let closestDistance = Infinity;

    examData.questions.forEach(question => {
      // Check main question
      const mainRef = questionRefs.current.get(question.id);
      if (mainRef) {
        const rect = mainRef.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerRect.top - 100);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestQuestion = { questionId: question.id };
        }
      }

      // Check sub-questions
      question.subQuestions?.forEach(subQ => {
        const subRef = questionRefs.current.get(`${question.id}-${subQ.id}`);
        if (subRef) {
          const rect = subRef.getBoundingClientRect();
          const distance = Math.abs(rect.top - containerRect.top - 100);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestQuestion = { questionId: question.id, subQuestionId: subQ.id };
          }
        }
      });
    });

    if (closestQuestion) {
      setActiveQuestionId(closestQuestion.questionId);
      setActiveSubQuestionId(closestQuestion.subQuestionId || null);
    }
  }, [examData]);

  // Handle answer changes
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

  // Navigate to question
  const handleNavigate = (questionId: string, subQuestionId?: string) => {
    const targetId = subQuestionId ? `question-${questionId}-${subQuestionId}` : `question-${questionId}`;
    const element = document.getElementById(targetId);
    
    if (element && mainContentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveQuestionId(questionId);
      setActiveSubQuestionId(subQuestionId || null);
    }
  };

  // Submit exam
  const handleSubmit = () => {
    if (!examData) return;
    
    localStorage.removeItem(`unifiedExam_${examData.id}`);
    
    const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / (1000 * 60));
    
    navigate('/mock-exams/summary', {
      state: {
        testId: examData.id,
        title: examData.title,
        subject: examData.subject,
        answers,
        questions: examData.questions,
        timeSpent,
        totalMarks: examData.totalMarks,
        isUnified: true
      }
    });

    toast.success('Exam submitted successfully!');
  };

  // Get answered count
  const getAnsweredCount = () => {
    return answers.filter(a => {
      const content = a.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (typeof content === 'object' && content !== null) return Object.keys(content).length > 0;
      return false;
    }).length;
  };

  // Get total question slots
  const getTotalQuestionSlots = () => {
    if (!examData) return 0;
    return examData.questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        return total + q.subQuestions.length;
      }
      return total + 1;
    }, 0);
  };

  if (isLoading || !examData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 bg-white rounded-2xl shadow-xl border"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading Exam...
          </h2>
          <p className="text-muted-foreground">Preparing your questions</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <UnifiedExamHeader
        title={examData.title}
        subject={examData.subject}
        duration={examData.duration}
        totalMarks={examData.totalMarks}
        answeredCount={getAnsweredCount()}
        totalQuestions={getTotalQuestionSlots()}
        onSubmit={handleSubmit}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scrollable question area */}
        <div 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="max-w-4xl mx-auto p-6 space-y-8 pb-32">
            {examData.questions.map((question) => (
              <UnifiedQuestionCard
                key={question.id}
                question={question}
                answers={answers}
                onAnswerChange={handleAnswerChange}
              />
            ))}
          </div>
        </div>

        {/* Navigation sidebar */}
        <UnifiedExamSidebar
          questions={examData.questions}
          answers={answers}
          activeQuestionId={activeQuestionId}
          activeSubQuestionId={activeSubQuestionId}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
};

export default UnifiedMockExam;
