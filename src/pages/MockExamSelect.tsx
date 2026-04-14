import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';
import MockTestListCard from '@/components/mock-exam/MockTestListCard';
import { motion } from 'framer-motion';
import TopicHierarchyFilter, { type TopicFilterState } from '@/components/TopicHierarchyFilter';
import { SUBJECT_DB_TO_DISPLAY } from '@/data/topicTree';

interface MockTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  total_questions: number;
  time_limit_minutes: number | null;
  is_published: boolean;
  created_at: string;
}

const MockExamSelect = () => {
  const navigate = useNavigate();
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState<TopicFilterState>({
    subject: '', unit: '', topic: '', subtopic: '', pathway: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTests();

    const channel = supabase.channel('mock_tests_select').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'mock_tests'
    }, () => fetchMockTests()).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMockTests = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, subject, topic, total_questions, time_limit_minutes, is_published, created_at')
        .eq('is_published', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMockTests(data || []);
    } catch (error) {
      console.error('Error fetching mock tests:', error);
      toast.error('Failed to load mock tests');
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = useMemo(() => {
    let filtered = mockTests;

    if (topicFilter.subject) {
      const dbSubject = topicFilter.subject;
      filtered = filtered.filter(t => t.subject === dbSubject);
    }

    if (topicFilter.topic) {
      const q = topicFilter.topic.toLowerCase();
      filtered = filtered.filter(t => t.topic.toLowerCase().includes(q));
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [mockTests, searchTerm, topicFilter]);

  const handleStartTest = (testId: string) => {
    navigate(`/mock-exams/unified?testId=${testId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading mock tests...</span>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero */}
        <section className="py-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Mock Examinations
              </h1>
              <p className="text-xl text-muted-foreground">
                Select a test to start your timed exam experience
              </p>
            </motion.div>
          </div>
        </section>

        {/* Test list */}
        <section className="py-8 bg-muted/30">
          <div className="container">
            {/* Filters */}
            <div className="flex flex-col gap-4 max-w-4xl mx-auto mb-8">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <TopicHierarchyFilter
                value={topicFilter}
                onChange={setTopicFilter}
                useDbKeys
                variant="chips"
              />
            </div>

            {/* Cards */}
            {filteredTests.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground text-lg">No mock tests available.</p>
                <p className="text-sm text-muted-foreground">
                  Tests must be published by an administrator to appear here.
                </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredTests.map((test, i) => (
                  <motion.div key={test.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                    <MockTestListCard
                      id={test.id}
                      title={test.title}
                      subject={test.subject}
                      topic={test.topic}
                      totalQuestions={test.total_questions}
                      timeLimitMinutes={test.time_limit_minutes ?? 120}
                      onStart={handleStartTest}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MockExamSelect;
