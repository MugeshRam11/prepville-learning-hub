import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, Award, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
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
import type { Database } from '@/integrations/supabase/types';

type TestSubject = Database['public']['Enums']['test_subject'];

const AdminPracticeCreate = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<CreatorState>(() => {
    const defaultState = createDefaultState();
    return {
      ...defaultState,
      title: '',
      durationMinutes: 0, // no timer for practice
    };
  });
  const [loading, setLoading] = useState(false);

  // In practice mode: only 1 section with 1 question group
  const section = state.sections[0];
  const group = section?.questionGroups[0];
  const totalMarks = getTotalMarks(state.sections);

  // Question group operations (single group only)
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

  // Sub-question operations
  const addSubQuestion = useCallback((sectionId: string, groupId: string) => {
    const currentGroup = state.sections
      .find(s => s.id === sectionId)
      ?.questionGroups.find(g => g.id === groupId);
    const newSub = createSubQuestion(currentGroup?.subQuestions.length ?? 0);

    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              questionGroups: s.questionGroups.map(g =>
                g.id === groupId
                  ? { ...g, subQuestions: [...g.subQuestions, newSub] }
                  : g
              ),
            }
          : s
      ),
    }));

    setTimeout(() => {
      const el = document.getElementById(`sub-question-${newSub.id}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
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

  // Save as practice question (uses mock_tests with exam_type PRACTICE)
  const handleSave = async (publish: boolean) => {
    if (!state.title.trim()) { toast.error('Enter a question title'); return; }
    if (!state.subject) { toast.error('Select a subject'); return; }
    if (!state.topic.trim()) { toast.error('Enter a topic'); return; }
    if (!group) { toast.error('Add question content'); return; }

    if (!group.stem.trim() && group.subQuestions.length === 0) {
      toast.error('Add question text or sub-questions');
      return;
    }

    for (const sq of group.subQuestions) {
      if (!sq.text.trim()) {
        toast.error(`Sub-question (${sq.label}) is missing text`);
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Create mock_test with exam_type PRACTICE
      const { data: mockTest, error: testError } = await supabase
        .from('mock_tests')
        .insert({
          title: state.title,
          subject: state.subject as TestSubject,
          topic: state.topic,
          is_published: publish,
          exam_type: 'PRACTICE' as any,
          time_limit_minutes: 0,
          total_questions: 1,
        })
        .select()
        .single();
      if (testError) throw testError;

      // 2. Create single section
      const { data: dbSection, error: sectionError } = await supabase
        .from('mock_test_sections')
        .insert({
          mock_test_id: mockTest.id,
          title: section.title,
          section_order: 0,
        })
        .select()
        .single();
      if (sectionError) throw sectionError;

      // 3. Create the question
      const hasSubs = group.subQuestions.length > 0;
      const { data: dbQuestion, error: qError } = await supabase
        .from('mock_questions')
        .insert({
          mock_test_id: mockTest.id,
          section_id: dbSection.id,
          question_number: 1,
          question_text: group.stem,
          question_image_url: group.stemImageUrl || null,
          has_sub_questions: hasSubs,
          marks: hasSubs ? group.subQuestions.reduce((s, sq) => s + sq.marks, 0) : group.marks,
          answer_key: hasSubs ? null : (group.answerKey || null),
          word_limit: group.wordLimit ? parseInt(group.wordLimit) : null,
          difficulty: group.difficulty as any,
          category: group.category || null,
          command_term: group.commandTerm || null,
          answer_block_type: hasSubs ? null : group.answerBlockType,
          answer_block_config: hasSubs ? {} : { ...(group.answerBlockConfig || {}), answerKeyEquations: group.answerKeyEquations || [] } as any,
          diagram_description: group.diagramDescription || null,
        })
        .select()
        .single();
      if (qError) throw qError;

      // 4. Create sub-questions
      if (hasSubs) {
        const subInserts = group.subQuestions.map(sq => ({
          question_id: dbQuestion.id,
          sub_question_label: sq.label,
          sub_question_text: sq.text,
          sub_question_image_url: sq.imageUrl || null,
          marks: sq.marks,
          answer_key: sq.answerKey || null,
          word_limit: sq.wordLimit ? parseInt(sq.wordLimit) : null,
          command_term: sq.commandTerm || null,
          answer_block_type: sq.answerBlockType,
          answer_block_config: { ...(sq.answerBlockConfig || {}), answerKeyEquations: sq.answerKeyEquations || [] } as any,
        }));
        const { error: sqError } = await supabase.from('mock_sub_questions').insert(subInserts);
        if (sqError) throw sqError;
      }

      toast.success(`Practice question ${publish ? 'published' : 'saved as draft'}!`);
      navigate('/admin/tests');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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
                <BookOpen className="w-3 h-3" /> Practice Mode
              </Badge>
              <div>
                <Input
                  value={state.title}
                  onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Untitled Practice Question"
                  className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0"
                />
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Input
                    value={state.topic}
                    onChange={(e) => setState(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g., Algebra, Force & Motion"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Single question builder - reuse SectionCard but hide section-level controls */}
          {section && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Question Builder</h3>
              <p className="text-sm text-muted-foreground">
                Build your practice question below. Add sub-questions (a, b, c...) for multi-part problems. 
                Supports text, math, images, and all interactive answer types.
              </p>
              <SectionCard
                section={{ ...section, title: 'Question' }}
                allSections={[section]} // single section = can't delete
                onUpdate={() => {}}
                onDelete={() => {}}
                onUpdateGroup={(groupId, updates) => updateQuestionGroup(section.id, groupId, updates)}
                onDeleteGroup={() => {}} // can't delete the only question
                onAddGroup={() => {}} // can't add more questions in practice mode
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
