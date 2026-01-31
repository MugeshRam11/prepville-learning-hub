import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';
import PracticeTestCard from '@/components/practice/PracticeTestCard';
import { motion } from 'framer-motion';

interface PracticeTest {
  id: string;
  title: string;
  description: string | null;
  total_questions: number | null;
  difficulty_level: string | null;
  time_limit_minutes: number | null;
}

const Practice = () => {
  const navigate = useNavigate();
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPracticeTests();

    // Real-time subscription for practice tests
    const channel = supabase.channel('practice_tests_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tests'
      }, () => {
        fetchPracticeTests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPracticeTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('id, title, description, total_questions, difficulty_level, time_limit_minutes')
        .eq('test_type', 'quick_test')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPracticeTests(data || []);
    } catch (error) {
      console.error('Error fetching practice tests:', error);
      toast.error('Failed to load practice tests');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = async (testId: string) => {
    try {
      // Find the test info
      const test = practiceTests.find(t => t.id === testId);
      
      // Fetch questions for this test
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId);

      if (error) throw error;

      if (!questions || questions.length === 0) {
        toast.error('No questions available for this test');
        return;
      }

      navigate('/practice/exam', {
        state: {
          testId,
          questions,
          title: test?.title || 'Practice Test'
        }
      });
    } catch (error) {
      console.error('Error loading practice test:', error);
      toast.error('Failed to load practice test');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-green-500/5">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-border">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Practice & Learn
              </h1>
              <p className="text-xl text-muted-foreground">
                No timer, no pressure. Learn at your own pace with our practice questions.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Practice Tests Grid */}
        <section className="py-8 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">Available Practice Tests</h2>
              <p className="text-muted-foreground">Select a test to start practicing</p>
            </motion.div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <span className="ml-2 text-muted-foreground">Loading practice tests...</span>
              </div>
            ) : practiceTests.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground text-lg">No practice tests available yet.</p>
                <p className="text-sm text-muted-foreground">
                  Tests must be created and activated by an administrator.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {practiceTests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <PracticeTestCard
                      id={test.id}
                      title={test.title}
                      description={test.description}
                      totalQuestions={test.total_questions || 0}
                      difficulty={test.difficulty_level}
                      timeLimitMinutes={test.time_limit_minutes}
                      onStart={handleStartPractice}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* Mock Exams CTA */}
        <section className="py-12 bg-background">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center max-w-2xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-center gap-2 text-primary">
                <Calendar className="w-6 h-6" />
                <span className="text-sm font-medium uppercase tracking-wide">Ready for a Challenge?</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Take a Full Mock Examination
              </h3>
              <p className="text-muted-foreground">
                Test yourself under real exam conditions with timed mock exams.
              </p>
              <Button
                size="lg"
                onClick={() => navigate('/mock-exams/select')}
                className="bg-primary hover:bg-primary/90"
              >
                Take Mock Exam
              </Button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Practice;
