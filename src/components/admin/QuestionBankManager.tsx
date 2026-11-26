import QuestionMediaUploader from './QuestionMediaUploader';
import QuestionDiagram from '@/components/QuestionDiagram';
import { practiceQuestion } from '@/lib/practiceQuestion';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Upload,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  XCircle,
  Layers,
  Calculator,
  Loader2,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { renderFinalText } from '@/lib/renderFinalText';
import { UnifiedMathEditor } from '@/components/math/UnifiedMathEditor';
import { PracticeMarkingFields, type PracticeAnswerConfig } from './PracticeMarkingFields';
import { CSVImportModal } from './CSVImportModal';

export interface BankQuestion {
  id: string;
  programme: 'MYP';
  subject: 'mathematics';
  myp_year: 'Year 1' | 'Year 2' | 'Year 3' | 'Year 4' | 'Year 5';
  strand: 'Number' | 'Algebra' | 'Geometry and Trigonometry' | 'Statistics and Probability';
  topic: string;
  subtopic?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'single' | 'multi_part';
  command_term?: string | null;
  question_text: string;
  question_latex?: string | null;
  image_url?: string | null;
  marks: number;
  answer_type: 'text_equation' | 'short_answer' | 'multiple_choice' | 'working_box';
  answer_config?: Record<string, any>;
  is_published: boolean;
  review_status: 'draft' | 'review_pending' | 'approved' | 'rejected' | 'archived';
  created_at: string;
  updated_at: string;
  subquestions?: BankSubquestion[];
  answer_key?: string;
  marking_rubric?: string[];
  solution?: string;
}

export interface BankSubquestion {
  id?: string;
  question_id?: string;
  label: string;
  marks: number;
  answer_type: 'text_equation' | 'short_answer' | 'multiple_choice' | 'working_box';
  command_term?: string;
  sub_question_text: string;
  answer_config?: PracticeAnswerConfig;
  sub_question_image_url?: string;
  order_index: number;
  answer_key?: string;
  marking_rubric?: string[];
  solution?: string;
}

interface AuditMetrics {
  total: number;
  published: number;
  reviewPending: number;
  draft: number;
  multiPart: number;
}

const MYP_YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const;
const STRANDS = [
  'Number',
  'Algebra',
  'Geometry and Trigonometry',
  'Statistics and Probability'
] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const COMMAND_TERMS = [
  'Calculate',
  'Solve',
  'Simplify',
  'Find',
  'Show that',
  'Determine',
  'Evaluate',
  'State',
  'Describe',
  'Explain'
];

export const QuestionBankManager: React.FC = () => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [kind, setKind] = useState('all');
  const [topic, setTopic] = useState('');
  const sequence = React.useRef(0);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStrand, setFilterStrand] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<BankQuestion | null>(null);
  const [previewSubquestions, setPreviewSubquestions] = useState<BankSubquestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    myp_year: 'Year 1' | 'Year 2' | 'Year 3' | 'Year 4' | 'Year 5';
    strand: 'Number' | 'Algebra' | 'Geometry and Trigonometry' | 'Statistics and Probability';
    topic: string;
    subtopic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    question_type: 'single' | 'multi_part';
    command_term: string;
    question_text: string;
    image_url: string;
    marks: number;
    answer_type: 'text_equation' | 'short_answer' | 'multiple_choice' | 'working_box';
    is_published: boolean;
    review_status: 'draft' | 'review_pending' | 'approved' | 'rejected' | 'archived';
    answer_key: string;
    marking_rubric?: string[];
    answer_config?: PracticeAnswerConfig;
    solution: string;
    subquestions: BankSubquestion[];
  }>({
    myp_year: 'Year 4',
    strand: 'Algebra',
    topic: '',
    subtopic: '',
    difficulty: 'medium',
    question_type: 'single',
    command_term: 'Solve',
    question_text: '',
    image_url: '',
    marks: 1,
    answer_type: 'text_equation',
    is_published: false,
    review_status: 'draft',
    answer_key: '',
    solution: '',
    subquestions: []
  });

  useEffect(() => {
    fetchQuestions();
  }, [page, kind, topic, searchQuery, filterYear, filterStrand, filterDifficulty, filterStatus]);

  const fetchQuestions = async () => {
    setLoading(true);
    const request = ++sequence.current;
    try {
      let query = supabase.from('question_bank').select('*', { count: 'exact' })
        .eq('programme', 'MYP').eq('subject', 'mathematics');
      if (filterYear !== 'all') query = query.eq('myp_year', filterYear);
      if (filterStrand !== 'all') query = query.eq('strand', filterStrand);
      if (filterDifficulty !== 'all') query = query.eq('difficulty', filterDifficulty);
      if (kind !== 'all') query = query.eq('question_type', kind);
      if (topic.trim()) query = query.ilike('topic', '%' + topic.trim() + '%');
      if (filterStatus === 'published') query = query.eq('is_published', true);
      else if (filterStatus !== 'all') query = query.eq('review_status', filterStatus);
      if (searchQuery.trim()) query = query.textSearch('search_document', searchQuery, { type: 'plain', config: 'simple' });
      const { data: qData, error: qErr, count } = await query.order('created_at', { ascending: false })
        .order('id').range(page * 20, page * 20 + 19);
      if (request !== sequence.current) return;
      setTotal(count ?? 0);
      if (qErr) {
        console.warn('question_bank fetch error:', qErr.message);
        setQuestions([]);
        return;
      }

      // Fetch answer keys for single questions
      const qIds = (qData || []).map((q: any) => q.id);
      let answerKeyMap: Record<string, { answer_key: string; solution: string; marking_rubric: string[] }> = {};

      if (qIds.length > 0) {
        const { data: akData, error: keyError } = await supabase
          .from('question_answer_keys')
          .select('question_id, answer_key, solution, marking_rubric')
          .in('question_id', qIds);

        if (keyError) throw keyError;
        if (akData) {
          akData.forEach((ak: any) => {
            if (ak.question_id) {
              answerKeyMap[ak.question_id] = {
                answer_key: ak.answer_key || '',
                solution: ak.solution || '', marking_rubric: ak.marking_rubric || []
              };
            }
          });
        }
      }

      const formattedQuestions: BankQuestion[] = (qData || []).map((q: any) => ({
        ...q,
        marking_rubric: answerKeyMap[q.id]?.marking_rubric,
        answer_key: answerKeyMap[q.id]?.answer_key || '',
        solution: answerKeyMap[q.id]?.solution || ''
      }));

      if (request === sequence.current) setQuestions(formattedQuestions);
    } catch (err: any) {
      console.error('Fetch error:', err);
      toast.error('Failed to load questions.');
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      myp_year: 'Year 4',
      strand: 'Algebra',
      topic: '',
      subtopic: '',
      difficulty: 'medium',
      question_type: 'single',
      command_term: 'Solve',
      question_text: '',
      image_url: '',
      marks: 1,
      answer_type: 'text_equation',
      is_published: false,
      review_status: 'draft',
      answer_key: '',
      solution: '',
      subquestions: []
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (question: BankQuestion) => {
    setEditingId(question.id);
    let subs: BankSubquestion[] = [];

    if (question.question_type === 'multi_part') {
      const { data: subData,error: partError } = await supabase
        .from('question_subquestions')
        .select('*')
        .eq('question_id', question.id)
        .order('order_index', { ascending: true });

      if (partError) { toast.error(partError.message); return; }
      if (subData && subData.length > 0) {
        const subIds = subData.map((s: any) => s.id);
        const { data: subKeys,error: keysError } = await supabase
          .from('question_answer_keys')
          .select('subquestion_id, answer_key, solution, marking_rubric')
          .in('subquestion_id', subIds);

        if (keysError) { toast.error(keysError.message); return; }
        const subKeysMap: Record<string, { answer_key: string; solution: string; marking_rubric: string[] }> = {};
        (subKeys || []).forEach((k: any) => {
          if (k.subquestion_id) {
            subKeysMap[k.subquestion_id] = {
              answer_key: k.answer_key || '',
              solution: k.solution || '', marking_rubric: k.marking_rubric || []
            };
          }
        });

        subs = subData.map((s: any) => ({
          id: s.id,
          question_id: s.question_id,
          label: s.label,
          marks: s.marks,
          answer_type: s.answer_type,
          command_term: s.command_term,
          sub_question_text: s.sub_question_text,
          order_index: s.order_index,
          marking_rubric: subKeysMap[s.id]?.marking_rubric, answer_config: s.answer_config, sub_question_image_url: s.sub_question_image_url,
          answer_key: subKeysMap[s.id]?.answer_key || '',
          solution: subKeysMap[s.id]?.solution || ''
        }));
      }
    }

    setFormData({
      myp_year: question.myp_year,
      strand: question.strand,
      topic: question.topic,
      subtopic: question.subtopic || '',
      difficulty: question.difficulty,
      question_type: question.question_type,
      command_term: question.command_term || 'Solve',
      question_text: question.question_text,
      image_url: question.image_url || '',
      marks: question.marks,
      answer_type: question.answer_type,
      is_published: question.is_published,
      review_status: question.review_status,
      marking_rubric: question.marking_rubric, answer_config: question.answer_config,
      answer_key: question.answer_key || '',
      solution: question.solution || '',
      subquestions: subs
    });
    setIsFormOpen(true);
  };

  const handleOpenPreview = async (question: BankQuestion) => {
    setPreviewQuestion(question);
    if (question.question_type === 'multi_part') {
      const { data: subData,error: partError } = await supabase
        .from('question_subquestions')
        .select('*')
        .eq('question_id', question.id)
        .order('order_index', { ascending: true });

      if (subData) {
        const subIds = subData.map((s: any) => s.id);
        const { data: subKeys,error: keysError } = await supabase
          .from('question_answer_keys')
          .select('subquestion_id, answer_key, solution, marking_rubric')
          .in('subquestion_id', subIds);

        const keyMap: Record<string, any> = {};
        (subKeys || []).forEach((k: any) => {
          if (k.subquestion_id) keyMap[k.subquestion_id] = k;
        });

        setPreviewSubquestions(
          subData.map((s: any) => ({
            ...s,
            answer_key: keyMap[s.id]?.answer_key || '',
            solution: keyMap[s.id]?.solution || ''
          }))
        );
      }
    } else {
      setPreviewSubquestions([]);
    }
    setIsPreviewOpen(true);
  };

  // D3-02: Complete CRUD for Question, Subquestions, and Isolated Answer Keys
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      toast.error('Topic is required');
      return;
    }
    if (!formData.question_text.trim()) {
      toast.error('Question text is required');
      return;
    }

    // Validation for multi-part questions
    if (formData.question_type === 'multi_part') {
      if (formData.subquestions.length === 0) {
        toast.error('Please add at least one subquestion for a multi-part question.');
        return;
      }
      for (const sub of formData.subquestions) {
        if (!sub.sub_question_text.trim()) {
          toast.error(`Subquestion (${sub.label}) text cannot be empty.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Calculate total marks accurately
      const totalMarks =
        formData.question_type === 'multi_part'
          ? formData.subquestions.reduce((sum, s) => sum + (Number(s.marks) || 1), 0)
          : Number(formData.marks) || 1;

      const payload = {
        programme: 'MYP',
        subject: 'mathematics',
        myp_year: formData.myp_year,
        strand: formData.strand,
        topic: formData.topic.trim(),
        subtopic: formData.subtopic.trim() || null,
        difficulty: formData.difficulty,
        question_type: formData.question_type,
        command_term: formData.command_term.trim() || null,
        question_text: formData.question_text.trim(),
        image_url: formData.image_url.trim() || null,
        marks: totalMarks,
        answer_type: formData.answer_type,
        is_published: formData.is_published,
        review_status: formData.is_published ? 'approved' : formData.review_status
      };

      const { data: savedId, error } = await supabase.rpc('save_bank_question', {
        p_id: editingId,
        p_question: practiceQuestion.parse({ ...payload, answer_config: {...formData.answer_config}, marking_rubric: formData.marking_rubric, answer_key: formData.answer_key, solution: formData.solution,
          subquestions: formData.subquestions.map(part => ({ ...part, answer_config: {...part.answer_config} })) })
      });
      if (error) throw error;

      toast.success(
        editingId && savedId !== editingId ? 'Revision saved. Earlier attempts retain the archived version.' : editingId ? 'Question updated.' : 'New question created in Question Bank.'
      );
      setIsFormOpen(false);
      fetchQuestions();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Database error occurred during save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (question: BankQuestion) => {
    const newStatus = !question.is_published;
    try {
      const { error } = await supabase
        .from('question_bank')
        .update({
          is_published: newStatus,
          review_status: newStatus ? 'approved' : 'draft'
        })
        .eq('id', question.id);

      if (error) throw error;
      toast.success(newStatus ? 'Question published' : 'Question reverted to draft');
      fetchQuestions();
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Archive this question and remove it from the catalogue?')) {
      return;
    }

    try {
      const { error } = await supabase.from('question_bank').update({ review_status: 'archived', is_published: false }).eq('id', id);
      if (error) throw error;
      toast.success('Question archived.');
      fetchQuestions();
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`);
    }
  };

  // Subquestion management helpers
  const handleAddSubquestion = () => {
    const nextLabel = String.fromCharCode(97 + formData.subquestions.length); // a, b, c...
    setFormData((prev) => ({
      ...prev,
      subquestions: [
        ...prev.subquestions,
        {
          label: nextLabel,
          marks: 1,
          answer_type: 'text_equation',
          command_term: 'Solve',
          sub_question_text: '',
          order_index: prev.subquestions.length,
          answer_key: '',
          solution: ''
        }
      ]
    }));
  };

  const handleRemoveSubquestion = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      subquestions: prev.subquestions.filter((_, i) => i !== idx)
    }));
  };

  const filteredQuestions = questions;
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              IB MYP Mathematics
            </span>
            <span className="text-xs text-indigo-200">
              Question Bank
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Question Bank Management</h2>
          <p className="text-sm text-indigo-200/90 max-w-2xl">
            Administer independent IB MYP Mathematics questions, multi-part subquestions, isolated protected answer keys,
            and review queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCsvImportOpen(true)}
            variant="outline"
            className="border-indigo-300/30 bg-indigo-950/40 text-white hover:bg-indigo-900/60"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import (CSV)
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Question
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input className="w-40" aria-label="Topic" placeholder="Topic" value={topic} onChange={e => {setTopic(e.target.value); setPage(0);}} />
        <select aria-label="Question type" value={kind} onChange={e => {setKind(e.target.value); setPage(0);}}>
          <option value="all">All question types</option><option value="single">Single</option><option value="multi_part">Multi-part</option>
        </select>
        <Button disabled={!page} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>{total} questions · Page {page + 1}</span>
        <Button disabled={(page + 1) * 20 >= total} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
      {/* Filter Toolbar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search topic or equation..."
                value={searchQuery}
                onChange={(e) => {setPage(0); setSearchQuery(e.target.value);}}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select value={filterYear} onValueChange={v => { setPage(0); setFilterYear(v); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All MYP Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All MYP Years</SelectItem>
                {MYP_YEARS.map((yr) => (
                  <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStrand} onValueChange={v => { setPage(0); setFilterStrand(v); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Strands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strands</SelectItem>
                {STRANDS.map((st) => (
                  <SelectItem key={st} value={st}>{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={v => { setPage(0); setFilterDifficulty(v); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {DIFFICULTIES.map((df) => (
                  <SelectItem key={df} value={df} className="capitalize">{df}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={v => { setPage(0); setFilterStatus(v); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="review_pending">Review Pending</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions Data Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              Questions ({total})
            </CardTitle>
            <CardDescription className="text-xs">
              Showing questions matching the current curriculum filter criteria.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-medium">
            Scope: IB MYP Math Only
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-sm">Loading Question Bank...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <div className="text-base font-semibold text-slate-800">No questions found</div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No questions match your current filters. Add a new question or import questions via CSV.
              </p>
              <Button onClick={handleOpenCreate} size="sm" className="bg-indigo-600 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Question
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs">
                    <TableHead className="w-[110px]">Year / Strand</TableHead>
                    <TableHead className="w-[140px]">Topic</TableHead>
                    <TableHead className="w-[90px]">Difficulty</TableHead>
                    <TableHead className="w-[90px]">Command</TableHead>
                    <TableHead>Question Preview (KaTeX)</TableHead>
                    <TableHead className="w-[60px] text-center">Marks</TableHead>
                    <TableHead className="w-[110px] text-center">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredQuestions.map((q) => (
                    <TableRow key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-slate-800">{q.myp_year}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                          {q.strand}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-slate-900 truncate max-w-[130px]" title={q.topic}>
                          {q.topic}
                        </div>
                        {q.subtopic && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                            {q.subtopic}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] capitalize font-medium ${
                            q.difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {q.difficulty}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {q.command_term || 'Solve'}
                        </span>
                      </TableCell>

                      <TableCell className="max-w-[340px]">
                        <div className="line-clamp-2 text-slate-800 font-serif">
                          {renderFinalText(q.question_text)}
                        </div>
                        {q.question_type === 'multi_part' && (
                          <Badge variant="outline" className="mt-1 text-[9px] bg-indigo-50/50 text-indigo-700 border-indigo-200">
                            Multi-Part Question
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-bold text-slate-700">
                        {q.marks}
                      </TableCell>

                      <TableCell className="text-center">
                        <button
                          type="button"
                          aria-label={q.is_published ? "Unpublish question" : "Approve and publish question"}
                          onClick={() => handleTogglePublish(q)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            q.is_published
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : q.review_status === 'review_pending'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {q.is_published ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Published
                            </>
                          ) : q.review_status === 'review_pending' ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Review
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-500" />
                              {q.review_status === 'archived' ? 'Archived' : 'Draft'}
                            </>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                            onClick={() => handleOpenPreview(q)}
                            title="Preview question"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                            onClick={() => handleOpenEdit(q)}
                            title="Edit question"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-rose-600"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Archive question"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Question Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Calculator className="w-5 h-5 text-indigo-600" />
              {editingId ? 'Edit Question' : 'Create New Question in Bank'}
            </DialogTitle>
            <DialogDescription>
              Author independent IB MYP Mathematics questions. Enforces standard MYP Year, Strand,
              command terms, KaTeX math formatting, and separate protected answer keys.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuestion} className="space-y-5 py-2">
            {/* Top attributes grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border">
              <div>
                <Label className="text-xs font-semibold text-slate-700">MYP Year *</Label>
                <Select
                  value={formData.myp_year}
                  onValueChange={(val: any) => setFormData({ ...formData, myp_year: val })}
                >
                  <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MYP_YEARS.map((yr) => (
                      <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Strand *</Label>
                <Select
                  value={formData.strand}
                  onValueChange={(val: any) => setFormData({ ...formData, strand: val })}
                >
                  <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRANDS.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Difficulty *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(val: any) => setFormData({ ...formData, difficulty: val })}
                >
                  <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((df) => (
                      <SelectItem key={df} value={df} className="capitalize">{df}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Command Term *</Label>
                <Select
                  value={formData.command_term}
                  onValueChange={(val) => setFormData({ ...formData, command_term: val })}
                >
                  <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMAND_TERMS.map((ct) => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Topic & Subtopic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Topic *</Label>
                <Input
                  placeholder="e.g. Linear Equations and Inequalities"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="mt-1 h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Subtopic (Optional)</Label>
                <Input
                  placeholder="e.g. Two-step equations"
                  value={formData.subtopic}
                  onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            {/* Question Text & Math KaTeX Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Question Text & LaTeX Formulas *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Use <code className="text-indigo-600 font-mono">$...$</code> for inline or <code className="text-indigo-600 font-mono">$$...$$</code> for block math
                </span>
              </div>

              <UnifiedMathEditor
                value={formData.question_text}
                onChange={(val) => setFormData({ ...formData, question_text: val })}
                mode="mixed_prose"
                placeholder="Write question here. e.g. Solve for $x$ given: $$3x^2 - 12 = 0$$"
                ariaLabel="Question Text with Math"
                minHeight="120px"
              />
            </div>

            {/* Marks & Image URL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Total Marks {formData.question_type === 'multi_part' && '(Auto-calculated from parts)'} *
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={
                    formData.question_type === 'multi_part'
                      ? formData.subquestions.reduce((sum, s) => sum + (Number(s.marks) || 1), 0)
                      : formData.marks
                  }
                  onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                  disabled={formData.question_type === 'multi_part'}
                  className="mt-1 h-9 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Diagram / Image URL (Optional)</Label>
                <QuestionMediaUploader bank kind="stem" value={formData.image_url || ''} onChange={image_url=>setFormData(prev=>({...prev,image_url}))}/>
              </div>
            </div>

            {/* Answer Type & Multi-Part Toggle */}
            <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">Multi-Part Question?</div>
                  <div className="text-xs text-muted-foreground">
                    Break question into subquestions (a), (b), (c) with independent marks and answer keys.
                  </div>
                </div>
                <Switch
                  checked={formData.question_type === 'multi_part'}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      question_type: checked ? 'multi_part' : 'single',
                      subquestions:
                        checked && formData.subquestions.length === 0
                          ? [
                              {
                                label: 'a',
                                marks: 1,
                                answer_type: 'text_equation',
                                sub_question_text: '',
                                order_index: 0,
                                answer_key: '',
                                solution: ''
                              }
                            ]
                          : formData.subquestions
                    })
                  }
                />
              </div>

              {formData.question_type === 'single' ? (
                /* Protected Single Question Answer Key & Solution */
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Protected Answer Key & Solution (Isolated Database Table)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Correct Answer Key *</Label>
                      <UnifiedMathEditor
                        value={formData.answer_key}
                        onChange={(val) => setFormData({ ...formData, answer_key: val })}
                        mode="pure_latex"
                        placeholder="e.g. x = 5 or \frac{3}{4}"
                        ariaLabel="Correct Answer Key"
                        minHeight="42px"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Answer Block Type</Label>
                      <Select
                        value={formData.answer_type}
                        onValueChange={(val: any) => setFormData({ ...formData, answer_type: val })}
                      >
                        <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text_equation">Text with Equation (MathLive)</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="working_box">Extended Working Box</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <PracticeMarkingFields value={formData} change={fields => setFormData({...formData, ...fields, answer_type: formData.answer_type})} />
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Step-by-step solution
                    </Label>
                    <UnifiedMathEditor
                      value={formData.solution}
                      onChange={(val) => setFormData({ ...formData, solution: val })}
                      mode="mixed_prose"
                      placeholder="Detail step 1, step 2, and scoring breakdown... Use $...$ for formulas"
                      ariaLabel="Step-by-step solution"
                      minHeight="90px"
                    />
                  </div>
                </div>
              ) : (
                /* Multi-Part Subquestions Editor (D3-02 Persistent) */
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Subquestions ({formData.subquestions.length})
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddSubquestion}
                      className="h-7 text-xs bg-white"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Part
                    </Button>
                  </div>

                  {formData.subquestions.map((sub, idx) => (
                    <div key={idx} className="p-3 bg-white border rounded-lg space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono uppercase font-bold text-indigo-700">
                          Part ({sub.label})
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSubquestion(idx)}
                          className="h-6 w-6 text-rose-500 hover:text-rose-700"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div>
                        <Label className="text-[10px] text-muted-foreground font-semibold">Subquestion Text</Label>
                        <UnifiedMathEditor
                          value={sub.sub_question_text}
                          onChange={(val) => {
                            const updated = [...formData.subquestions];
                            updated[idx].sub_question_text = val;
                            setFormData({ ...formData, subquestions: updated });
                          }}
                          mode="mixed_prose"
                          placeholder={`Subquestion text for (${sub.label})... Use $...$ for formulas`}
                          ariaLabel={`Subquestion (${sub.label}) text`}
                          minHeight="80px"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground font-semibold">Marks</Label>
                          <Input
                            type="number"
                            min="1"
                            value={sub.marks}
                            onChange={(e) => {
                              const updated = [...formData.subquestions];
                              updated[idx].marks = Number(e.target.value) || 1;
                              setFormData({ ...formData, subquestions: updated });
                            }}
                            className="h-7 text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground font-semibold">Command Term</Label>
                          <Select
                            value={sub.command_term || 'Solve'}
                            onValueChange={(val) => {
                              const updated = [...formData.subquestions];
                              updated[idx].command_term = val;
                              setFormData({ ...formData, subquestions: updated });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMAND_TERMS.map((ct) => (
                                <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Protected Answer Key *</Label>
                          <UnifiedMathEditor
                            value={sub.answer_key || ''}
                            onChange={(val) => {
                              const updated = [...formData.subquestions];
                              updated[idx].answer_key = val;
                              setFormData({ ...formData, subquestions: updated });
                            }}
                            mode="pure_latex"
                            placeholder="Official answer key"
                            ariaLabel={`Part (${sub.label}) Answer Key`}
                            minHeight="38px"
                          />
                        </div>
                      </div>

                      <div>
                        <label>Part answer type <select value={sub.answer_type} onChange={e => setFormData({...formData,subquestions: formData.subquestions.map((part,i) => i===idx ? {...part, answer_type:e.target.value as BankSubquestion['answer_type']} : part)})}>
                          {['short_answer','multiple_choice','text_equation','working_box'].map(kind=><option key={kind}>{kind}</option>)}
                        </select></label>
                        <QuestionMediaUploader bank kind="part" value={sub.sub_question_image_url || ''} onChange={url=>setFormData(prev=>({...prev,subquestions:prev.subquestions.map((part,i)=>i===idx?{...part,sub_question_image_url:url}:part)}))}/>
                        <PracticeMarkingFields value={sub} change={fields=>setFormData({...formData,subquestions:formData.subquestions.map((part,i)=>i===idx?{...part,...fields,answer_type:part.answer_type}:part)})} />
                        <Label>Part solution</Label>
                        <UnifiedMathEditor
                          value={sub.solution || ''}
                          onChange={(val) => {
                            const updated = [...formData.subquestions];
                            updated[idx].solution = val;
                            setFormData({ ...formData, subquestions: updated });
                          }}
                          mode="mixed_prose"
                          placeholder="Step-by-step scoring rubric"
                          ariaLabel={`Part (${sub.label}) Solution`}
                          minHeight="70px"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publication / Review Status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-xl">
              <div>
                <div className="text-sm font-semibold text-slate-800">Publish Immediately</div>
                <div className="text-xs text-muted-foreground">
                  When enabled, question is approved and immediately accessible for student practice.
                </div>
              </div>
              <Switch
                checked={formData.is_published}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    is_published: val,
                    review_status: val ? 'approved' : 'draft'
                  })
                }
              />
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  'Update Question & Subquestions'
                ) : (
                  'Save to Question Bank'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Question Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg font-bold">
              <span>Question Preview</span>
              {previewQuestion && (
                <Badge variant="outline" className="font-mono text-xs">
                  {previewQuestion.myp_year} • {previewQuestion.strand}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              This is how students will view this question during personalized practice sessions.
            </DialogDescription>
          </DialogHeader>

          {previewQuestion && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                <span className="font-semibold text-slate-800">{previewQuestion.topic}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                  [{previewQuestion.marks} Mark{previewQuestion.marks > 1 ? 's' : ''}]
                </span>
              </div>

              {/* Main Question Text */}
              <div className="text-base text-slate-900 leading-relaxed font-serif p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                {renderFinalText(previewQuestion.question_text)}
              </div>

              <QuestionDiagram value={previewQuestion.image_url} label="Question diagram"/>
              {/* Multi-part Subquestions Preview */}
              {previewSubquestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Question Parts
                  </div>
                  {previewSubquestions.map((sub, idx) => (
                    <div key={idx} className="p-3 bg-white border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-700 font-mono">
                          Part ({sub.label})
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          [{sub.marks} mark{sub.marks > 1 ? 's' : ''}]
                        </span>
                      </div>
                      <div className="text-sm font-serif text-slate-900">
                        {renderFinalText(sub.sub_question_text)}
                        <QuestionDiagram value={sub.sub_question_image_url} label={'Part '+sub.label+' diagram'}/>
                      </div>
                      {sub.answer_key && (
                        <div className="p-2 bg-amber-50/60 rounded border border-amber-200/60 text-xs">
                          <span className="font-semibold text-amber-900">Part ({sub.label}) Key: </span>
                          <span className="font-mono text-slate-800">{sub.answer_key}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Single Question Admin Solution Display */}
              {previewQuestion.question_type === 'single' && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    Protected Answer Key & Solution (Admin Only)
                  </div>
                  <div className="text-xs text-slate-800 font-mono">
                    <span className="font-semibold">Answer Key: </span>
                    {previewQuestion.answer_key || 'None specified'}
                  </div>
                  {previewQuestion.solution && (
                    <div className="text-xs text-slate-700 pt-1 border-t border-amber-200/60 font-serif">
                      <span className="font-semibold font-sans">Solution: </span>
                      {renderFinalText(previewQuestion.solution)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Import Modal */}
      <CSVImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onSuccess={fetchQuestions}
      />
    </div>
  );
};

export default QuestionBankManager;
