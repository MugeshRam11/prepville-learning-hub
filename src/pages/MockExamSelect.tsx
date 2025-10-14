
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, FileText, Award } from 'lucide-react';

const MockExamSelect = () => {
  const navigate = useNavigate();
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectStats();
  }, []);

  const fetchSubjectStats = async () => {
    try {
      // Get all published tests with their topics
      const { data: tests, error } = await supabase
        .from('mock_tests')
        .select('id, subject, title, topic, total_questions')
        .eq('is_published', true);

      if (error) throw error;

      // Map tests to display format
      const testsList = tests.map(test => ({
        id: test.id,
        subject: test.subject,
        title: test.title,
        topic: test.topic,
        totalQuestions: test.total_questions || 0
      }));

      setSubjectStats(testsList);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to load tests');
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

  // Filter tests
  const filteredSubjects = useMemo(() => {
    let filtered = subjectStats;

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
        filtered = filtered.filter(stat => stat.subject === subjectValue);
      }
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(stat =>
        getSubjectLabel(stat.subject).toLowerCase().includes(query) ||
        stat.title?.toLowerCase().includes(query) ||
        stat.topic?.toLowerCase().includes(query)
      );
    }

    // Sort by subject then title
    const subjectOrder = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'];
    return filtered.sort((a, b) => {
      const indexA = subjectOrder.indexOf(a.subject);
      const indexB = subjectOrder.indexOf(b.subject);
      const subjectComparison = (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      if (subjectComparison !== 0) return subjectComparison;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [subjectStats, searchTerm, selectedSubject]);

  const handleStartTest = (testId: string) => {
    navigate(`/mock-exams/start/${testId}`);
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
                Mock Tests
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose from available mock tests to practice and improve your skills.
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
                  placeholder="Search tests by subject, title, or topic..."
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

        {/* Test Cards */}
        <section className="py-8">
          <div className="container">
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground text-lg">No tests available.</p>
                <p className="text-sm text-muted-foreground">Tests must be published by an administrator to appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((test) => (
                  <Card key={test.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <Badge variant="secondary" className="mb-2">
                            {getSubjectLabel(test.subject)}
                          </Badge>
                          <h3 className="text-xl font-bold">{test.title}</h3>
                          {test.topic && (
                            <p className="text-sm text-muted-foreground mt-1">{test.topic}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{test.totalQuestions} questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            <span>{Math.ceil(test.totalQuestions * 1.5)} minutes</span>
                          </div>
                        </div>

                        <Button 
                          onClick={() => handleStartTest(test.id)}
                          className="w-full"
                        >
                          Start Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
