
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuizFilters from '@/components/quiz/QuizFilters';
import QuizGrid from '@/components/quiz/QuizGrid';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const QuickPractice = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*, topics(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTests = data?.map(test => ({
        id: test.id,
        title: test.title,
        subject: test.test_type,
        topic: test.topics?.name || 'General',
        questions: test.total_questions,
        timeMinutes: test.time_limit_minutes || 30,
        difficulty: test.difficulty_level
      })) || [];

      setTests(formattedTests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to load tests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = selectedSubject === 'All Subjects' || test.subject === selectedSubject;
    
    return matchesSearch && matchesSubject;
  });

  const handleStartTest = (testId: string) => {
    navigate(`/quiz/${testId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Quick Practice Tests
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose from our collection of quick MCQ tests to practice specific topics and improve your skills.
              </p>
            </div>
          </div>
        </section>

        <QuizFilters
          searchTerm={searchTerm}
          selectedSubject={selectedSubject}
          onSearchChange={setSearchTerm}
          onSubjectChange={setSelectedSubject}
        />

        <QuizGrid
          tests={filteredTests}
          onStartTest={handleStartTest}
        />
      </main>
      <Footer />
    </div>
  );
};

export default QuickPractice;
