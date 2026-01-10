import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, FileText } from 'lucide-react';

import UnifiedExamHeader from '@/components/unified-exam/UnifiedExamHeader';
import UnifiedExamSidebar from '@/components/unified-exam/UnifiedExamSidebar';
import UnifiedQuestionCard from '@/components/unified-exam/UnifiedQuestionCard';

import { 
  UnifiedExamData, 
  UnifiedQuestion, 
  UnifiedAnswer,
  getDefaultAnswerBlockType 
} from '@/types/answerBlock';

import { 
  mapDBQuestionsToInteractive, 
  detectQuestionType,
  getQuestionTypeLabel 
} from '@/lib/interactiveQuestionMapper';
import type { QuestionType } from '@/data/mocktest2';

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
  
  // Interactive mode toggle
  const [interactiveMode, setInteractiveMode] = useState(true);
  const [detectedQuestionTypes, setDetectedQuestionTypes] = useState<Map<string, QuestionType>>(new Map());
  
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Map database questions to unified format with interactive type detection
  const mapDBQuestionsToUnified = (dbQuestions: any[]): UnifiedQuestion[] => {
    const typeMap = new Map<string, QuestionType>();
    
    return dbQuestions.map((q, index) => {
      // Detect question type for interactive mode
      const detectedType = detectQuestionType({
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        question_number: q.question_number,
        diagram_description: q.diagram_description,
        question_image_url: q.question_image_url,
        answer_key: q.answer_key,
        command_term: q.command_term,
        graph_type: q.graph_type,
        has_table: q.has_table
      });
      
      typeMap.set(q.id, detectedType);
      
      const subQuestions = q.mock_sub_questions?.map((sq: any, sqIndex: number) => {
        // Detect sub-question type too
        const subType = detectQuestionType({
          id: sq.id,
          question_text: sq.sub_question_text,
          marks: sq.marks,
          question_number: sqIndex + 1,
          answer_key: sq.answer_key,
          command_term: sq.command_term
        });
        
        typeMap.set(sq.id, subType);
        
        return {
          id: sq.id,
          label: sq.sub_question_label || String.fromCharCode(97 + sqIndex), // a, b, c...
          text: sq.sub_question_text,
          imageUrl: sq.sub_question_image_url,
          marks: sq.marks || 1,
          commandTerm: sq.command_term,
          wordLimit: sq.word_limit,
          answerKey: sq.answer_key,
          answerBlockType: sq.answer_block_type || getDefaultAnswerBlockType(),
          answerBlockConfig: sq.answer_block_config ? JSON.parse(sq.answer_block_config) : undefined,
          interactiveType: subType
        };
      }) || [];

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
        subQuestions,
        interactiveType: detectedType
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

      {/* Interactive Mode Toggle Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="interactive-mode"
              checked={interactiveMode}
              onCheckedChange={setInteractiveMode}
            />
            <Label htmlFor="interactive-mode" className="flex items-center gap-2 cursor-pointer">
              {interactiveMode ? (
                <>
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-700 dark:text-purple-300">Interactive Mode</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Standard Mode</span>
                </>
              )}
            </Label>
          </div>
          {interactiveMode && (
            <span className="text-xs text-muted-foreground">
              Graphs, Drag & Drop, Math Input enabled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {examData.questions.slice(0, 3).map(q => (
            <span key={q.id} className="px-2 py-1 bg-white dark:bg-gray-800 rounded border text-[10px]">
              Q{q.questionNumber}: {getQuestionTypeLabel((q as any).interactiveType || 'text_input')}
            </span>
          ))}
          {examData.questions.length > 3 && (
            <span className="text-[10px]">+{examData.questions.length - 3} more</span>
          )}
        </div>
      </div>

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
                interactiveMode={interactiveMode}
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
