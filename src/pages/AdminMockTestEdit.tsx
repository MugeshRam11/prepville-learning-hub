
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import QuestionBuilder from '@/components/admin/QuestionBuilder';
import AdminSidebar from '@/components/admin/AdminSidebar';

const AdminMockTestEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testInfo, setTestInfo] = useState({
    title: '',
    subject: '',
    topic: ''
  });
  const [questions, setQuestions] = useState([]);

  const { data: mockTest, isLoading } = useQuery({
    queryKey: ['mockTestEdit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select(`
          *,
          mock_questions (
            *,
            mock_sub_questions (*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (mockTest) {
      setTestInfo({
        title: mockTest.title,
        subject: mockTest.subject,
        topic: mockTest.topic
      });

      // Transform database questions to component format
      const transformedQuestions = mockTest.mock_questions?.map(q => ({
        id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        question_image_url: q.question_image_url || '',
        has_sub_questions: q.has_sub_questions,
        marks: q.marks,
        answer_key: q.answer_key || '',
        word_limit: q.word_limit?.toString() || '',
        difficulty: q.difficulty,
        sub_questions: q.mock_sub_questions?.map(sq => ({
          id: sq.id,
          sub_question_label: sq.sub_question_label,
          sub_question_text: sq.sub_question_text,
          sub_question_image_url: sq.sub_question_image_url || '',
          marks: sq.marks,
          answer_key: sq.answer_key || '',
          word_limit: sq.word_limit?.toString() || ''
        })) || []
      })) || [];

      setQuestions(transformedQuestions);
    }
  }, [mockTest]);

  const handleSave = async (publish = false) => {
    // Validation logic similar to create page
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

    setLoading(true);
    try {
      // Update mock test
      const { error: testError } = await supabase
        .from('mock_tests')
        .update({
          title: testInfo.title,
          subject: testInfo.subject,
          topic: testInfo.topic,
          is_published: publish
        })
        .eq('id', id);

      if (testError) throw testError;

      // Delete existing questions and sub-questions
      const { error: deleteError } = await supabase
        .from('mock_questions')
        .delete()
        .eq('mock_test_id', id);

      if (deleteError) throw deleteError;

      // Re-create questions (similar to create logic)
      for (const question of questions) {
        const { data: createdQuestion, error: questionError } = await supabase
          .from('mock_questions')
          .insert({
            mock_test_id: id,
            question_number: question.question_number,
            question_text: question.question_text,
            question_image_url: question.question_image_url || null,
            has_sub_questions: question.has_sub_questions,
            marks: question.marks,
            answer_key: question.answer_key || null,
            word_limit: question.word_limit ? parseInt(question.word_limit) : null,
            difficulty: question.difficulty
          })
          .select()
          .single();

        if (questionError) throw questionError;

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

      toast.success(`Mock test ${publish ? 'updated and published' : 'updated'} successfully!`);
      navigate('/admin/mock-tests');
    } catch (error) {
      console.error('Error updating mock test:', error);
      toast.error('Failed to update mock test');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 p-6">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
                <h1 className="text-3xl font-bold text-gray-900">Edit Mock Test</h1>
                <p className="text-gray-600">Update your mock examination</p>
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
                    onValueChange={(value) => setTestInfo({ ...testInfo, subject: value })}
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
            </CardContent>
          </Card>

          {/* Question Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Question Builder</CardTitle>
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
              Save Changes
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Publishing...' : 'Update & Publish'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMockTestEdit;
