
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuizFilters from '@/components/quiz/QuizFilters';
import QuizGrid from '@/components/quiz/QuizGrid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MockExamSelect = () => {
  const navigate = useNavigate();
  const [mockTests, setMockTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTests();
  }, []);

  const fetchMockTests = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('is_published', true)
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

  const getSubjectLabel = (subject) => {
    const labels = {
      'mathematics': 'Mathematics',
      'science': 'Science', 
      'language_literature': 'Language & Literature',
      'social_studies': 'Social Studies',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology'
    };
    return labels[subject] || subject;
  };

  // Transform mock tests to match QuizGrid format
  const formattedTests = mockTests.map(test => ({
    id: test.id,
    title: test.title,
    subject: getSubjectLabel(test.subject),
    topic: test.topic,
    questions: test.total_questions || 0,
    timeMinutes: 0,
    difficulty: 'Medium'
  }));

  const filteredTests = formattedTests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = selectedSubject === 'All Subjects' || test.subject === selectedSubject;
    
    return matchesSearch && matchesSubject;
  });

  const handleStartTest = (testId: string) => {
    const test = mockTests.find(t => t.id === testId);
    if (test) {
      navigate('/mock-exams/start', { 
        state: { 
          testId: test.id,
          subject: getSubjectLabel(test.subject), 
          topic: test.topic,
          title: test.title
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
          <div className="text-lg">Loading mock tests...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Mock Exam Selection
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose from our collection of comprehensive mock examinations to test your knowledge and improve your skills.
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

export default MockExamSelect;
