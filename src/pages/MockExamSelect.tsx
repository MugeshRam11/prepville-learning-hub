
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Sparkles, Play, GripVertical, MousePointer, Calculator, Grid3X3, Layers, Puzzle } from 'lucide-react';
import SubjectTestCard from '@/components/mock-exam/SubjectTestCard';
import { motion } from 'framer-motion';
import { loadPuzzleSampleTest } from '@/data/puzzleDragDropSampleTest';

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

  // Filter subjects
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

  const handleStartPuzzleDemo = () => {
    const sampleTest = loadPuzzleSampleTest();
    navigate('/mock-exams/unified', {
      state: {
        testId: sampleTest.testId,
        title: sampleTest.title,
        subject: sampleTest.subject,
        topic: sampleTest.topic,
        questions: sampleTest.questions
      }
    });
    toast.success('🧩 Puzzle Challenge loaded! Try the drag & drop questions.');
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

        {/* Unified Exam Section - RECOMMENDED */}
        <section className="py-8 border-b border-border bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        Unified Mock Exam
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">RECOMMENDED</Badge>
                      </h2>
                      <p className="text-muted-foreground">All questions on one scrollable page - IB exam style flow</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Interactive Feature highlights */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <Grid3X3 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <span className="text-sm font-medium block">Graph Plotting</span>
                        <span className="text-xs text-muted-foreground">Interactive diagrams</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/5 border border-teal-500/10">
                      <GripVertical className="w-5 h-5 text-teal-600" />
                      <div>
                        <span className="text-sm font-medium block">Drag & Drop</span>
                        <span className="text-xs text-muted-foreground">Match answers</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                      <MousePointer className="w-5 h-5 text-cyan-600" />
                      <div>
                        <span className="text-sm font-medium block">Image Zones</span>
                        <span className="text-xs text-muted-foreground">Click to answer</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <Calculator className="w-5 h-5 text-green-600" />
                      <div>
                        <span className="text-sm font-medium block">Smart Math</span>
                        <span className="text-xs text-muted-foreground">LaTeX equations</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                      <strong>Unified Interface</strong> • Supports all interactive answer blocks • Auto-detects question types
                    </div>
                    <Button 
                      size="lg"
                      onClick={() => navigate('/mock-exams/unified')}
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
                    >
                      <Play className="w-5 h-5" />
                      Start Unified Exam
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Puzzle Drag & Drop Challenge Section */}
        <section className="py-8 border-b border-border bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-yellow-500/5">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="overflow-hidden border-2 border-orange-500/30 bg-gradient-to-br from-card via-card to-orange-500/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                      <Puzzle className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        Puzzle Challenge
                        <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">NEW</Badge>
                      </h2>
                      <p className="text-muted-foreground">Interactive puzzle-style drag & drop matching questions</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Puzzle features */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                      <div className="w-4 h-4 rounded-full bg-orange-500" />
                      <span className="text-sm font-medium">Ratio Matching</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <div className="w-4 h-4 rounded-full bg-cyan-500" />
                      <span className="text-sm font-medium">Equation Graphs</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <div className="w-4 h-4 rounded-full bg-pink-500" />
                      <span className="text-sm font-medium">Probability</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">6:4</div>
                        <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">3:4</div>
                        <div className="w-8 h-8 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">4:3</div>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Interlocking puzzle pieces with glow effects & animations!
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                      <strong>6 Questions</strong> • <strong>25 marks</strong> • Ratios, Equations, Probability, Geometry
                    </div>
                    <Button 
                      size="lg"
                      onClick={handleStartPuzzleDemo}
                      className="gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-90"
                    >
                      <Puzzle className="w-5 h-5" />
                      Start Puzzle Challenge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-8 border-b border-border bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        Interactive Demo
                        <Badge variant="outline" className="text-xs">Try Interactive Types</Badge>
                      </h2>
                      <p className="text-muted-foreground text-sm">Experience all interactive question formats with sample data</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Demo features */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Grid3X3 className="w-3 h-3" />
                      Graph Canvas
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <GripVertical className="w-3 h-3" />
                      Drag-Drop Matcher
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <MousePointer className="w-3 h-3" />
                      Image Drop Zones
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Layers className="w-3 h-3" />
                      Step Builder
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Calculator className="w-3 h-3" />
                      Math Keyboard
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                      <strong>5 Sample Questions</strong> • <strong>20 marks</strong> • <strong>IB MYP Mathematics</strong>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/mock-exams/interactive-demo')}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Try Demo
                      </Button>
                      <Button 
                        onClick={() => navigate('/mock-exams/interactive')}
                        className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600"
                      >
                        <Sparkles className="w-4 h-4" />
                        Full Interactive Mode
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 border-b border-border bg-card/50">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
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
          </div>
        </section>

        {/* Subject Cards */}
        <section className="py-8">
          <div className="container">
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
