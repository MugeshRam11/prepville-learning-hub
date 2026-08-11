import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import GlobalChatbot from '@/components/GlobalChatbot';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, BookOpen, Play, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PracticeSetDisplay {
  id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: string;
  sub_question_count: number;
  total_marks: number;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const Practice = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState<PracticeSetDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    fetchPracticeSets();
  }, []);

  const fetchPracticeSets = async () => {
    try {
      const { data: rawSets, error } = await supabase
        .from('practice_sets')
        .select('id, title, subject, topic, difficulty')
        .eq('is_published', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const enriched: PracticeSetDisplay[] = await Promise.all(
        (rawSets || []).map(async (ps: any) => {
          const { data: qs } = await supabase
            .from('practice_questions')
            .select('id')
            .eq('practice_set_id', ps.id);
          const qIds = (qs || []).map((q: any) => q.id);
          let subCount = 0;
          let totalMarks = 0;
          if (qIds.length > 0) {
            const { data: sqs } = await supabase
              .from('practice_sub_questions')
              .select('id, marks')
              .in('question_id', qIds);
            subCount = sqs?.length || 0;
            totalMarks = (sqs || []).reduce((s: number, sq: any) => s + (sq.marks || 0), 0);
          }
          return { ...ps, sub_question_count: subCount, total_marks: totalMarks };
        })
      );

      setSets(enriched);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load practice sets');
    } finally {
      setLoading(false);
    }
  };

  const topics = useMemo(() => [...new Set(sets.map(s => s.topic))].sort(), [sets]);

  const filtered = useMemo(() => {
    return sets.filter(s => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.topic.toLowerCase().includes(search.toLowerCase())) return false;
      if (topicFilter !== 'all' && s.topic !== topicFilter) return false;
      if (difficultyFilter !== 'all' && s.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [sets, search, topicFilter, difficultyFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-green-500/5">
        {/* Hero */}
        <section className="py-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-border">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Practice & Learn
                </h1>
                <p className="text-muted-foreground mt-1">
                  Master concepts at your own pace. Toggle between Study and Exam modes.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-card px-4 py-3 rounded-xl shadow-sm border">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{sets.length}</div>
                  <div className="text-xs text-muted-foreground">Practice Sets</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-4 border-b border-border bg-background">
          <div className="container flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Search by title or topic..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Topics" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} of {sets.length} sets
            </span>
          </div>
        </section>

        {/* Practice Sets Grid */}
        <section className="py-6">
          <div className="container">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <span className="ml-2 text-muted-foreground">Loading practice sets...</span>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg">No practice sets found.</p>
                <p className="text-sm text-muted-foreground">
                  {sets.length > 0 ? 'Try adjusting your filters.' : 'Practice sets will appear here once added by administrators.'}
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((ps, i) => (
                  <motion.div key={ps.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-border"
                      onClick={() => navigate(`/practice/set/${ps.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="outline" className="text-xs capitalize">{ps.subject.replace('_', ' ')}</Badge>
                          <Badge className={cn("text-xs capitalize", difficultyColors[ps.difficulty] || difficultyColors.medium)}>
                            {ps.difficulty}
                          </Badge>
                        </div>

                        <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {ps.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">{ps.topic}</p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pt-3 border-t border-border">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {ps.sub_question_count} parts
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            {ps.total_marks} marks
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/practice/set/${ps.id}`);
                          }}
                        >
                          <Play className="w-4 h-4" /> Start Practice
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <GlobalChatbot subject="Mathematics" />
    </div>
  );
};

export default Practice;
