import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Upload, Plus, FileSpreadsheet,
  Wand2, Database as DatabaseIcon, Clock, Award
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import QuestionBankSelector from '@/components/admin/QuestionBankSelector';
import SectionCard from '@/components/admin/mock-test-creator/SectionCard';
import CSVImportModal from '@/components/admin/mock-test-creator/CSVImportModal';
import {
  createSection,
  createQuestionGroup,
  createSubQuestion,
  getNextQuestionNumber,
  getTotalMarks,
  getTotalQuestions,
  genId,
} from '@/components/admin/mock-test-creator/types';
import type {
  CreatorState,
  CreatorSection,
  CreatorQuestionGroup,
  CreatorSubQuestion,
} from '@/components/admin/mock-test-creator/types';
import type { Database } from '@/integrations/supabase/types';
import type { AnswerBlockType } from '@/components/admin/AnswerBlockTypeSelector';

type TestSubject = Database['public']['Enums']['test_subject'];

/** Transform database rows into CreatorState sections */
function buildSectionsFromDB(
  dbSections: any[],
  dbQuestions: any[]
): CreatorSection[] {
  if (!dbSections || dbSections.length === 0) {
    const section: CreatorSection = {
      id: genId(),
      title: 'Part A',
      order: 0,
      questionGroups: dbQuestions.map(q => questionToGroup(q)),
    };
    return [section];
  }

  const sorted = [...dbSections].sort((a, b) => a.section_order - b.section_order);
  return sorted.map((s, idx) => {
    const sectionQuestions = dbQuestions
      .filter(q => q.section_id === s.id)
      .sort((a, b) => a.question_number - b.question_number);

    return {
      id: s.id,
      title: s.title,
      order: idx,
      questionGroups: sectionQuestions.map(q => questionToGroup(q)),
    };
  });
}

function questionToGroup(q: any): CreatorQuestionGroup {
  return {
    id: q.id,
    number: q.question_number,
    stem: q.question_text || '',
    stemImageUrl: q.question_image_url || '',
    marks: q.marks || 1,
    difficulty: q.difficulty || 'medium',
    commandTerm: q.command_term || '',
    category: q.category || '',
    diagramDescription: q.diagram_description || '',
    answerBlockType: (q.answer_block_type || 'text_equation') as AnswerBlockType,
    answerBlockConfig: q.answer_block_config || {},
    answerKey: q.answer_key || '',
    wordLimit: q.word_limit?.toString() || '',
    subQuestions: (q.mock_sub_questions || [])
      .sort((a: any, b: any) => a.sub_question_label.localeCompare(b.sub_question_label))
      .map((sq: any): CreatorSubQuestion => ({
        id: sq.id,
        label: sq.sub_question_label,
        text: sq.sub_question_text,
        imageUrl: sq.sub_question_image_url || '',
        marks: sq.marks,
        answerKey: sq.answer_key || '',
        wordLimit: sq.word_limit?.toString() || '',
        commandTerm: sq.command_term || '',
        answerBlockType: (sq.answer_block_type || 'text_equation') as AnswerBlockType,
        answerBlockConfig: sq.answer_block_config || {},
      })),
  };
}

const AdminMockTestEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CreatorState | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showAIParser, setShowAIParser] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  // Fetch test with sections, questions, sub-questions
  const { data: mockTest, isLoading } = useQuery({
    queryKey: ['mockTestEdit', id],
    queryFn: async () => {
      const [testRes, sectionsRes, questionsRes] = await Promise.all([
        supabase.from('mock_tests').select('*').eq('id', id!).single(),
        supabase.from('mock_test_sections').select('*').eq('mock_test_id', id!),
        supabase.from('mock_questions').select('*, mock_sub_questions(*)').eq('mock_test_id', id!),
      ]);
      if (testRes.error) throw testRes.error;
      return {
        test: testRes.data,
        sections: sectionsRes.data || [],
        questions: questionsRes.data || [],
      };
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Populate state from DB once
  useEffect(() => {
    if (mockTest && !state) {
      const sections = buildSectionsFromDB(mockTest.sections, mockTest.questions);
      setState({
        title: mockTest.test.title,
        subject: mockTest.test.subject,
        topic: mockTest.test.topic,
        durationMinutes: mockTest.test.time_limit_minutes || 120,
        sections,
      });
    }
  }, [mockTest, state]);

  // --- Section operations ---
  const addSection = useCallback(() => {
    setState(prev => prev ? {
      ...prev,
      sections: [...prev.sections, createSection(prev.sections.length)],
    } : prev);
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<CreatorSection>) => {
    setState(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
    } : prev);
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setState(prev => prev ? {
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    } : prev);
  }, []);

  // --- Question group operations ---
  const addQuestionGroup = useCallback((sectionId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const nextNum = getNextQuestionNumber(prev.sections);
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId
            ? { ...s, questionGroups: [...s.questionGroups, createQuestionGroup(nextNum)] }
            : s
        ),
      };
    });
  }, []);

  const updateQuestionGroup = useCallback((sectionId: string, groupId: string, updates: Partial<CreatorQuestionGroup>) => {
    setState(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, questionGroups: s.questionGroups.map(g => g.id === groupId ? { ...g, ...updates } : g) }
          : s
      ),
    } : prev);
  }, []);

  const deleteQuestionGroup = useCallback((sectionId: string, groupId: string) => {
    setState(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, questionGroups: s.questionGroups.filter(g => g.id !== groupId) }
          : s
      ),
    } : prev);
  }, []);

  // --- Sub-question operations ---
  const addSubQuestion = useCallback((sectionId: string, groupId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const group = prev.sections
        .find(s => s.id === sectionId)
        ?.questionGroups.find(g => g.id === groupId);
      const newSub = createSubQuestion(group?.subQuestions.length ?? 0);

      const newState = {
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
      };

      // Scroll to the new sub-question after render
      setTimeout(() => {
        const el = document.getElementById(`sub-question-${newSub.id}`);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);

      return newState;
    });
  }, []);

  const updateSubQuestion = useCallback((sectionId: string, groupId: string, subId: string, updates: Partial<CreatorSubQuestion>) => {
    setState(prev => prev ? {
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
    } : prev);
  }, []);

  const deleteSubQuestion = useCallback((sectionId: string, groupId: string, subId: string) => {
    setState(prev => prev ? {
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
    } : prev);
  }, []);

  // --- CSV Import ---
  const handleCSVImport = useCallback((importedSections: CreatorSection[]) => {
    setState(prev => prev ? {
      ...prev,
      sections: [...prev.sections.filter(s => s.questionGroups.some(q => q.stem)), ...importedSections],
    } : prev);
    toast.success('Questions imported from CSV!');
  }, []);

  // --- Save / Publish ---
  const handleSave = async (publish: boolean) => {
    if (!state || !id) return;
    if (!state.title.trim()) { toast.error('Enter a test title'); return; }
    if (!state.subject) { toast.error('Select a subject'); return; }
    if (!state.topic.trim()) { toast.error('Enter a topic'); return; }
    const totalQuestions = getTotalQuestions(state.sections);
    if (totalQuestions === 0) { toast.error('Add at least one question'); return; }

    // Validate all questions have text (same as create page)
    for (const section of state.sections) {
      for (const group of section.questionGroups) {
        if (!group.stem.trim() && group.subQuestions.length === 0) {
          toast.error(`Q${group.number} is missing question text`);
          return;
        }
        for (const sq of group.subQuestions) {
          if (!sq.text.trim()) {
            toast.error(`Q${group.number}(${sq.label}) is missing text`);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      // 1. Update mock test
      const { error: testError } = await supabase
        .from('mock_tests')
        .update({
          title: state.title,
          subject: state.subject as TestSubject,
          topic: state.topic,
          is_published: publish,
          time_limit_minutes: state.durationMinutes,
          total_questions: totalQuestions,
        })
        .eq('id', id);
      if (testError) throw testError;

      // 2. Delete existing sub-questions, questions, sections (correct FK order)
      // First get all question IDs to delete their sub-questions
      const { data: existingQuestions } = await supabase
        .from('mock_questions')
        .select('id')
        .eq('mock_test_id', id);
      
      if (existingQuestions && existingQuestions.length > 0) {
        const questionIds = existingQuestions.map(q => q.id);
        await supabase.from('mock_sub_questions').delete().in('question_id', questionIds);
      }
      await supabase.from('mock_questions').delete().eq('mock_test_id', id);
      await supabase.from('mock_test_sections').delete().eq('mock_test_id', id);

      // 3. Re-create sections & questions
      for (const section of state.sections) {
        const { data: dbSection, error: sectionError } = await supabase
          .from('mock_test_sections')
          .insert({
            mock_test_id: id,
            title: section.title,
            section_order: section.order,
          })
          .select()
          .single();
        if (sectionError) throw sectionError;

        for (const group of section.questionGroups) {
          const hasSubs = group.subQuestions.length > 0;
          const { data: dbQuestion, error: qError } = await supabase
            .from('mock_questions')
            .insert({
              mock_test_id: id,
              section_id: dbSection.id,
              question_number: group.number,
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
              answer_block_config: hasSubs ? {} : (group.answerBlockConfig || {}),
              diagram_description: group.diagramDescription || null,
            })
            .select()
            .single();
          if (qError) throw qError;

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
              answer_block_config: sq.answerBlockConfig || {},
            }));
            const { error: sqError } = await supabase.from('mock_sub_questions').insert(subInserts);
            if (sqError) throw sqError;
          }
        }
      }

      toast.success(`Mock test ${publish ? 'updated and published' : 'updated'}!`);
      navigate('/admin/mock-tests');
    } catch (error: any) {
      console.error('Save error:', error);
      const msg = error?.message || error?.details || 'Unknown error';
      toast.error(`Failed to update mock test: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !state) {
    return (
      <div className="min-h-screen bg-background flex">
        <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 p-6">
          <div className="animate-pulse text-muted-foreground">Loading mock test...</div>
        </div>
      </div>
    );
  }

  const totalMarks = getTotalMarks(state.sections);
  const totalQuestions = getTotalQuestions(state.sections);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
      <div className="flex-1 ml-64">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/mock-tests')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div>
                <Input
                  value={state.title}
                  onChange={(e) => setState(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="Untitled Mock Test"
                  className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1"><Award className="w-3 h-3" />{totalMarks} marks</Badge>
              <Badge variant="outline" className="gap-1">{totalQuestions} Q</Badge>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={loading}>
                <Save className="w-4 h-4 mr-1" /> Save Draft
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={loading}>
                <Upload className="w-4 h-4 mr-1" /> {loading ? 'Saving...' : 'Update & Publish'}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Test info card */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Subject *</label>
                  <Select value={state.subject} onValueChange={(v) => setState(prev => prev ? { ...prev, subject: v } : prev)}>
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
                    onChange={(e) => setState(prev => prev ? { ...prev, topic: e.target.value } : prev)}
                    placeholder="e.g., Algebra, Force & Motion"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Duration (min)</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={state.durationMinutes}
                      onChange={(e) => setState(prev => prev ? { ...prev, durationMinutes: parseInt(e.target.value) || 120 } : prev)}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import toolbar — same as create page */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCSVImport(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAIParser(true)}>
              <Wand2 className="w-4 h-4 mr-1" /> AI Upload
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowQuestionBank(true)}>
              <DatabaseIcon className="w-4 h-4 mr-1" /> Question Bank
            </Button>
          </div>

          {/* Sections */}
          {state.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              allSections={state.sections}
              onUpdate={(updates) => updateSection(section.id, updates)}
              onDelete={() => deleteSection(section.id)}
              onUpdateGroup={(groupId, updates) => updateQuestionGroup(section.id, groupId, updates)}
              onDeleteGroup={(groupId) => deleteQuestionGroup(section.id, groupId)}
              onAddGroup={() => addQuestionGroup(section.id)}
              onUpdateSub={(groupId, subId, updates) => updateSubQuestion(section.id, groupId, subId, updates)}
              onDeleteSub={(groupId, subId) => deleteSubQuestion(section.id, groupId, subId)}
              onAddSub={(groupId) => addSubQuestion(section.id, groupId)}
            />
          ))}

          {/* Add section button */}
          <Button variant="outline" onClick={addSection} className="w-full py-8 border-dashed text-lg text-muted-foreground hover:text-foreground">
            <Plus className="w-6 h-6 mr-2" />
            Add Section (Part {String.fromCharCode(65 + state.sections.length)})
          </Button>

          <div className="h-20" />
        </div>
      </div>

      {/* CSV Import Modal */}
      <CSVImportModal
        open={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onImport={handleCSVImport}
      />

      {/* AI Parser Modal */}
      <Dialog open={showAIParser} onOpenChange={setShowAIParser}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Document Parser</DialogTitle>
            <DialogDescription>Upload PDF, Word, CSV, or images for AI parsing.</DialogDescription>
          </DialogHeader>
          <QuestionUploadCard
            mode="mock"
            onSuccess={(data) => {
              if (data.mockTest) {
                toast.success('Questions parsed! Redirecting...');
                setTimeout(() => navigate(`/admin/mock-tests/edit/${data.mockTest.id}`), 1500);
              }
              setShowAIParser(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Question Bank Selector */}
      <QuestionBankSelector
        open={showQuestionBank}
        onClose={() => setShowQuestionBank(false)}
        onSelectQuestions={(selectedQuestions) => {
          const firstSection = state.sections[0];
          if (!firstSection) return;

          const startNum = getNextQuestionNumber(state.sections);
          const newGroups: CreatorQuestionGroup[] = selectedQuestions.map((q, idx) => ({
            id: genId(),
            number: startNum + idx,
            stem: q.question_text,
            stemImageUrl: q.question_image_url || '',
            marks: q.marks,
            difficulty: q.difficulty || 'medium',
            commandTerm: q.command_term || '',
            category: q.category || '',
            diagramDescription: q.diagram_description || '',
            answerBlockType: (q.answer_block_type || 'text_equation') as AnswerBlockType,
            answerBlockConfig: q.answer_block_config || {},
            answerKey: q.answer_key || '',
            wordLimit: q.word_limit?.toString() || '',
            subQuestions: [],
          }));

          setState(prev => prev ? {
            ...prev,
            sections: prev.sections.map(s =>
              s.id === firstSection.id
                ? { ...s, questionGroups: [...s.questionGroups, ...newGroups] }
                : s
            ),
          } : prev);

          toast.success(`${selectedQuestions.length} questions added from bank`);
        }}
      />
    </div>
  );
};

export default AdminMockTestEdit;
