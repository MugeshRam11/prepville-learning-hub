
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import MockTestCard from '@/components/mock-exam/MockTestCard';

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
      
      console.log('Fetched mock tests:', data);
      console.log('Total published tests:', data?.length || 0);
      
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

  // Group tests by subject
  const testsBySubject = useMemo(() => {
    let filtered = mockTests;

    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.topic.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubject !== 'All Subjects') {
      const subjectValue = {
        'Mathematics': 'mathematics',
        'Science': 'science',
        'Physics': 'physics',
        'Chemistry': 'chemistry',
        'Biology': 'biology',
        'Language & Literature': 'language_literature',
        'Social Studies': 'social_studies'
      }[selectedSubject];
      
      if (subjectValue) {
        filtered = filtered.filter(test => test.subject === subjectValue);
      }
    }

    // Group by subject
    const grouped = filtered.reduce((acc, test) => {
      const subject = getSubjectLabel(test.subject);
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(test);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort subjects in specific order
    const subjectOrder = ['Mathematics', 'Science', 'Language & Literature', 'Social Studies', 'Physics', 'Chemistry', 'Biology'];
    const sortedGrouped: Record<string, any[]> = {};
    subjectOrder.forEach(subject => {
      if (grouped[subject] && grouped[subject].length > 0) {
        sortedGrouped[subject] = grouped[subject];
      }
    });

    return sortedGrouped;
  }, [mockTests, searchTerm, selectedSubject]);

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
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Mock Exam Selection
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose from our collection of comprehensive mock examinations to test your knowledge and improve your skills.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 border-b border-border bg-card/50">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by title or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Subjects">All Subjects</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Language & Literature">Language & Literature</SelectItem>
                  <SelectItem value="Social Studies">Social Studies</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Tests by Subject */}
        <section className="py-8">
          <div className="container">
            {Object.keys(testsBySubject).length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground text-lg">No published mock tests available.</p>
                <p className="text-sm text-muted-foreground">Tests must be published by an administrator to appear here.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(testsBySubject).map(([subject, tests]) => {
                  const subjectTests = tests as any[];
                  return (
                    <div key={subject} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                        <h2 className="text-2xl font-bold text-foreground">{subject}</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                        <span className="text-sm text-muted-foreground">{subjectTests.length} test{subjectTests.length !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjectTests.map((test) => (
                          <MockTestCard
                            key={test.id}
                            test={{
                              ...test,
                              subject: getSubjectLabel(test.subject)
                            }}
                            onStart={handleStartTest}
                            isAdmin={false}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MockExamSelect;
