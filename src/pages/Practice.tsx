import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GlobalChatbot from '@/components/GlobalChatbot';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PracticeFilters, { PracticeFiltersState } from '@/components/practice/PracticeFilters';
import PracticeQuestionRow from '@/components/practice/PracticeQuestionRow';
import { usePracticeQuestionStatus } from '@/hooks/usePracticeQuestionStatus';
import { cn } from '@/lib/utils';

interface PracticeQuestion {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  question_text: string;
  xp_reward: number | null;
  subject: string;
}

const Practice = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [filters, setFilters] = useState<PracticeFiltersState>({
    search: '',
    topic: 'all',
    difficulty: 'all',
    questionType: 'all',
    status: 'all'
  });

  const { getStatus, statusMap, isLoading: statusLoading } = usePracticeQuestionStatus();

  useEffect(() => {
    fetchPracticeQuestions();

    // Real-time subscription for practice questions (subject_questions table)
    const subjectQuestionsChannel = supabase.channel('practice_subject_questions_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subject_questions'
      }, () => {
        console.log('[Practice] subject_questions changed, refetching...');
        fetchPracticeQuestions();
      })
      .subscribe();

    // Also listen to tests table for admin quick_test changes
    const testsChannel = supabase.channel('practice_tests_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tests'
      }, () => {
        console.log('[Practice] tests table changed, refetching...');
        fetchPracticeQuestions();
      })
      .subscribe();

    // Listen to questions table as well (questions linked to tests)
    const questionsChannel = supabase.channel('practice_questions_table_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'questions'
      }, () => {
        console.log('[Practice] questions table changed, refetching...');
        fetchPracticeQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subjectQuestionsChannel);
      supabase.removeChannel(testsChannel);
      supabase.removeChannel(questionsChannel);
    };
  }, []);

  const fetchPracticeQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_questions')
        .select('id, title, topic, difficulty, question_text, xp_reward, subject')
        .eq('is_published', true)
        .order('topic')
        .order('difficulty');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching practice questions:', error);
      toast.error('Failed to load practice questions');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique topics for pills
  const uniqueTopics = useMemo(() => {
    return [...new Set(questions.map(q => q.topic))].sort();
  }, [questions]);

  // Extract unique question types (simplified from difficulty for now)
  const questionTypes = useMemo(() => {
    return ['MCQ', 'Text', 'Math', 'Graph'];
  }, []);

  // Apply filters
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = q.title.toLowerCase().includes(searchLower);
        const matchesText = q.question_text?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesText) return false;
      }

      // Topic filter (from pills or dropdown)
      const activeTopic = selectedTopic !== 'all' ? selectedTopic : filters.topic;
      if (activeTopic !== 'all' && q.topic !== activeTopic) return false;

      // Difficulty filter
      if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;

      // Status filter
      if (filters.status !== 'all') {
        const status = getStatus(q.id);
        if (status !== filters.status) return false;
      }

      return true;
    });
  }, [questions, filters, selectedTopic, getStatus]);

  // Count solved questions
  const solvedCount = useMemo(() => {
    return questions.filter(q => getStatus(q.id) === 'solved').length;
  }, [questions, getStatus, statusMap]);

  const handleTopicPillClick = (topic: string) => {
    setSelectedTopic(topic);
    if (topic !== 'all') {
      setFilters(prev => ({ ...prev, topic: 'all' }));
    }
  };

  const getDifficultyLevel = (difficulty: string): 'easy' | 'medium' | 'hard' => {
    const lower = difficulty?.toLowerCase();
    if (lower === 'easy') return 'easy';
    if (lower === 'hard') return 'hard';
    return 'medium';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-green-500/5">
        {/* Hero Section */}
        <section className="py-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-border">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Practice & Learn
                </h1>
                <p className="text-muted-foreground mt-1">
                  Master concepts at your own pace. No timer, no pressure.
                </p>
              </div>

              {/* Solved Counter */}
              <div className="flex items-center gap-3 bg-white dark:bg-card px-4 py-3 rounded-xl shadow-sm border">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {solvedCount}/{questions.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Problems Solved</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Topic Pills */}
        <section className="py-4 border-b border-border bg-background">
          <div className="container">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <Button
                variant={selectedTopic === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTopicPillClick('all')}
                className={cn(
                  "rounded-full whitespace-nowrap",
                  selectedTopic === 'all' && "bg-green-600 hover:bg-green-700"
                )}
              >
                <BookOpen className="w-4 h-4 mr-1" />
                All Topics
              </Button>
              {uniqueTopics.map(topic => (
                <Button
                  key={topic}
                  variant={selectedTopic === topic ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTopicPillClick(topic)}
                  className={cn(
                    "rounded-full whitespace-nowrap",
                    selectedTopic === topic && "bg-green-600 hover:bg-green-700"
                  )}
                >
                  {topic}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Filters and Question List */}
        <section className="py-6">
          <div className="container space-y-4">
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <PracticeFilters
                filters={filters}
                onFilterChange={setFilters}
                topics={uniqueTopics}
                questionTypes={questionTypes}
              />
            </motion.div>

            {/* Results Count */}
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">
                Showing {filteredQuestions.length} of {questions.length} questions
              </span>
            </div>

            {/* Question Table */}
            {loading || statusLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <span className="ml-2 text-muted-foreground">Loading questions...</span>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 space-y-4"
              >
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg">No questions found.</p>
                <p className="text-sm text-muted-foreground">
                  {questions.length > 0 
                    ? 'Try adjusting your filters.' 
                    : 'Practice questions will appear here once added by administrators.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg border bg-card overflow-hidden"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="hidden md:table-cell">Topic</TableHead>
                      <TableHead className="hidden sm:table-cell">Difficulty</TableHead>
                      <TableHead className="hidden lg:table-cell">Type</TableHead>
                      <TableHead className="hidden lg:table-cell w-20 text-center">XP</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question, index) => (
                      <PracticeQuestionRow
                        key={question.id}
                        id={question.id}
                        number={index + 1}
                        title={question.title}
                        topic={question.topic}
                        difficulty={getDifficultyLevel(question.difficulty)}
                        questionType={question.subject || 'Text'}
                        status={getStatus(question.id)}
                        marks={question.xp_reward || undefined}
                      />
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <GlobalChatbot subject="Mathematics" />
    </div>
  );
};

export default Practice;
