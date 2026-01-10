import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import QuestionPreviewEditor from '@/components/admin/QuestionPreviewEditor';
import { 
  Database, 
  FileUp, 
  Sparkles, 
  Save, 
  BookOpen, 
  Layers, 
  CheckCircle2,
  Grid3X3,
  ImageIcon,
  Calculator
} from 'lucide-react';

const AdminQuestionGenerator = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [targetBank, setTargetBank] = useState<'mock' | 'quick'>('mock');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState({
    subject: 'mathematics',
    topic: 'General',
    difficulty: 'medium'
  });

  // Save questions to question bank
  const handleSaveToBank = async (questions: any[]) => {
    if (questions.length === 0) {
      toast.error('No questions to save');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const validSubjects = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'];
      const subject = validSubjects.includes(metadata.subject) ? metadata.subject : 'mathematics';

      // Save to mock_test_question_bank
      for (const q of questions) {
        const { data: savedQuestion, error } = await supabase
          .from('mock_test_question_bank')
          .insert({
            question_number: q.question_number || 1,
            question_text: q.question_text,
            question_image_url: q.question_image_url || null,
            marks: q.marks || 1,
            has_sub_questions: q.has_sub_questions || false,
            subject: subject as any,
            topic: metadata.topic || 'General',
            difficulty: q.difficulty || metadata.difficulty || 'medium',
            category: q.category || null,
            command_term: q.command_term || null,
            answer_key: q.answer_key || q.correct_answer || '',
            diagram_description: q.diagram_description || null,
            answer_block_type: q.answer_block_type || 'text_equation',
            answer_block_config: q.answer_block_config ? JSON.stringify(q.answer_block_config) : null,
            created_by: user.id,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        // Save sub-questions if present
        if (q.sub_questions && q.sub_questions.length > 0 && savedQuestion) {
          const subQuestions = q.sub_questions.map((sq: any) => ({
            question_bank_id: savedQuestion.id,
            sub_question_label: sq.label || sq.sub_question_label,
            sub_question_text: sq.text || sq.sub_question_text,
            marks: sq.marks || 1,
            command_term: sq.command_term || null,
            answer_key: sq.answer || sq.answer_key || '',
            answer_block_type: sq.answer_block_type || 'text_equation',
            answer_block_config: sq.answer_block_config ? JSON.stringify(sq.answer_block_config) : null
          }));

          const { error: subError } = await supabase
            .from('mock_test_sub_question_bank')
            .insert(subQuestions);

          if (subError) throw subError;
        }
      }

      toast.success(`✅ Saved ${questions.length} questions to Question Bank!`, {
        description: 'Questions are now available for use in Mock Tests and Quick Tests'
      });
      
      setGeneratedQuestions([]);
      setShowPreview(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save questions', { description: error?.message });
    } finally {
      setSaving(false);
    }
  };

  // Handle parsed questions from uploader
  const handleQuestionsParsed = (data: any) => {
    const questions = data?.questions || data?.data?.questions || [];
    if (questions.length > 0) {
      setGeneratedQuestions(questions);
      setShowPreview(true);
      toast.success(`${questions.length} questions parsed!`, {
        description: 'Review and save to Question Bank'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar activeTab="question-generator" onTabChange={() => {}} />
      
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Database className="w-6 h-6" />
                </div>
                Question Generator
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload PDFs to extract questions and save to your reusable Question Bank
              </p>
            </div>
            
            {generatedQuestions.length > 0 && (
              <Button 
                onClick={() => handleSaveToBank(generatedQuestions)}
                disabled={saving}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : `Save ${generatedQuestions.length} to Bank`}
              </Button>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Vision Parser</h3>
                  <p className="text-sm text-muted-foreground">GPT-4o extracts questions, diagrams & bounding boxes</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Grid3X3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Interactive Types</h3>
                  <p className="text-sm text-muted-foreground">Graph, drag-drop, image zones, math input</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-violet-500/5 to-violet-500/10 border-violet-500/20">
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Database className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Question Bank</h3>
                  <p className="text-sm text-muted-foreground">Reuse questions across Mock Tests & Quick Tests</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <FileUp className="w-4 h-4" />
                Upload & Parse
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Question Bank
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              {/* Metadata Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Question Settings</CardTitle>
                  <CardDescription>Default settings for extracted questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select 
                        value={metadata.subject} 
                        onValueChange={(v) => setMetadata(m => ({ ...m, subject: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mathematics">Mathematics</SelectItem>
                          <SelectItem value="science">Science</SelectItem>
                          <SelectItem value="physics">Physics</SelectItem>
                          <SelectItem value="chemistry">Chemistry</SelectItem>
                          <SelectItem value="biology">Biology</SelectItem>
                          <SelectItem value="language_literature">Language & Literature</SelectItem>
                          <SelectItem value="social_studies">Social Studies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Topic</Label>
                      <Input 
                        value={metadata.topic}
                        onChange={(e) => setMetadata(m => ({ ...m, topic: e.target.value }))}
                        placeholder="e.g., Algebra, Geometry"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Default Difficulty</Label>
                      <Select 
                        value={metadata.difficulty} 
                        onValueChange={(v) => setMetadata(m => ({ ...m, difficulty: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Card */}
              <QuestionUploadCard 
                mode="mock" 
                onSuccess={handleQuestionsParsed}
              />

              {/* Generated Questions Preview */}
              {generatedQuestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Extracted Questions ({generatedQuestions.length})
                    </CardTitle>
                    <CardDescription>
                      Review questions before saving to Question Bank
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {generatedQuestions.map((q, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 rounded-lg border bg-muted/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Q{q.question_number || idx + 1}</Badge>
                              <Badge className="bg-primary/10 text-primary">{q.marks || 1} marks</Badge>
                              {q.graph_found && (
                                <Badge className="bg-blue-500/10 text-blue-600">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  Has Diagram
                                </Badge>
                              )}
                              {q.answer_block_type && q.answer_block_type !== 'text_equation' && (
                                <Badge className="bg-violet-500/10 text-violet-600">
                                  <Calculator className="w-3 h-3 mr-1" />
                                  {q.answer_block_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm line-clamp-2">
                            {q.question_text}
                          </p>
                          {q.sub_questions?.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {q.sub_questions.length} sub-question(s)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={() => handleSaveToBank(generatedQuestions)}
                        disabled={saving}
                        className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save All to Question Bank'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bank">
              <QuestionBankViewer />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Question Bank Viewer Component
const QuestionBankViewer = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: 'all', search: '' });

  React.useEffect(() => {
    fetchQuestions();
  }, [filter.subject]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('mock_test_question_bank')
        .select(`
          *,
          mock_test_sub_question_bank (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter.subject !== 'all') {
        const validSubjects = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'] as const;
        type SubjectType = typeof validSubjects[number];
        if (validSubjects.includes(filter.subject as SubjectType)) {
          query = query.eq('subject', filter.subject as SubjectType);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter.search) {
      return q.question_text.toLowerCase().includes(filter.search.toLowerCase()) ||
             q.topic?.toLowerCase().includes(filter.search.toLowerCase());
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Question Bank
        </CardTitle>
        <CardDescription>
          {questions.length} questions available for use in tests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input 
              placeholder="Search questions..."
              value={filter.search}
              onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <Select 
            value={filter.subject} 
            onValueChange={(v) => setFilter(f => ({ ...f, subject: v }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="mathematics">Mathematics</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="physics">Physics</SelectItem>
              <SelectItem value="chemistry">Chemistry</SelectItem>
              <SelectItem value="biology">Biology</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No questions in bank yet</p>
            <p className="text-sm">Upload a PDF to generate questions</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredQuestions.map((q) => (
              <div 
                key={q.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{q.subject}</Badge>
                      <Badge className="bg-muted">{q.topic}</Badge>
                      <Badge variant="secondary">{q.difficulty}</Badge>
                      <Badge className="bg-primary/10 text-primary">{q.marks} marks</Badge>
                    </div>
                    <p className="text-sm line-clamp-2">{q.question_text}</p>
                    {q.mock_test_sub_question_bank?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {q.mock_test_sub_question_bank.length} sub-question(s)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminQuestionGenerator;
