import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, Award, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import TopicSelector from '@/components/admin/TopicSelector';
import SectionCard from '@/components/admin/mock-test-creator/SectionCard';
import {
  createSection,
  createQuestionGroup,
  createSubQuestion,
  createDefaultState,
  getTotalMarks,
} from '@/components/admin/mock-test-creator/types';
import type {
  CreatorState, CreatorSection, CreatorQuestionGroup, CreatorSubQuestion
} from '@/components/admin/mock-test-creator/types';

const AdminPracticeCreate = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditing = !!editId;

  const [state, setState] = useState<CreatorState>(() => {
    const defaultState = createDefaultState();
    return { ...defaultState, title: '', durationMinutes: 0 };
  });
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const section = state.sections[0];
  const group = section?.questionGroups[0];
  const totalMarks = getTotalMarks(state.sections);

  // Load existing practice set for editing
  useEffect(() => {
    if (!editId) return;
    const loadPracticeSet = async () => {
      setLoadingEdit(true);
      try {
        const { data: ps, error: psErr } = await supabase
          .from('practice_sets')
          .select('*')
          .eq('id', editId)
          .single();
        if (psErr) throw psErr;

        const { data: pqs, error: pqErr } = await supabase
          .from('practice_questions')
          .select('*')
          .eq('practice_set_id', editId)
          .order('order_index');
        if (pqErr) throw pqErr;

        const mainQ = pqs?.[0];
        let subQuestions: CreatorSubQuestion[] = [];

        if (mainQ) {
          const { data: psqs } = await supabase
            .from('practice_sub_questions')
            .select('*')
            .eq('question_id', mainQ.id)
            .order('order_index');

          subQuestions = (psqs || []).map((sq: any, i: number) => ({
            id: sq.id,
            label: sq.label || String.fromCharCode(97 + i),
            text: sq.sub_question_text || '',
            imageUrl: sq.sub_question_image_url || '',
            marks: sq.marks || 1,
            answerKey: sq.answer_key || '',
            answerKeyEquations: [],
            wordLimit: '',
            commandTerm: sq.command_term || '',
            answerBlockType: sq.answer_type || 'text_equation',
            answerBlockConfig: sq.answer_block_config || {},
            solution: sq.solution || '',
          }));
        }

        const defaultState = createDefaultState();
        const sec = defaultState.sections[0];
        const grp = sec.questionGroups[0];

        setState({
          ...defaultState,
          title: ps.title,
          subject: ps.subject,
          topic: ps.topic,
          durationMinutes: 0,
          sections: [{
            ...sec,
            questionGroups: [{
              ...grp,
              stem: mainQ?.question_text || '',
              stemImageUrl: mainQ?.question_image_url || '',
              subQuestions,
            }]
          }]
        });
        setDifficulty(ps.difficulty || 'medium');
      } catch (err: any) {
        console.error('Load error:', err);
        toast.error('Failed to load practice set');
        navigate('/admin/tests');
      } finally {
        setLoadingEdit(false);
      }
    };
    loadPracticeSet();
  }, [editId]);

  const updateQuestionGroup = useCallback((sectionId: string, groupId: string, updates: Partial<CreatorQuestionGroup>) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, questionGroups: s.questionGroups.map(g => g.id === groupId ? { ...g, ...updates } : g) }
          : s
      ),
    }));
  }, []);

  const addSubQuestion = useCallback((sectionId: string, groupId: string) => {
    const currentGroup = state.sections.find(s => s.id === sectionId)?.questionGroups.find(g => g.id === groupId);
    const newSub = createSubQuestion(currentGroup?.subQuestions.length ?? 0);
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
            ...s,
            questionGroups: s.questionGroups.map(g =>
              g.id === groupId ? { ...g, subQuestions: [...g.subQuestions, newSub] } : g
            ),
          }
          : s
      ),
    }));
    setTimeout(() => {
      const el = document.getElementById(`sub-question-${newSub.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [state.sections]);

  const updateSubQuestion = useCallback((sectionId: string, groupId: string, subId: string, updates: Partial<CreatorSubQuestion>) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
            ...s,
            questionGroups: s.questionGroups.map(g =>
              g.id === groupId
                ? { ...g, subQuestions: g.subQuestions.map(sq => sq.id === subId ? { ...sq, ...updates } : sq) }
                : g
            ),
          }
          : s
      ),
    }));
  }, []);

  const deleteSubQuestion = useCallback((sectionId: string, groupId: string, subId: string) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
            ...s,
            questionGroups: s.questionGroups.map(g =>
              g.id === groupId
                ? { ...g, subQuestions: g.subQuestions.filter(sq => sq.id !== subId) }
                : g
            ),
          }
          : s
      ),
    }));
  }, []);

  const handleSave = async (publish: boolean) => {
    if (!state.title.trim()) { toast.error('Enter a title'); return; }
    if (!state.subject) { toast.error('Select a subject'); return; }
    if (!state.topic.trim()) { toast.error('Enter a topic'); return; }
    if (!group) { toast.error('Add question content'); return; }
    if (!group.stem.trim() && group.subQuestions.length === 0) {
      toast.error('Add question text or sub-questions'); return;
    }
    for (const sq of group.subQuestions) {
      if (!sq.text.trim()) { toast.error(`Sub-question (${sq.label}) is missing text`); return; }
    }

    setLoading(true);
    try {
      if (isEditing) {
        // Update existing practice set
        const { error: updateErr } = await supabase
          .from('practice_sets')
          .update({
            title: state.title,
            subject: state.subject,
            topic: state.topic,
            difficulty,
            is_published: publish,
          })
          .eq('id', editId);
        if (updateErr) throw updateErr;

        // Get existing question
        const { data: existingQs } = await supabase
          .from('practice_questions')
          .select('id')
          .eq('practice_set_id', editId!);

        const mainQId = existingQs?.[0]?.id;

        if (mainQId) {
          // Update main question
          await supabase.from('practice_questions').update({
            question_text: group.stem,
            question_image_url: group.stemImageUrl || null,
          }).eq('id', mainQId);

          // Delete old sub-questions and re-insert
          await supabase.from('practice_sub_questions').delete().eq('question_id', mainQId);

          if (group.subQuestions.length > 0) {
            const subInserts = group.subQuestions.map((sq, i) => ({
              question_id: mainQId,
              label: sq.label,
              sub_question_text: sq.text,
              sub_question_image_url: sq.imageUrl || null,
              marks: sq.marks,
              answer_type: sq.answerBlockType || 'text_equation',
              answer_block_config: { ...(sq.answerBlockConfig || {}), answerKeyEquations: sq.answerKeyEquations || [] } as any,
              answer_key: sq.answerKey || null,
              solution: (sq as any).solution || null,
              command_term: sq.commandTerm || null,
              order_index: i,
            }));
            const { error: sqErr } = await supabase.from('practice_sub_questions').insert(subInserts);
            if (sqErr) throw sqErr;
          }
        }

        toast.success(`Practice set ${publish ? 'published' : 'updated'}!`);
      } else {
        // Create new practice set
        const { data: ps, error: psErr } = await supabase
          .from('practice_sets')
          .insert({
            title: state.title,
            subject: state.subject,
            topic: state.topic,
            difficulty,
            is_published: publish,
          })
          .select()
          .single();
        if (psErr) throw psErr;

        // Create main question
        const { data: pq, error: pqErr } = await supabase
          .from('practice_questions')
          .insert({
            practice_set_id: ps.id,
            question_text: group.stem,
            question_image_url: group.stemImageUrl || null,
            order_index: 0,
          })
          .select()
          .single();
        if (pqErr) throw pqErr;

        // Create sub-questions
        if (group.subQuestions.length > 0) {
          const subInserts = group.subQuestions.map((sq, i) => ({
            question_id: pq.id,
            label: sq.label,
            sub_question_text: sq.text,
            sub_question_image_url: sq.imageUrl || null,
            marks: sq.marks,
            answer_type: sq.answerBlockType || 'text_equation',
            answer_block_config: { ...(sq.answerBlockConfig || {}), answerKeyEquations: sq.answerKeyEquations || [] } as any,
            answer_key: sq.answerKey || null,
            solution: (sq as any).solution || null,
            command_term: sq.commandTerm || null,
            order_index: i,
          }));
          const { error: sqErr } = await supabase.from('practice_sub_questions').insert(subInserts);
          if (sqErr) throw sqErr;
        }

        toast.success(`Practice set ${publish ? 'published' : 'saved as draft'}!`);
      }
      navigate('/admin/tests');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-background flex">
        <AdminSidebar activeTab="tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar activeTab="tests" onTabChange={() => {}} />
      <div className="flex-1 ml-64">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tests')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Badge variant="secondary" className="gap-1">
                <BookOpen className="w-3 h-3" /> {isEditing ? 'Edit' : 'Create'} Practice Set
              </Badge>
              <Input
                value={state.title}
                onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Untitled Practice Set"
                className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1"><Award className="w-3 h-3" />{totalMarks} marks</Badge>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={loading}>
                <Save className="w-4 h-4 mr-1" /> Draft
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={loading}>
                <Upload className="w-4 h-4 mr-1" /> {loading ? 'Saving...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Practice info card */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Subject *</label>
                  <Select value={state.subject} onValueChange={(v) => setState(prev => ({ ...prev, subject: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
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
                  <label className="text-sm font-medium mb-1 block">Topic *</label>
                  <TopicSelector
                    subject={state.subject}
                    value={state.topic}
                    onChange={(v) => setState(prev => ({ ...prev, topic: v }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

          {/* Question builder */}
          {section && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Question Builder</h3>
              <p className="text-sm text-muted-foreground">
                Build your practice question below. Add sub-questions (a, b, c...) for multi-part problems.
                Supports text, math, images, and all interactive answer types.
              </p>
              <SectionCard
                section={{ ...section, title: 'Question' }}
                allSections={[section]}
                onUpdate={() => {}}
                onDelete={() => {}}
                onUpdateGroup={(groupId, updates) => updateQuestionGroup(section.id, groupId, updates)}
                onDeleteGroup={() => {}}
                onAddGroup={() => {}}
                hideAddGroup
                onUpdateSub={(groupId, subId, updates) => updateSubQuestion(section.id, groupId, subId, updates)}
                onDeleteSub={(groupId, subId) => deleteSubQuestion(section.id, groupId, subId)}
                onAddSub={(groupId) => addSubQuestion(section.id, groupId)}
              />
            </div>
          )}

          <div className="h-20" />
        </div>
      </div>
    </div>
  );
};

export default AdminPracticeCreate;
