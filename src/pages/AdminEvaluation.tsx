import React, { useState, useEffect, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, Filter, Eye, Bot, Edit, CheckCircle, Clock, AlertCircle, 
  Save, Lock, ChevronDown, ChevronUp, Loader2, Sparkles, Send,
  FileText, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EvaluationRecord {
  id: string;
  test_attempt_id: string;
  student_id: string;
  test_id: string;
  evaluation_status: string;
  evaluation_mode: string;
  ai_evaluation_data: any;
  manual_adjustments: any;
  question_evaluations: any;
  suggestions: any;
  final_score: number | null;
  final_marks: any;
  feedback: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  finalized_at: string | null;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string; student_id: string | null };
  mock_tests?: { title: string; subject: string; total_questions: number };
  test_attempts?: { answers: any; score: number; total_questions: number; completed_at: string; time_taken_seconds: number | null };
}

interface QuestionDetail {
  id: string;
  questionNumber: number;
  questionText: string;
  marks: number;
  answerKey: string | null;
  commandTerm: string | null;
  subQuestions: {
    id: string;
    label: string;
    text: string;
    marks: number;
    answerKey: string | null;
    commandTerm: string | null;
  }[];
}

interface PerQuestionScore {
  questionId: string;
  subQuestionId?: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer?: string;
  maxMarks: number;
  manualMarks: number;
  aiMarks?: number;
  feedback: string;
  suggestions: { whatYouDidWell: string; whatYouMissed: string; howToImprove: string };
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
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [overallFeedback, setOverallFeedback] = useState('');
  const [evaluationMode, setEvaluationMode] = useState<'manual' | 'ai' | 'hybrid'>('hybrid');
  const [questionDetails, setQuestionDetails] = useState<QuestionDetail[]>([]);
  const [perQuestionScores, setPerQuestionScores] = useState<PerQuestionScore[]>([]);
  const [savingEval, setSavingEval] = useState(false);
  const [runningAISuggestions, setRunningAISuggestions] = useState(false);

  useEffect(() => { fetchEvaluations(); }, []);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const { data: evalData, error } = await supabase
        .from('exam_evaluations')
        .select('*, test_attempts(answers, score, total_questions, completed_at, time_taken_seconds)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set((evalData || []).map(e => e.student_id))];
      const testIds = [...new Set((evalData || []).map(e => e.test_id))];

      let profilesMap: Record<string, any> = {};
      let testsMap: Record<string, any> = {};

      if (studentIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email, student_id').in('id', studentIds);
        if (profiles) profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
      if (testIds.length > 0) {
        const { data: tests } = await supabase.from('mock_tests').select('id, title, subject, total_questions').in('id', testIds);
        if (tests) testsMap = tests.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
      }

      setEvaluations((evalData || []).map(e => ({
        ...e,
        profiles: profilesMap[e.student_id],
        mock_tests: testsMap[e.test_id]
      })));
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      toast.error('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  const openEvaluationDetails = async (evaluation: EvaluationRecord) => {
    setSelectedEvaluation(evaluation);
    setOverallFeedback(evaluation.feedback || '');
    setDetailsOpen(true);

    // Fetch question details for this test
    try {
      const { data: questions, error } = await supabase
        .from('mock_questions')
        .select('*, mock_sub_questions(*)')
        .eq('mock_test_id', evaluation.test_id)
        .order('question_number');

      if (error) throw error;

      const details: QuestionDetail[] = (questions || []).map(q => ({
        id: q.id,
        questionNumber: q.question_number,
        questionText: q.question_text,
        marks: q.marks,
        answerKey: q.answer_key,
        commandTerm: q.command_term,
        subQuestions: (q.mock_sub_questions || []).map((sq: any) => ({
          id: sq.id, label: sq.sub_question_label, text: sq.sub_question_text,
          marks: sq.marks, answerKey: sq.answer_key, commandTerm: sq.command_term
        }))
      }));
      setQuestionDetails(details);

      // Build per-question scores from existing data or initialize
      const existingEvals = (evaluation.question_evaluations as any[]) || [];
      const answers = evaluation.test_attempts?.answers;
      const scores: PerQuestionScore[] = [];

      for (const q of details) {
        if (q.subQuestions.length > 0) {
          for (const sq of q.subQuestions) {
            const existing = existingEvals.find((e: any) => e.questionId === q.id && e.subQuestionId === sq.id);
            const studentAnswer = getStudentAnswer(answers, q.id, sq.id);
            scores.push({
              questionId: q.id,
              subQuestionId: sq.id,
              questionText: sq.text,
              studentAnswer,
              correctAnswer: sq.answerKey || undefined,
              maxMarks: sq.marks,
              manualMarks: existing?.marksAwarded ?? 0,
              aiMarks: existing?.aiMarks,
              feedback: existing?.feedback || '',
              suggestions: existing?.suggestions || { whatYouDidWell: '', whatYouMissed: '', howToImprove: '' }
            });
          }
        } else {
          const existing = existingEvals.find((e: any) => e.questionId === q.id && !e.subQuestionId);
          const studentAnswer = getStudentAnswer(answers, q.id);
          scores.push({
            questionId: q.id,
            questionText: q.questionText,
            studentAnswer,
            correctAnswer: q.answerKey || undefined,
            maxMarks: q.marks,
            manualMarks: existing?.marksAwarded ?? 0,
            aiMarks: existing?.aiMarks,
            feedback: existing?.feedback || '',
            suggestions: existing?.suggestions || { whatYouDidWell: '', whatYouMissed: '', howToImprove: '' }
          });
        }
      }
      setPerQuestionScores(scores);
    } catch (error) {
      console.error('Error fetching question details:', error);
    }
  };

  const getStudentAnswer = (answers: any, questionId: string, subQuestionId?: string): string => {
    if (!answers) return '';
    // Handle array format
    if (Array.isArray(answers)) {
      const found = answers.find((a: any) =>
        a.questionId === questionId && (!subQuestionId || a.subQuestionId === subQuestionId)
      );
      if (found) {
        return typeof found.content === 'string' ? found.content : JSON.stringify(found.content || '');
      }
      return '';
    }
    // Handle object format  
    const key = subQuestionId || questionId;
    const val = answers[key] || answers[questionId];
    return typeof val === 'string' ? val : JSON.stringify(val || '');
  };

  const updateScore = (index: number, field: keyof PerQuestionScore, value: any) => {
    setPerQuestionScores(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const updateSuggestion = (index: number, field: string, value: string) => {
    setPerQuestionScores(prev => {
      const updated = [...prev];
      updated[index].suggestions = { ...updated[index].suggestions, [field]: value };
      return updated;
    });
  };

  // Run AI evaluation for a single attempt
  const runAIEvaluation = async (evaluation: EvaluationRecord) => {
    setEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-interactive-answers', {
        body: {
          attemptId: evaluation.test_attempt_id,
          testId: evaluation.test_id,
          answers: evaluation.test_attempts?.answers || {}
        }
      });
      if (error) throw error;

      await supabase.from('exam_evaluations').update({
        ai_evaluation_data: data,
        evaluation_status: 'ai_evaluated',
        evaluation_mode: 'ai',
        evaluated_at: new Date().toISOString()
      }).eq('id', evaluation.id);

      toast.success('AI evaluation completed');
      fetchEvaluations();
    } catch (error: any) {
      toast.error('AI evaluation failed: ' + error.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Bulk AI evaluation
  const runBulkAIEvaluation = async () => {
    const selected = evaluations.filter(e => selectedForBulk.has(e.id));
    if (selected.length === 0) { toast.error('Select attempts first'); return; }

    setEvaluating(true);
    let success = 0;
    for (const eval_ of selected) {
      try {
        await runAIEvaluation(eval_);
        success++;
      } catch { /* continue */ }
    }
    toast.success(`AI evaluated ${success}/${selected.length} attempts`);
    setSelectedForBulk(new Set());
    setEvaluating(false);
    fetchEvaluations();
  };

  // Run AI suggestions for the current open evaluation (hybrid mode)
  const runAISuggestions = async () => {
    if (!selectedEvaluation) return;
    setRunningAISuggestions(true);
    try {
      // Build payload for AI suggestion generation
      const payload = perQuestionScores.map(pq => ({
        questionId: pq.questionId,
        subQuestionId: pq.subQuestionId,
        questionText: pq.questionText,
        studentAnswer: pq.studentAnswer,
        correctAnswer: pq.correctAnswer || '',
        marksAwarded: pq.manualMarks,
        maxMarks: pq.maxMarks
      }));

      const { data, error } = await supabase.functions.invoke('ai-exam-evaluator', {
        body: {
          questions: payload.map(p => ({
            questionId: p.questionId,
            questionText: p.questionText,
            referenceAnswer: p.correctAnswer,
            studentAnswer: p.studentAnswer,
            marks: p.maxMarks,
            subject: selectedEvaluation.mock_tests?.subject || 'Mathematics'
          }))
        }
      });

      if (error) throw error;

      // Merge AI suggestions into per-question scores
      const aiEvals = data?.evaluations || [];
      setPerQuestionScores(prev => prev.map(pq => {
        const aiResult = aiEvals.find((a: any) => a.questionId === pq.questionId);
        if (aiResult) {
          return {
            ...pq,
            aiMarks: aiResult.marksAwarded,
            suggestions: {
              whatYouDidWell: aiResult.comment?.includes('correct') ? aiResult.comment : pq.suggestions.whatYouDidWell,
              whatYouMissed: aiResult.feedback === 'Needs Improvement' ? aiResult.comment : pq.suggestions.whatYouMissed,
              howToImprove: aiResult.comment || pq.suggestions.howToImprove
            }
          };
        }
        return pq;
      }));

      toast.success('AI suggestions generated');
    } catch (error: any) {
      toast.error('Failed to generate AI suggestions: ' + error.message);
    } finally {
      setRunningAISuggestions(false);
    }
  };

  // Save evaluation (manual/hybrid)
  const saveEvaluation = async () => {
    if (!selectedEvaluation) return;
    setSavingEval(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const questionEvaluations = perQuestionScores.map(pq => ({
        questionId: pq.questionId,
        subQuestionId: pq.subQuestionId,
        questionText: pq.questionText,
        studentAnswer: pq.studentAnswer,
        correctAnswer: pq.correctAnswer,
        marksAwarded: pq.manualMarks,
        aiMarks: pq.aiMarks,
        maxMarks: pq.maxMarks,
        feedback: pq.feedback,
        suggestions: pq.suggestions
      }));

      await supabase.from('exam_evaluations').update({
        question_evaluations: questionEvaluations as any,
        manual_adjustments: Object.fromEntries(perQuestionScores.map(pq => [pq.subQuestionId || pq.questionId, pq.manualMarks])),
        feedback: overallFeedback,
        evaluation_status: 'manually_evaluated',
        evaluation_mode: evaluationMode,
        evaluated_by: userData.user?.id,
        evaluated_at: new Date().toISOString()
      }).eq('id', selectedEvaluation.id);

      // Save training data
      for (const pq of perQuestionScores) {
        await supabase.from('evaluation_training_data').upsert({
          evaluation_id: selectedEvaluation.id,
          question_id: pq.questionId,
          sub_question_id: pq.subQuestionId || null,
          question_text: pq.questionText,
          correct_answer: pq.correctAnswer || null,
          student_answer: pq.studentAnswer,
          manual_marks_awarded: pq.manualMarks,
          ai_marks_awarded: pq.aiMarks || null,
          max_marks: pq.maxMarks,
          manual_feedback: pq.feedback,
          ai_feedback: pq.suggestions.howToImprove || null,
          final_marks: pq.manualMarks,
          evaluator_id: userData.user?.id
        } as any, { onConflict: 'evaluation_id,question_id' });
      }

      toast.success('Evaluation saved');
      fetchEvaluations();
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSavingEval(false);
    }
  };

  // Finalize and publish
  const finalizeEvaluation = async () => {
    if (!selectedEvaluation) return;
    if (!confirm('Finalize and publish results to the student? This cannot be undone.')) return;

    try {
      const totalScore = perQuestionScores.reduce((s, pq) => s + pq.manualMarks, 0);
      const totalPossible = perQuestionScores.reduce((s, pq) => s + pq.maxMarks, 0);

      const questionEvaluations = perQuestionScores.map(pq => ({
        questionId: pq.questionId,
        subQuestionId: pq.subQuestionId,
        questionText: pq.questionText,
        studentAnswer: pq.studentAnswer,
        correctAnswer: pq.correctAnswer,
        marksAwarded: pq.manualMarks,
        maxMarks: pq.maxMarks,
        feedback: pq.feedback,
        suggestions: pq.suggestions
      }));

      await supabase.from('exam_evaluations').update({
        final_score: totalScore,
        final_marks: { total: totalScore, possible: totalPossible },
        question_evaluations: questionEvaluations as any,
        feedback: overallFeedback,
        evaluation_status: 'finalized',
        finalized_at: new Date().toISOString()
      }).eq('id', selectedEvaluation.id);

      // Update training data with final marks
      for (const pq of perQuestionScores) {
        await supabase.from('evaluation_training_data').update({
          final_marks: pq.manualMarks
        } as any).eq('evaluation_id', selectedEvaluation.id).eq('question_id', pq.questionId);
      }

      // Create notification for the student
      const testTitle = selectedEvaluation.mock_tests?.title || 'Mock Test';
      await supabase.from('notifications').insert({
        user_id: selectedEvaluation.student_id,
        title: '📊 Your Mock Test Results are Ready!',
        message: `Your "${testTitle}" has been evaluated. Score: ${totalScore}/${totalPossible}. Click to view detailed results.`,
        type: 'result_published',
        link: `/mock-exams/results/${selectedEvaluation.test_attempt_id}`
      } as any);

      toast.success('Evaluation finalized! Student can now view results.');
      setDetailsOpen(false);
      fetchEvaluations();
    } catch (error: any) {
      toast.error('Failed to finalize');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
      pending_review: { icon: <Clock className="w-3 h-3 mr-1" />, label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      ai_evaluated: { icon: <Bot className="w-3 h-3 mr-1" />, label: 'AI Evaluated', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      manually_evaluated: { icon: <Edit className="w-3 h-3 mr-1" />, label: 'Manual', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      finalized: { icon: <Lock className="w-3 h-3 mr-1" />, label: 'Published', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    };
    const c = configs[status] || { icon: null, label: status, className: '' };
    return <Badge className={c.className}>{c.icon}{c.label}</Badge>;
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
    manual: evaluations.filter(e => e.evaluation_status === 'manually_evaluated').length,
    finalized: evaluations.filter(e => e.evaluation_status === 'finalized').length,
  };

  const toggleBulkSelect = (id: string) => {
    setSelectedForBulk(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
            <p className="text-muted-foreground">Paper-correction style evaluation with AI-assisted suggestions</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              { icon: <Users className="w-5 h-5 text-muted-foreground" />, count: stats.total, label: 'Total' },
              { icon: <Clock className="w-5 h-5 text-amber-500" />, count: stats.pending, label: 'Pending' },
              { icon: <Bot className="w-5 h-5 text-blue-500" />, count: stats.aiEvaluated, label: 'AI Evaluated' },
              { icon: <Edit className="w-5 h-5 text-purple-500" />, count: stats.manual, label: 'Manual' },
              { icon: <CheckCircle className="w-5 h-5 text-green-500" />, count: stats.finalized, label: 'Published' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <div>
                      <p className="text-2xl font-bold">{s.count}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters + Bulk actions */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search student, test..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_review">Pending</SelectItem>
                    <SelectItem value="ai_evaluated">AI Evaluated</SelectItem>
                    <SelectItem value="manually_evaluated">Manually Evaluated</SelectItem>
                    <SelectItem value="finalized">Published</SelectItem>
                  </SelectContent>
                </Select>
                {selectedForBulk.size > 0 && (
                  <Button onClick={runBulkAIEvaluation} disabled={evaluating} className="gap-2">
                    <Bot className="w-4 h-4" />
                    AI Evaluate ({selectedForBulk.size})
                    {evaluating && <Loader2 className="w-4 h-4 animate-spin" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evaluations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>Select submissions to evaluate individually or in bulk</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : filteredEvaluations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No evaluations found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedForBulk.size === filteredEvaluations.filter(e => e.evaluation_status === 'pending_review').length && selectedForBulk.size > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedForBulk(new Set(filteredEvaluations.filter(e => e.evaluation_status === 'pending_review').map(e => e.id)));
                            } else {
                              setSelectedForBulk(new Set());
                            }
                          }}
                        />
                      </TableHead>
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
                      <TableRow key={evaluation.id} className={cn(selectedForBulk.has(evaluation.id) && 'bg-primary/5')}>
                        <TableCell>
                          {evaluation.evaluation_status !== 'finalized' && (
                            <Checkbox
                              checked={selectedForBulk.has(evaluation.id)}
                              onCheckedChange={() => toggleBulkSelect(evaluation.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evaluation.profiles?.first_name} {evaluation.profiles?.last_name}</p>
                            <p className="text-xs text-muted-foreground">{evaluation.profiles?.student_id && `ID: ${evaluation.profiles.student_id}`}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evaluation.mock_tests?.title}</p>
                            <p className="text-xs text-muted-foreground">{evaluation.mock_tests?.subject}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluation.test_attempts?.completed_at ? format(new Date(evaluation.test_attempts.completed_at), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(evaluation.evaluation_status)}</TableCell>
                        <TableCell>
                          {evaluation.final_score !== null
                            ? `${evaluation.final_score}/${evaluation.final_marks?.possible || '-'}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openEvaluationDetails(evaluation)}>
                            <Eye className="w-4 h-4 mr-1" />
                            {evaluation.evaluation_status === 'finalized' ? 'View' : 'Evaluate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Paper Correction Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <div>
                    <span>{selectedEvaluation?.profiles?.first_name} {selectedEvaluation?.profiles?.last_name}</span>
                    <span className="text-muted-foreground font-normal ml-2">— {selectedEvaluation?.mock_tests?.title}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {selectedEvaluation?.evaluation_status !== 'finalized' && (
                <div className="flex items-center gap-3 pb-2 border-b">
                  <Label className="text-sm font-medium">Mode:</Label>
                  <div className="flex gap-2">
                    {(['manual', 'ai', 'hybrid'] as const).map(m => (
                      <Button
                        key={m}
                        size="sm"
                        variant={evaluationMode === m ? 'default' : 'outline'}
                        onClick={() => setEvaluationMode(m)}
                        className="capitalize gap-1"
                      >
                        {m === 'manual' && <Edit className="w-3 h-3" />}
                        {m === 'ai' && <Bot className="w-3 h-3" />}
                        {m === 'hybrid' && <Sparkles className="w-3 h-3" />}
                        {m}
                      </Button>
                    ))}
                  </div>
                  {(evaluationMode === 'hybrid' || evaluationMode === 'ai') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={runAISuggestions}
                      disabled={runningAISuggestions}
                      className="ml-auto gap-1"
                    >
                      {runningAISuggestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate AI Suggestions
                    </Button>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 py-2">
                  {/* Score summary bar */}
                  <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-3">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-lg font-bold text-primary">
                      {perQuestionScores.reduce((s, pq) => s + pq.manualMarks, 0)} / {perQuestionScores.reduce((s, pq) => s + pq.maxMarks, 0)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {perQuestionScores.length} questions
                    </span>
                  </div>

                  {/* Per-question paper correction */}
                  {perQuestionScores.map((pq, index) => {
                    const qDetail = questionDetails.find(q => q.id === pq.questionId);
                    const qNum = qDetail?.questionNumber || index + 1;
                    const subLabel = pq.subQuestionId
                      ? qDetail?.subQuestions.find(sq => sq.id === pq.subQuestionId)?.label
                      : null;

                    return (
                      <Card key={`${pq.questionId}-${pq.subQuestionId || ''}`} className="border">
                        <CardContent className="pt-4 space-y-3">
                          {/* Question header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                Q{qNum}{subLabel ? `(${subLabel})` : ''}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">{pq.questionText}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {selectedEvaluation?.evaluation_status !== 'finalized' ? (
                                <>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={pq.maxMarks}
                                    value={pq.manualMarks}
                                    onChange={e => updateScore(index, 'manualMarks', parseFloat(e.target.value) || 0)}
                                    className="w-16 text-center font-bold"
                                  />
                                  <span className="text-muted-foreground text-sm">/ {pq.maxMarks}</span>
                                </>
                              ) : (
                                <Badge variant={pq.manualMarks === pq.maxMarks ? 'default' : pq.manualMarks > 0 ? 'secondary' : 'destructive'}>
                                  {pq.manualMarks}/{pq.maxMarks}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Student answer */}
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Student Answer</p>
                            <p className="text-sm whitespace-pre-wrap">{pq.studentAnswer || 'No answer'}</p>
                          </div>

                          {/* Reference answer */}
                          {pq.correctAnswer && (
                            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Reference Answer</p>
                              <p className="text-sm whitespace-pre-wrap">{pq.correctAnswer}</p>
                            </div>
                          )}

                          {/* AI marks comparison */}
                          {pq.aiMarks !== undefined && pq.aiMarks !== null && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Bot className="w-3 h-3" />
                              AI suggested: {pq.aiMarks}/{pq.maxMarks}
                            </div>
                          )}

                          {/* Feedback + Suggestions (editable for non-finalized) */}
                          {selectedEvaluation?.evaluation_status !== 'finalized' ? (
                            <div className="space-y-2 border-t pt-3">
                              <Input
                                placeholder="Feedback comment..."
                                value={pq.feedback}
                                onChange={e => updateScore(index, 'feedback', e.target.value)}
                                className="text-sm"
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  placeholder="What they did well..."
                                  value={pq.suggestions.whatYouDidWell}
                                  onChange={e => updateSuggestion(index, 'whatYouDidWell', e.target.value)}
                                  className="text-xs"
                                />
                                <Input
                                  placeholder="What they missed..."
                                  value={pq.suggestions.whatYouMissed}
                                  onChange={e => updateSuggestion(index, 'whatYouMissed', e.target.value)}
                                  className="text-xs"
                                />
                                <Input
                                  placeholder="How to improve..."
                                  value={pq.suggestions.howToImprove}
                                  onChange={e => updateSuggestion(index, 'howToImprove', e.target.value)}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            pq.feedback && (
                              <div className="border-t pt-2">
                                <p className="text-sm text-muted-foreground">{pq.feedback}</p>
                              </div>
                            )
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Overall feedback */}
                  <div className="space-y-2 pt-2">
                    <Label>Overall Feedback</Label>
                    <Textarea
                      value={overallFeedback}
                      onChange={e => setOverallFeedback(e.target.value)}
                      placeholder="Add overall feedback for the student..."
                      rows={3}
                      disabled={selectedEvaluation?.evaluation_status === 'finalized'}
                    />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="mt-4 pt-3 border-t">
                {selectedEvaluation?.evaluation_status !== 'finalized' ? (
                  <>
                    <Button variant="outline" onClick={saveEvaluation} disabled={savingEval} className="gap-2">
                      {savingEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </Button>
                    <Button onClick={finalizeEvaluation} className="gap-2">
                      <Send className="w-4 h-4" />
                      Finalize & Publish
                    </Button>
                  </>
                ) : (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Lock className="w-3 h-3 mr-1" />
                    Published to student
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
