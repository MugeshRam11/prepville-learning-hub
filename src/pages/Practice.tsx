import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, Play, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MockTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  total_questions: number;
  time_limit_minutes: number | null;
}

const Practice = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available tests for practice
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { data, error } = await supabase
          .from('mock_tests')
          .select('id, title, subject, topic, total_questions, time_limit_minutes')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        setTests(data || []);
      } catch (error) {
        console.error('Error fetching tests:', error);
        toast.error('Failed to load practice tests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleStartPractice = (test: MockTest) => {
    navigate('/practice/exam', {
      state: {
        testId: test.id,
        title: test.title,
        subject: test.subject,
        topic: test.topic
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Practice & Learn
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose your learning path: explore subjects at your own pace or test yourself with timed mock exams.
              </p>
            </div>
          </div>
        </section>

        {/* Practice Options - Two clear paths */}
        <section className="py-16 bg-white dark:bg-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Study & Learn Card */}
              <Card className="text-center hover:shadow-lg transition-shadow border-2 hover:border-green-200 dark:hover:border-green-800">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl">Study & Learn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Explore subjects, practice questions with explanations and hints. Learn at your own pace with no time pressure.
                  </p>
                  <ul className="text-sm text-left text-muted-foreground space-y-2 px-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Step-by-step solutions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Hints and explanations
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      No timer or pressure
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    size="lg"
                    onClick={() => navigate('/subjects')}
                  >
                    Browse Subjects
                  </Button>
                </CardContent>
              </Card>

              {/* Mock Exams Card */}
              <Card className="text-center hover:shadow-lg transition-shadow border-2 hover:border-purple-200 dark:hover:border-purple-800">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl">Mock Exams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Timed exam simulations under real conditions. Evaluate your knowledge and get ready for the actual exam.
                  </p>
                  <ul className="text-sm text-left text-muted-foreground space-y-2 px-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Timed assessment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Real exam conditions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Score and feedback after submission
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    size="lg"
                    onClick={() => navigate('/mock-exams/select')}
                  >
                    Take Mock Exam
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Available Practice Tests */}
        {tests.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="container">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-4">Start Practice Session</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Jump into a practice session with these available tests. No timer, unlimited retries.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {tests.map((test) => (
                    <Card 
                      key={test.id} 
                      className="hover:shadow-lg transition-all hover:border-green-200 dark:hover:border-green-800 cursor-pointer group"
                      onClick={() => handleStartPractice(test)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline" className="text-xs">
                            {test.subject}
                          </Badge>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            Practice
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mt-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {test.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <span>{test.total_questions} questions</span>
                          <span>{test.topic}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 group-hover:bg-green-50 group-hover:border-green-300 dark:group-hover:bg-green-950/30"
                        >
                          <Play className="w-4 h-4" />
                          Start Practice
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Practice;
