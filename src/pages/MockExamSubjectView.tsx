import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Award, Image as ImageIcon, Sparkles } from 'lucide-react';

const MockExamSubjectView = () => {
  const {
    subject
  } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (subject) {
      fetchQuestions();
    }
  }, [subject]);
  const fetchQuestions = async () => {
    try {
      // Fetch all questions from mock_questions for this subject
      const {
        data: tests,
        error: testsError
      } = await supabase.from('mock_tests').select('id').eq('subject', subject as any).eq('is_published', true);
      if (testsError) throw testsError;
      if (!tests || tests.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }
      const testIds = tests.map(t => t.id);
      const {
        data,
        error
      } = await supabase.from('mock_questions').select(`
          *,
          mock_sub_questions (*)
        `).in('mock_test_id', testIds).order('question_number');
      if (error) throw error;
      console.log('Fetched questions for subject:', subject, data);
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };
  const getSubjectLabel = (subjectKey: string) => {
    const labels = {
      'mathematics': 'Mathematics',
      'science': 'Science',
      'language_literature': 'Language & Literature',
      'social_studies': 'Social Studies',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology'
    };
    return labels[subjectKey] || subjectKey;
  };
  const getTypeColor = (type: string) => {
    const colors = {
      'MCQ': 'bg-blue-500/10 text-blue-700 border-blue-200',
      'Numerical': 'bg-green-500/10 text-green-700 border-green-200',
      'Descriptive': 'bg-purple-500/10 text-purple-700 border-purple-200'
    };
    return colors[type] || 'bg-gray-500/10 text-gray-700 border-gray-200';
  };
  const handleStartTest = () => {
    navigate('/mock-exams/start', {
      state: {
        subject: getSubjectLabel(subject || ''),
        subjectKey: subject,
        title: getSubjectLabel(subject || ''),
        topic: getSubjectLabel(subject || ''),
        questions: questions
      }
    });
  };

  const handleStartInteractiveTest = () => {
    navigate('/mock-exams/interactive', {
      state: {
        subject: getSubjectLabel(subject || ''),
        subjectKey: subject,
        title: `Interactive ${getSubjectLabel(subject || '')} Test`,
        topic: getSubjectLabel(subject || ''),
        questions: questions
      }
    });
  };
  if (loading) {
    return <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
          <div className="text-lg">Loading questions...</div>
        </main>
        <Footer />
      </div>;
  }
  return <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <section className="py-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="container">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" onClick={() => navigate('/mock-exams/select')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Subjects
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {getSubjectLabel(subject || '')}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {questions.length} questions available
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleStartTest} size="lg" variant="outline" disabled={questions.length === 0}>
                  <FileText className="w-5 h-5 mr-2" />
                  Standard Test
                </Button>
                <Button 
                  onClick={handleStartInteractiveTest} 
                  size="lg" 
                  className="bg-gradient-to-r from-[#1e88e5] to-[#42a5f5] hover:opacity-90 gap-2" 
                  disabled={questions.length === 0}
                >
                  <Sparkles className="w-5 h-5" />
                  Interactive Test
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Questions List */}
        <section className="py-8">
          <div className="container max-w-4xl">
            {questions.length === 0 ? <div className="text-center py-12">
                <p className="text-muted-foreground">No questions available for this subject.</p>
              </div> : <div className="space-y-4">
                {questions.map((question, index) => <Card key={question.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-lg font-medium leading-relaxed">
                                {question.question_text}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Question Metadata */}
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getTypeColor(question.category || 'MCQ')}>
                            {question.category || 'MCQ'}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Award className="w-3 h-3" />
                            {question.marks} marks
                          </Badge>
                          {question.word_limit && <Badge variant="secondary">
                              Max {question.word_limit} words
                            </Badge>}
                        </div>


                        {/* Image Preview */}
                        {question.question_image_url && <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            <ImageIcon className="w-4 h-4" />
                            <span>Image: {question.question_image_url}</span>
                          </div>}
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </div>
        </section>
      </main>
      <Footer />
    </div>;
};
export default MockExamSubjectView;