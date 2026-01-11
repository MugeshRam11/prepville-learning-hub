import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import SubjectTestCard from '@/components/mock-exam/SubjectTestCard';
import { motion } from 'framer-motion';

// Import the new exam mode cards
import UnifiedExamCard from '@/components/exam-select/UnifiedExamCard';
import PuzzleChallengeCard from '@/components/exam-select/PuzzleChallengeCard';
import InteractiveDemoCard from '@/components/exam-select/InteractiveDemoCard';

const MockExamSelect = () => {
  const navigate = useNavigate();
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectStats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('mock_tests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mock_tests'
        },
        () => {
          fetchSubjectStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSubjectStats = async () => {
    try {
      // Get aggregated stats per subject
      const { data: tests, error } = await supabase
        .from('mock_tests')
        .select('subject, total_questions')
        .eq('is_published', true);

      if (error) throw error;

      // Aggregate by subject
      const statsMap = tests.reduce((acc, test) => {
        if (!acc[test.subject]) {
          acc[test.subject] = {
            subject: test.subject,
            totalQuestions: 0,
            totalTests: 0
          };
        }
        acc[test.subject].totalQuestions += test.total_questions || 0;
        acc[test.subject].totalTests += 1;
        return acc;
      }, {} as Record<string, any>);

      setSubjectStats(Object.values(statsMap));
    } catch (error) {
      console.error('Error fetching subject stats:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectLabel = (subject: string) => {
    const labels: Record<string, string> = {
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

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    let filtered = subjectStats;

    if (selectedSubject !== 'All Subjects') {
      const subjectValue: Record<string, string> = {
        'Mathematics': 'mathematics',
        'Science': 'science',
        'Physics': 'physics',
        'Chemistry': 'chemistry',
        'Biology': 'biology',
        'Language & Literature': 'language_literature',
        'Social Studies': 'social_studies'
      };
      
      const val = subjectValue[selectedSubject];
      if (val) {
        filtered = filtered.filter(stat => stat.subject === val);
      }
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(stat =>
        getSubjectLabel(stat.subject).toLowerCase().includes(query)
      );
    }

    // Sort subjects in specific order
    const subjectOrder = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'];
    return filtered.sort((a, b) => {
      const indexA = subjectOrder.indexOf(a.subject);
      const indexB = subjectOrder.indexOf(b.subject);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }, [subjectStats, searchTerm, selectedSubject]);

  const handleStartSubject = (subjectKey: string) => {
    navigate(`/mock-exams/subject/${subjectKey}`);
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Unified Testing System
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose your exam mode. Auto-detect question types. Experience intelligent interactive testing.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Exam Mode Cards Section */}
        <section className="py-8 space-y-6">
          <div className="container max-w-4xl mx-auto space-y-6">
            {/* Card 1 - Unified Mock Exam (Recommended) */}
            <div className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 rounded-2xl p-6">
              <UnifiedExamCard />
            </div>

            {/* Card 2 - Puzzle Challenge (New) */}
            <div className="bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-yellow-500/5 rounded-2xl p-6">
              <PuzzleChallengeCard />
            </div>

            {/* Card 3 - Interactive Demo */}
            <div className="bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl p-6">
              <InteractiveDemoCard />
            </div>
          </div>
        </section>

        {/* Subject Browser Section */}
        <section className="py-8 border-t border-border bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">Browse by Subject</h2>
              <p className="text-muted-foreground">Select a subject to view available mock tests</p>
            </motion.div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search subjects..."
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

            {/* Subject Cards */}
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground text-lg">No subjects available.</p>
                <p className="text-sm text-muted-foreground">Tests must be published by an administrator to appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((stat) => (
                  <SubjectTestCard
                    key={stat.subject}
                    subject={getSubjectLabel(stat.subject)}
                    subjectKey={stat.subject}
                    totalQuestions={stat.totalQuestions}
                    totalTests={stat.totalTests}
                    onStart={handleStartSubject}
                  />
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
