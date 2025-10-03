import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Sparkles } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import MathRichEditor from '@/components/admin/MathRichEditor';

type TestType = Database['public']['Enums']['test_type'];
type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type Pathway = Database['public']['Enums']['pathway'];

interface TestEditorProps {
  test?: any;
  topics: any[];
  onClose: () => void;
  onSave: () => void;
}

const TestEditor = ({ test, topics, onClose, onSave }: TestEditorProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    test_type: 'quick_test' as TestType,
    topic_id: '',
    difficulty_level: 'medium' as DifficultyLevel,
    pathway: 'standard' as Pathway,
    time_limit_minutes: 30,
    is_active: true
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (test) {
      setFormData({
        title: test.title || '',
        description: test.description || '',
        test_type: test.test_type as TestType || 'quick_test',
        topic_id: test.topic_id || '',
        difficulty_level: test.difficulty_level as DifficultyLevel || 'medium',
        pathway: test.pathway as Pathway || 'standard',
        time_limit_minutes: test.time_limit_minutes || 30,
        is_active: test.is_active ?? true
      });
      fetchQuestions(test.id);
    }
  }, [test]);

  const fetchQuestions = async (testId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('created_at');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let testId = test?.id;
      
      if (test) {
        // Update existing test
        const { error } = await supabase
          .from('tests')
          .update({
            title: formData.title,
            description: formData.description,
            test_type: formData.test_type,
            topic_id: formData.topic_id,
            difficulty_level: formData.difficulty_level,
            pathway: formData.pathway,
            time_limit_minutes: formData.time_limit_minutes,
            is_active: formData.is_active,
            total_questions: questions.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', test.id);

        if (error) throw error;
      } else {
        // Create new test
        const { data, error } = await supabase
          .from('tests')
          .insert({
            title: formData.title,
            description: formData.description,
            test_type: formData.test_type,
            topic_id: formData.topic_id,
            difficulty_level: formData.difficulty_level,
            pathway: formData.pathway,
            time_limit_minutes: formData.time_limit_minutes,
            is_active: formData.is_active,
            total_questions: questions.length
          })
          .select()
          .single();

        if (error) throw error;
        testId = data.id;
      }

      // Save questions - delete old ones and insert new ones
      if (testId) {
        // Delete existing questions for this test
        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .eq('test_id', testId);

        if (deleteError) throw deleteError;

        // Insert new questions
        if (questions.length > 0) {
          const questionsToInsert = questions.map(q => ({
            test_id: testId,
            question_text: q.question_text,
            question_image_url: q.question_image_url || null,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
            difficulty_level: q.difficulty_level,
            topic_id: formData.topic_id
          }));

          const { error: insertError } = await supabase
            .from('questions')
            .insert(questionsToInsert);

          if (insertError) throw insertError;
        }
      }

      toast.success(`Test ${test ? 'updated' : 'created'} successfully with ${questions.length} questions`);
      onSave();
    } catch (error) {
      console.error('Error saving test:', error);
      toast.error('Failed to save test');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now(), // temporary ID
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      explanation: '',
      difficulty_level: 'medium' as DifficultyLevel
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {test ? 'Edit Test' : 'Create New Test'}
            </h1>
            <p className="text-gray-600">
              {test ? 'Modify test details and questions' : 'Set up a new practice test'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Test'}
        </Button>
      </div>

      {/* Test Details */}
      <Card>
        <CardHeader>
          <CardTitle>Test Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Test title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Test Type</label>
              <Select value={formData.test_type} onValueChange={(value: TestType) => setFormData({ ...formData, test_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick_test">Quick Test</SelectItem>
                  <SelectItem value="topic_practice">Topic Practice</SelectItem>
                  <SelectItem value="mock_test">Mock Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Topic</label>
              <Select value={formData.topic_id} onValueChange={(value) => setFormData({ ...formData, topic_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <Select value={formData.difficulty_level} onValueChange={(value: DifficultyLevel) => setFormData({ ...formData, difficulty_level: value })}>
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
            <div>
              <label className="block text-sm font-medium mb-2">Time Limit (minutes)</label>
              <Input
                type="number"
                value={formData.time_limit_minutes}
                onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pathway</label>
              <Select value={formData.pathway} onValueChange={(value: Pathway) => setFormData({ ...formData, pathway: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="extended">Extended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Test description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <Button onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id || index} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Question {index + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(index)}>
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Question Text (supports LaTeX & Word paste)
                    </label>
                    <MathRichEditor
                      value={question.question_text || ''}
                      onChange={(value) => updateQuestion(index, 'question_text', value)}
                      placeholder="Enter your question here... Use $x^2$ for inline math or paste from Word"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Option A</label>
                      <MathRichEditor
                        value={question.option_a || ''}
                        onChange={(value) => updateQuestion(index, 'option_a', value)}
                        placeholder="Option A (supports math)"
                        className="min-h-[60px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Option B</label>
                      <MathRichEditor
                        value={question.option_b || ''}
                        onChange={(value) => updateQuestion(index, 'option_b', value)}
                        placeholder="Option B (supports math)"
                        className="min-h-[60px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Option C</label>
                      <MathRichEditor
                        value={question.option_c || ''}
                        onChange={(value) => updateQuestion(index, 'option_c', value)}
                        placeholder="Option C (supports math)"
                        className="min-h-[60px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Option D</label>
                      <MathRichEditor
                        value={question.option_d || ''}
                        onChange={(value) => updateQuestion(index, 'option_d', value)}
                        placeholder="Option D (supports math)"
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Correct Answer</label>
                      <Select value={question.correct_answer} onValueChange={(value) => updateQuestion(index, 'correct_answer', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Option A</SelectItem>
                          <SelectItem value="B">Option B</SelectItem>
                          <SelectItem value="C">Option C</SelectItem>
                          <SelectItem value="D">Option D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Difficulty</label>
                      <Select value={question.difficulty_level} onValueChange={(value: DifficultyLevel) => updateQuestion(index, 'difficulty_level', value)}>
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
                  <div>
                    <label className="block text-sm font-medium mb-2">Explanation (Optional)</label>
                    <MathRichEditor
                      value={question.explanation || ''}
                      onChange={(value) => updateQuestion(index, 'explanation', value)}
                      placeholder="Explain the correct answer... (supports math)"
                      className="min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestEditor;
