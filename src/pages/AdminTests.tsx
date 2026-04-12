import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import SubjectQuestionManager from '@/components/admin/SubjectQuestionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminTests = () => {
  const [activeTab, setActiveTab] = useState('tests');
  const navigate = useNavigate();

  // Fetch practice-type mock_tests
  const { data: practiceTests, isLoading, refetch } = useQuery({
    queryKey: ['practice-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*, mock_questions(id, question_number, has_sub_questions, marks)')
        .eq('exam_type', 'PRACTICE' as any)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this practice question?')) return;
    const { error } = await supabase.from('mock_tests').update({ is_archived: true }).eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Practice Questions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create rich practice questions with sub-questions and interactive answer types
              </p>
            </div>
            <Button onClick={() => navigate('/admin/practice/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Practice Question
            </Button>
          </div>

          {/* New Practice Questions (from unified system) */}
          {practiceTests && practiceTests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Practice Questions (New Format)
              </h2>
              <div className="grid gap-3">
                {practiceTests.map((test: any) => (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-foreground">{test.title || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{test.subject}</Badge>
                            <Badge variant="outline" className="text-xs">{test.topic}</Badge>
                            <Badge variant={test.is_published ? 'default' : 'secondary'} className="text-xs">
                              {test.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            {test.mock_questions && (
                              <span className="text-xs text-muted-foreground">
                                {test.mock_questions.length} Q · {test.mock_questions.reduce((s: number, q: any) => s + q.marks, 0)} marks
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/mock-tests/view/${test.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(test.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Legacy practice questions */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Legacy Practice Questions</h2>
            <SubjectQuestionManager />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTests;
