import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, Database as DatabaseIcon, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import QuestionBuilder from '@/components/admin/QuestionBuilder';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import type { Database } from '@/integrations/supabase/types';

type TestSubject = Database['public']['Enums']['test_subject'];

export default function QuestionBuilderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testInfo, setTestInfo] = useState<{
    title: string;
    subject: TestSubject | '';
    topic: string;
    timeLimit: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }>({
    title: '',
    subject: '',
    topic: '',
    timeLimit: 30,
    difficulty: 'medium'
  });
  const [questions, setQuestions] = useState([]);
  const [showAIParser, setShowAIParser] = useState(false);

  const handleTestParsed = (testData: any) => {
    setTestInfo({
      title: testData.title,
      subject: testData.subject as TestSubject,
      topic: testData.topic,
      timeLimit: 30,
      difficulty: 'medium'
    });

    const transformedQuestions = testData.questions.map((q: any, index: number) => ({
      id: Date.now() + index,
      question_text: q.question_text,
      question_image_url: q.question_image_url || '',
      option_a: q.options?.[0]?.replace('A. ', '') || '',
      option_b: q.options?.[1]?.replace('B. ', '') || '',
      option_c: q.options?.[2]?.replace('C. ', '') || '',
      option_d: q.options?.[3]?.replace('D. ', '') || '',
      correct_answer: q.correct_answer || 'A',
      explanation: q.explanation || '',
      difficulty_level: q.difficulty || 'medium'
    }));

    setQuestions(transformedQuestions);
  };

  const handleSave = async (publish = false) => {
    if (!testInfo.title.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    if (!testInfo.subject) {
      toast.error('Please select a subject');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setLoading(true);
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title: testInfo.title,
          test_type: 'quick_test',
          difficulty_level: testInfo.difficulty,
          time_limit_minutes: testInfo.timeLimit,
          is_active: publish,
          total_questions: questions.length
        })
        .select()
        .single();

      if (testError) throw testError;

      const questionsToInsert = questions.map((q: any) => ({
        test_id: testData.id,
        question_text: q.question_text,
        question_image_url: q.question_image_url,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty_level: q.difficulty_level
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success(publish ? 'Test published successfully!' : 'Test saved as draft!');
      navigate('/admin/tests');
    } catch (error) {
      console.error('Error saving test:', error);
      toast.error('Failed to save test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab="tests" onTabChange={() => {}} />
      
      <div className="flex-1 ml-64">
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/tests')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quick Tests
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Quick Test</h1>
          <p className="text-gray-600 mt-1">Design and upload a comprehensive quick practice test</p>
        </div>

        <div className="p-8 max-w-5xl">
          <Card className="mb-8 border-gray-200">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6">Test Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={testInfo.title}
                    onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                    placeholder="e.g., Mathematics Quick Test - Algebra Fundamentals"
                    className="border-gray-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <Select value={testInfo.subject} onValueChange={(value) => setTestInfo({ ...testInfo, subject: value as TestSubject })}>
                      <SelectTrigger className="border-gray-300 bg-white">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-white">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={testInfo.topic}
                      onChange={(e) => setTestInfo({ ...testInfo, topic: e.target.value })}
                      placeholder="e.g., Algebra, Force & Motion, etc."
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Limit (minutes)
                    </label>
                    <Input
                      type="number"
                      value={testInfo.timeLimit}
                      onChange={(e) => setTestInfo({ ...testInfo, timeLimit: parseInt(e.target.value) || 30 })}
                      className="border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <Select value={testInfo.difficulty} onValueChange={(value: any) => setTestInfo({ ...testInfo, difficulty: value })}>
                      <SelectTrigger className="border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-white">
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Question Builder</h2>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-gray-300">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white">
                      <DropdownMenuItem onClick={() => setShowAIParser(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        AI Document Parser
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    className="border-gray-300"
                    onClick={() => toast.info('Question bank coming soon!')}
                  >
                    <DatabaseIcon className="w-4 h-4 mr-2" />
                    Load from Bank
                  </Button>
                </div>
              </div>

              <QuestionBuilder 
                questions={questions} 
                setQuestions={setQuestions}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={loading}
              className="border-gray-300"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Publish Test
            </Button>
          </div>
        </div>
      </div>

      {showAIParser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">AI Document Parser</h3>
                <Button variant="ghost" onClick={() => setShowAIParser(false)}>
                  ✕
                </Button>
              </div>
              <QuestionUploadCard 
                mode="quick" 
                onSuccess={(data) => {
                  handleTestParsed(data);
                  setShowAIParser(false);
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
