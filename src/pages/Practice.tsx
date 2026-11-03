import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import GlobalChatbot from '@/components/GlobalChatbot';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { toast } from 'sonner';
import {
  Loader2,
  BookOpen,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Award,
  HelpCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderFinalText as renderLatexContent } from '@/lib/renderFinalText';
import { PracticeSessionGeneratorModal } from '@/components/practice/PracticeSessionGeneratorModal';
import { cn } from '@/lib/utils';

export interface QuestionBankItem {
  id: string;
  question_text: string;
  image_url: string | null;
  topic: string;
  subtopic: string | null;
  strand: string;
  myp_year: string;
  difficulty: string;
  question_type: string;
  marks: number;
  created_at: string;
}

export interface PracticeSessionRecord {
  id: string;
  title: string;
  programme: string;
  subject: string;
  total_questions: number;
  completed_questions: number;
  is_completed: boolean;
  score: number | null;
  created_at: string;
  updated_at: string;
}

const STRANDS = [
  'Number',
  'Algebra',
  'Geometry and Trigonometry',
  'Statistics and Probability'
] as const;

const MYP_YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const;

const QUESTION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'expression', label: 'Expression / Equation' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'multi_part', label: 'Multi-Part' },
  { value: 'proof', label: 'Proof / Derivation' },
  { value: 'long_answer', label: 'Structured / Long Answer' }
];

const difficultyBadgeColors: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  medium: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  hard: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
};

const PAGE_SIZE = 12;

const Practice: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();

  // Active Tab: 'bank' | 'sessions'
  const [activeTab, setActiveTab] = useState<'bank' | 'sessions'>('bank');

  // Question Bank State
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [page, setPage] = useState(1);

  // Student Attempted Question Map (question_id -> { status, is_correct })
  const [attemptMap, setAttemptMap] = useState<Record<string, { status: string; isCorrect: boolean | null }>>({});

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStrand, setSelectedStrand] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'unattempted' | 'completed'>('all');

  // Generator Modal
  const [generatorOpen, setGeneratorOpen] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Fetch student attempt history
  const fetchAttemptMap = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('practice_session_questions')
        .select(`
          question_id,
          attempt_status,
          is_correct,
          practice_sessions!inner(user_id)
        `)
        .eq('practice_sessions.user_id', user.id);

      if (error) {
        console.warn('Failed to load user question attempts:', error.message);
        return;
      }

      const map: Record<string, { status: string; isCorrect: boolean | null }> = {};
      (data || []).forEach((row: any) => {
        if (row.question_id) {
          if (!map[row.question_id] || row.attempt_status === 'submitted' || row.attempt_status === 'evaluated') {
            map[row.question_id] = {
              status: row.attempt_status,
              isCorrect: row.is_correct
            };
          }
        }
      });
      setAttemptMap(map);
    } catch (err) {
      console.warn('Error fetching attempt map:', err);
    }
  }, [user?.id]);

  // Fetch Questions from Question Bank
  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      let query = supabase
        .from('question_bank')
        .select('id, question_text, image_url, topic, subtopic, strand, myp_year, difficulty, question_type, marks, created_at', { count: 'exact' })
        .eq('programme', 'MYP')
        .eq('subject', 'mathematics')
        .eq('is_published', true)
        .eq('review_status', 'approved');

      if (selectedStrand !== 'all') {
        query = query.eq('strand', selectedStrand);
      }
      if (selectedYear !== 'all') {
        query = query.eq('myp_year', selectedYear);
      }
      if (selectedDifficulty !== 'all') {
        query = query.eq('difficulty', selectedDifficulty);
      }
      if (selectedType !== 'all') {
        query = query.eq('question_type', selectedType);
      }
      if (search.trim()) {
        query = query.or(`question_text.ilike.%${search.trim()}%,topic.ilike.%${search.trim()}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setQuestions((data as unknown as QuestionBankItem[]) || []);
      setTotalQuestionsCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching question bank:', err);
      toast.error('Failed to load questions from Question Bank');
    } finally {
      setLoadingQuestions(false);
    }
  }, [selectedStrand, selectedYear, selectedDifficulty, selectedType, search, page]);

  // Fetch User Practice Sessions
  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('programme', 'MYP')
        .eq('subject', 'mathematics')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions((data as PracticeSessionRecord[]) || []);
    } catch (err: any) {
      console.error('Error loading practice sessions:', err);
      toast.error('Failed to load your practice sessions');
    } finally {
      setLoadingSessions(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetchAttemptMap();
  }, [fetchAttemptMap]);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  // Filter questions client-side for attemptFilter if specified
  const displayedQuestions = useMemo(() => {
    if (attemptFilter === 'all') return questions;
    return questions.filter((q) => {
      const att = attemptMap[q.id];
      if (attemptFilter === 'unattempted') {
        return !att || att.status === 'unattempted';
      }
      if (attemptFilter === 'completed') {
        return att && (att.status === 'submitted' || att.status === 'evaluated');
      }
      return true;
    });
  }, [questions, attemptMap, attemptFilter]);

  const totalPages = Math.max(1, Math.ceil(totalQuestionsCount / PAGE_SIZE));

  const resetFilters = () => {
    setSearch('');
    setSelectedStrand('all');
    setSelectedYear('all');
    setSelectedDifficulty('all');
    setSelectedType('all');
    setAttemptFilter('all');
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white py-10 px-4 border-b border-indigo-800/40 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="container max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-xs px-2.5 py-0.5">
                    IB MYP Mathematics
                  </Badge>
                  <span className="text-xs text-indigo-300">Independent Question Bank</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  Practice & Problem Solving
                </h1>
                <p className="text-sm md:text-base text-indigo-200/90 max-w-2xl">
                  Explore individual MYP Mathematics questions, build precision with step-by-step solutions,
                  or generate an adaptive practice session of up to 50 questions tailored to your learning goals.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setGeneratorOpen(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/25 gap-2"
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  Generate Custom Session
                </Button>
              </div>
            </div>

            {/* Quick Strand Navigation Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-indigo-800/60">
              {STRANDS.map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedStrand(st === selectedStrand ? 'all' : st);
                    setPage(1);
                  }}
                  className={cn(
                    'flex flex-col p-3 rounded-xl border text-left transition-all',
                    selectedStrand === st
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Strand</span>
                  <span className="text-sm font-medium line-clamp-1 mt-0.5">{st}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content Navigation Tabs */}
        <section className="container max-w-7xl mx-auto px-4 mt-6">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'bank' | 'sessions')} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <TabsList className="bg-muted p-1 rounded-xl">
                <TabsTrigger value="bank" className="gap-2 px-4 py-2 font-medium">
                  <BookOpen className="w-4 h-4" />
                  Question Bank
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {totalQuestionsCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="sessions" className="gap-2 px-4 py-2 font-medium">
                  <Clock className="w-4 h-4" />
                  My Practice Sessions
                  {sessions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {sessions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {activeTab === 'bank' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Showing {displayedQuestions.length} of {totalQuestionsCount} approved questions</span>
                </div>
              )}
            </div>

            {/* TAB 1: QUESTION BANK CATALOG */}
            <TabsContent value="bank" className="mt-6 space-y-6">
              {/* Filter Toolbar */}
              <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative sm:col-span-2 lg:col-span-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search question / topic..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>

                    {/* Strand Filter */}
                    <Select
                      value={selectedStrand}
                      onValueChange={(val) => {
                        setSelectedStrand(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Strands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Strands</SelectItem>
                        {STRANDS.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* MYP Year Filter */}
                    <Select
                      value={selectedYear}
                      onValueChange={(val) => {
                        setSelectedYear(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years (1–5)</SelectItem>
                        {MYP_YEARS.map((yr) => (
                          <SelectItem key={yr} value={yr}>
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Difficulty Filter */}
                    <Select
                      value={selectedDifficulty}
                      onValueChange={(val) => {
                        setSelectedDifficulty(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Difficulties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Question Type Filter */}
                    <Select
                      value={selectedType}
                      onValueChange={(val) => {
                        setSelectedType(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secondary filter chips & Reset */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Attempt Status:</span>
                      <Button
                        variant={attemptFilter === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setAttemptFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={attemptFilter === 'unattempted' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setAttemptFilter('unattempted')}
                      >
                        Unattempted
                      </Button>
                      <Button
                        variant={attemptFilter === 'completed' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setAttemptFilter('completed')}
                      >
                        Solved / Attempted
                      </Button>
                    </div>

                    {(search || selectedStrand !== 'all' || selectedYear !== 'all' || selectedDifficulty !== 'all' || selectedType !== 'all' || attemptFilter !== 'all') && (
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Questions Grid */}
              {loadingQuestions ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-sm text-muted-foreground">Loading IB MYP Mathematics questions...</p>
                </div>
              ) : displayedQuestions.length === 0 ? (
                <Card className="text-center py-16 border-dashed">
                  <CardContent className="space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">No questions match your criteria</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        Try resetting filters or expanding your search terms to discover more questions.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Reset Filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedQuestions.map((q) => {
                    const attempt = attemptMap[q.id];
                    const isCompleted = attempt && (attempt.status === 'submitted' || attempt.status === 'evaluated');

                    return (
                      <Card
                        key={q.id}
                        className={cn(
                          'flex flex-col justify-between hover:shadow-md transition-all duration-200 border-border/80 group',
                          isCompleted && 'border-emerald-300/60 dark:border-emerald-800/40 bg-emerald-50/10'
                        )}
                      >
                        <CardHeader className="p-4 pb-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[11px] font-mono px-1.5 py-0">
                                {q.myp_year}
                              </Badge>
                              <Badge className={cn('text-[11px] capitalize border px-2 py-0', difficultyBadgeColors[q.difficulty] || difficultyBadgeColors.medium)}>
                                {q.difficulty}
                              </Badge>
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                              {q.strand}
                            </span>
                            <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {q.subtopic || q.topic}
                            </h3>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-between space-y-4">
                          <div className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2.5 rounded-lg border border-border/40 font-serif leading-relaxed">
                            {renderLatexContent(q.question_text || 'No question text provided.')}
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between gap-2">
                            {isCompleted ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Solved</span>
                              </div>
                            ) : attempt?.status === 'draft' ? (
                              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>In Progress</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Unattempted</span>
                              </div>
                            )}

                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => navigate(`/practice/question/${q.id}`)}
                            >
                              <span>{isCompleted ? 'Review' : 'Solve'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs gap-1"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: MY PRACTICE SESSIONS */}
            <TabsContent value="sessions" className="mt-6 space-y-4">
              {loadingSessions ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-sm text-muted-foreground">Loading your practice sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <Card className="text-center py-16 border-dashed">
                  <CardContent className="space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">No practice sessions created yet</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        Generate a custom session of up to 50 questions to target specific strands, years, and topics.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setGeneratorOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Generate Practice Session
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map((sess) => {
                    const percentComplete = sess.total_questions > 0
                      ? Math.round((sess.completed_questions / sess.total_questions) * 100)
                      : 0;

                    return (
                      <Card
                        key={sess.id}
                        className="hover:shadow-md transition-all duration-200 border-border/80 flex flex-col justify-between"
                      >
                        <CardHeader className="p-4 pb-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-medium px-2 py-0.5',
                                sess.is_completed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                              )}
                            >
                              {sess.is_completed ? 'Completed' : 'In Progress'}
                            </Badge>

                            {sess.score !== null && (
                              <span className="text-xs font-bold text-foreground font-mono">
                                Score: {Math.round(sess.score)}%
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-foreground line-clamp-1">
                            {sess.title || 'Practice Session'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Started on {new Date(sess.created_at).toLocaleDateString()}
                          </p>
                        </CardHeader>

                        <CardContent className="p-4 pt-2 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span className="font-mono font-medium">
                                {sess.completed_questions} / {sess.total_questions} questions ({percentComplete}%)
                              </span>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-300',
                                  sess.is_completed ? 'bg-emerald-500' : 'bg-indigo-600'
                                )}
                                style={{ width: `${percentComplete}%` }}
                              />
                            </div>
                          </div>

                          <Button
                            className="w-full h-8 text-xs font-medium gap-1.5"
                            variant={sess.is_completed ? 'outline' : 'default'}
                            onClick={() => navigate(`/practice/session/${sess.id}`)}
                          >
                            <span>{sess.is_completed ? 'Review Session' : 'Resume Session'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </main>

      {/* Generator Modal */}
      <PracticeSessionGeneratorModal
        isOpen={generatorOpen}
        onClose={() => {
          setGeneratorOpen(false);
          fetchSessions();
        }}
        initialFilters={{
          myp_year: selectedYear !== 'all' ? selectedYear : undefined,
          strand: selectedStrand !== 'all' ? selectedStrand : undefined,
          difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined
        }}
      />

      <GlobalChatbot subject="Mathematics" />
    </div>
  );
};

export default Practice;
