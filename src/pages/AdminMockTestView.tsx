
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit, Copy, Trash2, BarChart3 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { renderLatexContent } from '@/lib/renderLatex';

const AdminMockTestView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: mockTest, isLoading } = useQuery({
    queryKey: ['mockTest', id],
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
        <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 p-6">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!mockTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
        <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 p-6">
          <div className="text-center">Mock test not found</div>
        </div>
      </div>
    );
  }

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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{mockTest.title}</h1>
                <p className="text-muted-foreground">View mock test details and questions</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => navigate(`/admin/mock-tests/edit/${id}`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
            </div>
          </div>

          {/* Test Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="mt-1 text-lg font-semibold capitalize">{mockTest.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Topic</label>
                  <p className="mt-1 text-lg font-semibold">{mockTest.topic}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Total Questions</label>
                  <p className="mt-1 text-lg font-semibold">{mockTest.total_questions}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={mockTest.is_published ? "default" : "secondary"}>
                      {mockTest.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Questions ({mockTest.mock_questions?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTest.mock_questions?.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">Question {question.question_number}</h3>
                      <div className="flex space-x-1">
                        <Badge variant="outline">{question.difficulty}</Badge>
                        <Badge variant="outline">{question.marks} marks</Badge>
                      </div>
                    </div>
                    <div className="text-foreground mb-2 leading-relaxed">{renderLatexContent(question.question_text)}</div>
                    {/* Diagram Description */}
                    {question.diagram_description && (
                      <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md">
                        <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                          <BarChart3 className="w-4 h-4" />
                          Diagram/Graph Description:
                        </div>
                        <p className="text-sm text-purple-600 dark:text-purple-400 whitespace-pre-wrap">
                          {question.diagram_description}
                        </p>
                      </div>
                    )}
                    {question.question_image_url && (
                      <div className="mb-2">
                        <img src={question.question_image_url} alt="Question image" className="max-w-md rounded" />
                      </div>
                    )}
                    {question.answer_key && (
                      <div className="bg-primary/10 p-2 rounded">
                        <strong>Answer:</strong> <span className="inline">{renderLatexContent(question.answer_key)}</span>
                      </div>
                    )}
                    {question.mock_sub_questions && question.mock_sub_questions.length > 0 && (
                      <div className="mt-3 ml-4 space-y-2">
                        {question.mock_sub_questions.map((subQ) => (
                          <div key={subQ.id} className="border-l-2 border-border pl-3">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-medium">
                                {question.question_number}{subQ.sub_question_label}
                              </h4>
                              <Badge variant="outline">{subQ.marks} marks</Badge>
                            </div>
                            <div className="text-muted-foreground text-sm">{renderLatexContent(subQ.sub_question_text)}</div>
                            {subQ.sub_question_image_url && (
                              <div className="my-2">
                                <img src={subQ.sub_question_image_url} alt="Sub-question image" className="max-w-sm rounded" />
                              </div>
                            )}
                            {subQ.answer_key && (
                              <div className="bg-primary/10 p-1 rounded text-sm mt-1">
                                <strong>Answer:</strong> {subQ.answer_key}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminMockTestView;
