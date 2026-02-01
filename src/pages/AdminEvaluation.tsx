import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Filter, Eye, Bot, Edit, CheckCircle, Clock, AlertCircle, Save, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface EvaluationRecord {
  id: string;
  test_attempt_id: string;
  student_id: string;
  test_id: string;
  evaluation_status: string;
  ai_evaluation_data: any;
  manual_adjustments: any;
  final_score: number | null;
  final_marks: any;
  feedback: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  finalized_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    student_id: string | null;
  };
  mock_tests?: {
    title: string;
    subject: string;
    total_questions: number;
  };
  test_attempts?: {
    answers: any;
    score: number;
    total_questions: number;
    completed_at: string;
  };
}

const AdminEvaluation = () => {
  const [activeTab, setActiveTab] = useState('evaluation');
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const { data: evalData, error: evalError } = await supabase
        .from('exam_evaluations')
        .select(`
          *,
          test_attempts (answers, score, total_questions, completed_at)
        `)
        .order('created_at', { ascending: false });

      if (evalError) throw evalError;

      // Fetch related data
      const studentIds = [...new Set((evalData || []).map(e => e.student_id))];
      const testIds = [...new Set((evalData || []).map(e => e.test_id))];

      let profilesMap: Record<string, any> = {};
      let testsMap: Record<string, any> = {};

      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, student_id')
          .in('id', studentIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }
      }

      if (testIds.length > 0) {
        const { data: tests } = await supabase
          .from('mock_tests')
          .select('id, title, subject, total_questions')
          .in('id', testIds);
        
        if (tests) {
          testsMap = tests.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
        }
      }

      const enrichedEvaluations = (evalData || []).map(e => ({
        ...e,
        profiles: profilesMap[e.student_id],
        mock_tests: testsMap[e.test_id]
      }));

      setEvaluations(enrichedEvaluations);
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      toast.error('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  const openEvaluationDetails = (evaluation: EvaluationRecord) => {
    setSelectedEvaluation(evaluation);
    setManualScores(evaluation.manual_adjustments || {});
    setFeedback(evaluation.feedback || '');
    setDetailsOpen(true);
  };

  const runAIEvaluation = async (evaluation: EvaluationRecord) => {
    setEvaluating(true);
    try {
      // Call the AI evaluation edge function
      const { data, error } = await supabase.functions.invoke('evaluate-interactive-answers', {
        body: {
          attemptId: evaluation.test_attempt_id,
          testId: evaluation.test_id,
          answers: evaluation.test_attempts?.answers || {}
        }
      });

      if (error) throw error;

      // Update the evaluation record with AI results
      const { error: updateError } = await supabase
        .from('exam_evaluations')
        .update({
          ai_evaluation_data: data,
          evaluation_status: 'ai_evaluated',
          evaluated_at: new Date().toISOString()
        })
        .eq('id', evaluation.id);

      if (updateError) throw updateError;

      toast.success('AI evaluation completed');
      fetchEvaluations();
    } catch (error: any) {
      console.error('AI evaluation error:', error);
      toast.error('AI evaluation failed: ' + error.message);
    } finally {
      setEvaluating(false);
    }
  };

  const saveManualEvaluation = async () => {
    if (!selectedEvaluation) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('exam_evaluations')
        .update({
          manual_adjustments: manualScores,
          feedback: feedback,
          evaluation_status: 'manually_evaluated',
          evaluated_by: userData.user?.id,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', selectedEvaluation.id);

      if (error) throw error;

      toast.success('Manual evaluation saved');
      fetchEvaluations();
      setDetailsOpen(false);
    } catch (error: any) {
      toast.error('Failed to save evaluation');
    }
  };

  const finalizeEvaluation = async () => {
    if (!selectedEvaluation) return;

    if (!confirm('Are you sure you want to finalize this evaluation? This will make the score visible to the student and cannot be undone.')) {
      return;
    }

    try {
      // Calculate final score from manual adjustments or AI data
      const aiData = selectedEvaluation.ai_evaluation_data;
      let totalScore = 0;
      let totalPossible = 0;

      if (aiData?.results) {
        Object.keys(aiData.results).forEach(qId => {
          const result = aiData.results[qId];
          const manualOverride = manualScores[qId];
          totalScore += manualOverride !== undefined ? manualOverride : (result.marksAwarded || 0);
          totalPossible += result.maxMarks || 1;
        });
      }

      const { error } = await supabase
        .from('exam_evaluations')
        .update({
          final_score: totalScore,
          final_marks: { total: totalScore, possible: totalPossible },
          evaluation_status: 'finalized',
          finalized_at: new Date().toISOString()
        })
        .eq('id', selectedEvaluation.id);

      if (error) throw error;

      toast.success('Evaluation finalized! Student can now view their results.');
      fetchEvaluations();
      setDetailsOpen(false);
    } catch (error: any) {
      toast.error('Failed to finalize evaluation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'ai_evaluated':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Bot className="w-3 h-3 mr-1" />AI Evaluated</Badge>;
      case 'manually_evaluated':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Edit className="w-3 h-3 mr-1" />Manually Evaluated</Badge>;
      case 'finalized':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Lock className="w-3 h-3 mr-1" />Finalized</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredEvaluations = evaluations.filter(e => {
    const matchesSearch = 
      e.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.profiles?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.mock_tests?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || e.evaluation_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: evaluations.length,
    pending: evaluations.filter(e => e.evaluation_status === 'pending_review').length,
    aiEvaluated: evaluations.filter(e => e.evaluation_status === 'ai_evaluated').length,
    manuallyEvaluated: evaluations.filter(e => e.evaluation_status === 'manually_evaluated').length,
    finalized: evaluations.filter(e => e.evaluation_status === 'finalized').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Evaluation Center
            </h1>
            <p className="text-muted-foreground">Review, evaluate, and finalize student exam submissions</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.aiEvaluated}</p>
                    <p className="text-xs text-muted-foreground">AI Evaluated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.manuallyEvaluated}</p>
                    <p className="text-xs text-muted-foreground">Manual</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.finalized}</p>
                    <p className="text-xs text-muted-foreground">Finalized</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by student name, ID, or test..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="ai_evaluated">AI Evaluated</SelectItem>
                    <SelectItem value="manually_evaluated">Manually Evaluated</SelectItem>
                    <SelectItem value="finalized">Finalized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Evaluations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Evaluations</CardTitle>
              <CardDescription>Review and score student submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredEvaluations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No evaluations found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvaluations.map(evaluation => (
                      <TableRow key={evaluation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {evaluation.profiles?.first_name} {evaluation.profiles?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {evaluation.profiles?.student_id && `ID: ${evaluation.profiles.student_id}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evaluation.mock_tests?.title}</p>
                            <p className="text-xs text-muted-foreground">{evaluation.mock_tests?.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluation.test_attempts?.completed_at 
                            ? format(new Date(evaluation.test_attempts.completed_at), 'MMM d, HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(evaluation.evaluation_status)}</TableCell>
                        <TableCell>
                          {evaluation.final_score !== null 
                            ? `${evaluation.final_score}/${evaluation.final_marks?.possible || '-'}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {evaluation.evaluation_status === 'pending_review' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => runAIEvaluation(evaluation)}
                              disabled={evaluating}
                            >
                              <Bot className="w-4 h-4 mr-1" />
                              AI Eval
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEvaluationDetails(evaluation)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Evaluation Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  Evaluate: {selectedEvaluation?.profiles?.first_name} {selectedEvaluation?.profiles?.last_name} - {selectedEvaluation?.mock_tests?.title}
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="answers" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="answers">Student Answers</TabsTrigger>
                    <TabsTrigger value="ai">AI Evaluation</TabsTrigger>
                    <TabsTrigger value="manual">Manual Scoring</TabsTrigger>
                  </TabsList>

                  <TabsContent value="answers" className="space-y-4">
                    {selectedEvaluation?.test_attempts?.answers ? (
                      Object.entries(selectedEvaluation.test_attempts.answers).map(([questionId, answer]: [string, any]) => (
                        <Card key={questionId}>
                          <CardContent className="pt-4">
                            <p className="font-medium mb-2">Question {questionId}</p>
                            <div className="bg-muted p-3 rounded-lg">
                              <pre className="whitespace-pre-wrap text-sm">
                                {typeof answer === 'object' ? JSON.stringify(answer, null, 2) : String(answer)}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No answers submitted</p>
                    )}
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    {selectedEvaluation?.ai_evaluation_data?.results ? (
                      Object.entries(selectedEvaluation.ai_evaluation_data.results).map(([qId, result]: [string, any]) => (
                        <Card key={qId}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">Question {qId}</p>
                              <Badge variant={result.isCorrect ? 'default' : 'destructive'}>
                                {result.marksAwarded}/{result.maxMarks} marks
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{result.feedback}</p>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">AI evaluation not yet run</p>
                        <Button 
                          className="mt-4"
                          onClick={() => selectedEvaluation && runAIEvaluation(selectedEvaluation)}
                          disabled={evaluating}
                        >
                          Run AI Evaluation
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    {selectedEvaluation?.ai_evaluation_data?.results && (
                      <>
                        {Object.entries(selectedEvaluation.ai_evaluation_data.results).map(([qId, result]: [string, any]) => (
                          <Card key={qId}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Question {qId}</p>
                                  <p className="text-xs text-muted-foreground">
                                    AI Score: {result.marksAwarded}/{result.maxMarks}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label>Override Score:</Label>
                                  <Input 
                                    type="number"
                                    min={0}
                                    max={result.maxMarks}
                                    value={manualScores[qId] ?? result.marksAwarded}
                                    onChange={(e) => setManualScores(prev => ({
                                      ...prev,
                                      [qId]: parseFloat(e.target.value) || 0
                                    }))}
                                    className="w-20"
                                  />
                                  <span className="text-muted-foreground">/ {result.maxMarks}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        <div className="space-y-2">
                          <Label>Overall Feedback</Label>
                          <Textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Add feedback for the student..."
                            rows={4}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </ScrollArea>

              <DialogFooter className="mt-4">
                {selectedEvaluation?.evaluation_status !== 'finalized' && (
                  <>
                    <Button variant="outline" onClick={saveManualEvaluation}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={finalizeEvaluation}>
                      <Lock className="w-4 h-4 mr-2" />
                      Finalize & Publish Score
                    </Button>
                  </>
                )}
                {selectedEvaluation?.evaluation_status === 'finalized' && (
                  <Badge className="bg-green-500/10 text-green-600">
                    <Lock className="w-3 h-3 mr-1" />
                    This evaluation has been finalized
                  </Badge>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminEvaluation;
