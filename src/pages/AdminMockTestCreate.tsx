import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, Database as DatabaseIcon, ChevronDown, Wand2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import QuestionBuilder from '@/components/admin/QuestionBuilder';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import QuestionBankSelector from '@/components/admin/QuestionBankSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';

type TestSubject = Database['public']['Enums']['test_subject'];

const AdminMockTestCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testInfo, setTestInfo] = useState<{
    title: string;
    subject: TestSubject | '';
    topic: string;
  }>({
    title: '',
    subject: '',
    topic: ''
  });
  const [questions, setQuestions] = useState([]);
  const [showAIParser, setShowAIParser] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  
  // Silent training ZIP - backend only, no UI feedback
  const [trainingZipFile, setTrainingZipFile] = useState<File | null>(null);

  const handleLoadSample = (sampleData: any) => {
    setTestInfo({
      title: sampleData.title,
      subject: sampleData.subject,
      topic: sampleData.topic
    });
    
    const transformedQuestions = sampleData.questions.map((q: any) => ({
      id: Date.now() + q.id,
      question_number: q.question_number,
      question_text: q.question_text,
      question_image_url: q.question_image_url || '',
      has_sub_questions: q.has_sub_questions,
      marks: q.marks,
      answer_key: q.answer_key || '',
      word_limit: q.word_limit?.toString() || '',
      difficulty: q.difficulty,
      category: q.category || '',
      sub_questions: q.sub_questions?.map((sq: any) => ({
        id: Date.now() + Math.random(),
        sub_question_label: sq.sub_question_label,
        sub_question_text: sq.sub_question_text,
        sub_question_image_url: sq.sub_question_image_url || '',
        marks: sq.marks,
        answer_key: sq.answer_key || '',
        word_limit: sq.word_limit?.toString() || ''
      })) || []
    }));
    
    setQuestions(transformedQuestions);
    toast.success('Test loaded successfully!');
  };

  const handleWordTestParsed = (testData: any) => {
    // Update test info
    setTestInfo({
      title: testData.title,
      subject: testData.subject as TestSubject,
      topic: testData.topic
    });

    // Transform questions to match the expected format
    const transformedQuestions = testData.questions.map((q: any, index: number) => ({
      id: Date.now() + index,
      question_number: index + 1,
      question_text: q.question_text,
      question_image_url: q.question_image_url || '',
      has_sub_questions: q.has_sub_questions || false,
      marks: q.marks || 1,
      answer_key: q.answer_key || '',
      word_limit: q.word_limit?.toString() || '',
      difficulty: q.difficulty || 'medium',
      category: q.category || '',
      diagram_description: q.diagram_description || '',
      sub_questions: q.sub_questions || []
    }));

    setQuestions(transformedQuestions);
  };

  const handleSave = async (publish = false) => {
    // Validation
    if (!testInfo.title.trim()) {
      toast.error('Please enter a test title');
      return;
    }
    if (!testInfo.subject) {
      toast.error('Please select a subject');
      return;
    }
    if (!testInfo.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question_text.trim()) {
        toast.error(`Question ${question.question_number} is missing question text`);
        return;
      }
      if (question.has_sub_questions) {
        for (const subQ of question.sub_questions) {
          if (!subQ.sub_question_text.trim()) {
            toast.error(`Sub-question ${question.question_number}${subQ.sub_question_label} is missing text`);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      // Silent ZIP upload (if provided) - no UI feedback per PRD
      let zipPath: string | null = null;
      if (trainingZipFile) {
        const zipFileName = `${Date.now()}_${trainingZipFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('training-zips')
          .upload(zipFileName, trainingZipFile);
        if (!uploadError) {
          zipPath = zipFileName;
        }
        // Errors logged server-side only, never blocks exam creation
      }

      // Create the mock test
      const { data: mockTest, error: testError } = await supabase
        .from('mock_tests')
        .insert({
          title: testInfo.title,
          subject: testInfo.subject as TestSubject,
          topic: testInfo.topic,
          is_published: publish,
          training_zip_path: zipPath,
          training_zip_uploaded_at: zipPath ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create questions
      for (const question of questions) {
        const { data: createdQuestion, error: questionError } = await supabase
          .from('mock_questions')
          .insert({
            mock_test_id: mockTest.id,
            question_number: question.question_number,
            question_text: question.question_text,
            question_image_url: question.question_image_url || null,
            has_sub_questions: question.has_sub_questions,
            marks: question.marks,
            answer_key: question.answer_key || null,
            word_limit: question.word_limit ? parseInt(question.word_limit) : null,
            difficulty: question.difficulty,
            category: question.category || null,
            diagram_description: question.diagram_description || null
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Create sub-questions if any
        if (question.has_sub_questions && question.sub_questions.length > 0) {
          const subQuestionsToInsert = question.sub_questions.map(subQ => ({
            question_id: createdQuestion.id,
            sub_question_label: subQ.sub_question_label,
            sub_question_text: subQ.sub_question_text,
            sub_question_image_url: subQ.sub_question_image_url || null,
            marks: subQ.marks,
            answer_key: subQ.answer_key || null,
            word_limit: subQ.word_limit ? parseInt(subQ.word_limit) : null
          }));

          const { error: subQuestionError } = await supabase
            .from('mock_sub_questions')
            .insert(subQuestionsToInsert);

          if (subQuestionError) throw subQuestionError;
        }
      }

      toast.success(`Mock test ${publish ? 'created and published' : 'saved as draft'} successfully!`);
      navigate('/admin/mock-tests');
    } catch (error) {
      console.error('Error creating mock test:', error);
      toast.error('Failed to create mock test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/admin/mock-tests')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Mock Tests
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Mock Test</h1>
                <p className="text-gray-600">Design and upload a comprehensive mock examination</p>
              </div>
            </div>
          </div>


          {/* Test Information */}
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Test Title *</label>
                <Input
                  value={testInfo.title}
                  onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                  placeholder="e.g., Mathematics Mock Test - Algebra Fundamentals"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <Select
                    value={testInfo.subject}
                    onValueChange={(value: TestSubject) => setTestInfo({ ...testInfo, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="language_literature">Language & Literature</SelectItem>
                      <SelectItem value="social_studies">Social Studies</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Topic *</label>
                  <Input
                    value={testInfo.topic}
                    onChange={(e) => setTestInfo({ ...testInfo, topic: e.target.value })}
                    placeholder="e.g., Algebra, Force & Motion, etc."
                  />
                </div>
              </div>

              {/* Silent training ZIP upload - minimal visibility per PRD */}
              <div className="pt-4 border-t">
                <label className="block text-sm text-muted-foreground mb-2">
                  Training Reference (Optional)
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setTrainingZipFile(e.target.files?.[0] || null)}
                  className="text-sm text-muted-foreground file:mr-2 file:py-1 file:px-3 file:border file:border-input file:rounded file:text-xs file:bg-background hover:file:bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Question Builder */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Question Builder</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowAIParser(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        AI Upload (PDF, Word, CSV, Images)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    onClick={() => setShowQuestionBank(true)}
                    className="flex items-center gap-2"
                  >
                    <DatabaseIcon className="w-4 h-4" />
                    Load from Bank
                  </Button>
                  {questions.length > 0 && (
                    <Button
                      variant="default"
                      onClick={() => {
                        // Store questions in sessionStorage for the exam builder
                        const examBuilderData = {
                          examName: testInfo.title || 'Untitled Exam',
                          subject: testInfo.subject,
                          topic: testInfo.topic,
                          questions: questions.map((q: any, idx: number) => ({
                            id: `imported-${idx}-${Date.now()}`,
                            title: `Question ${q.question_number}`,
                            instructions: q.question_text,
                            marks: q.marks || 1,
                            commandTerm: q.command_term || '',
                            components: q.has_sub_questions && q.sub_questions?.length > 0
                              ? q.sub_questions.map((sq: any, sIdx: number) => ({
                                  id: `comp-${idx}-${sIdx}-${Date.now()}`,
                                  type: 'free_response',
                                  label: `Part ${sq.sub_question_label}`,
                                  content: sq.sub_question_text,
                                  marks: sq.marks || 1,
                                  settings: {}
                                }))
                              : [{
                                  id: `comp-${idx}-0-${Date.now()}`,
                                  type: 'free_response',
                                  label: 'Answer',
                                  content: '',
                                  marks: q.marks || 1,
                                  settings: {}
                                }]
                          }))
                        };
                        sessionStorage.setItem('examBuilderImport', JSON.stringify(examBuilderData));
                        navigate('/admin/exam-builder');
                        toast.success('Questions loaded into Interactive Exam Builder!');
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80"
                    >
                      <Wand2 className="w-4 h-4" />
                      Open in Exam Builder
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <QuestionBuilder questions={questions} setQuestions={setQuestions} />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pb-8">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Publishing...' : 'Publish Test'}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Parser Modal */}
      <Dialog open={showAIParser} onOpenChange={setShowAIParser}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Document Parser - Multi-Format Upload</DialogTitle>
            <DialogDescription>
              Upload PDF, Word, CSV, or images. Choose from Parse, Summarize, Quiz Generation, or Data Extraction actions.
            </DialogDescription>
          </DialogHeader>
          <QuestionUploadCard 
            mode="mock"
            onSuccess={(data) => {
              if (data.mockTest) {
                // Navigate to edit the created test
                toast.success('Mock test created! Redirecting to view...');
                setTimeout(() => {
                  navigate(`/admin/mock-tests/edit/${data.mockTest.id}`);
                }, 1500);
              }
              setShowAIParser(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Question Bank Selector */}
      <QuestionBankSelector
        open={showQuestionBank}
        onClose={() => setShowQuestionBank(false)}
        onSelectQuestions={(selectedQuestions) => {
          setQuestions([...questions, ...selectedQuestions]);
        }}
        currentSubject={testInfo.subject as string}
        currentTopic={testInfo.topic}
      />
    </div>
  );
};

export default AdminMockTestCreate;
