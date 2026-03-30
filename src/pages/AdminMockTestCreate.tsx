import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Upload, Plus, FileSpreadsheet, 
  Wand2, Database as DatabaseIcon, Clock, Award 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import QuestionBankSelector from '@/components/admin/QuestionBankSelector';
import SectionCard from '@/components/admin/mock-test-creator/SectionCard';
import CSVImportModal from '@/components/admin/mock-test-creator/CSVImportModal';
import {
  createSection,
  createQuestionGroup,
  createSubQuestion,
  createDefaultState,
  getNextQuestionNumber,
  getTotalMarks,
  getTotalQuestions,
} from '@/components/admin/mock-test-creator/types';
import type { 
  CreatorState, CreatorSection, CreatorQuestionGroup, CreatorSubQuestion 
} from '@/components/admin/mock-test-creator/types';
import type { Database } from '@/integrations/supabase/types';

type TestSubject = Database['public']['Enums']['test_subject'];

const AdminMockTestCreate = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<CreatorState>(createDefaultState());
  const [loading, setLoading] = useState(false);
  const [showAIParser, setShowAIParser] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  const totalMarks = getTotalMarks(state.sections);
  const totalQuestions = getTotalQuestions(state.sections);

  // Section operations
  const addSection = useCallback(() => {
    setState(prev => ({
      ...prev,
      sections: [...prev.sections, createSection(prev.sections.length)],
    }));
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<CreatorSection>) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
    }));
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    }));
  }, []);

  // Question group operations
  const addQuestionGroup = useCallback((sectionId: string) => {
    setState(prev => {
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
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, questionGroups: s.questionGroups.map(g => g.id === groupId ? { ...g, ...updates } : g) }
          : s
      ),
    }));
  }, []);

  const deleteQuestionGroup = useCallback((sectionId: string, groupId: string) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId
          ? { ...s, questionGroups: s.questionGroups.filter(g => g.id !== groupId) }
          : s
      ),
    }));
  }, []);

  // Sub-question operations
  const addSubQuestion = useCallback((sectionId: string, groupId: string) => {
    const newSub = createSubQuestion(
      state.sections
        .find(s => s.id === sectionId)
        ?.questionGroups.find(g => g.id === groupId)
        ?.subQuestions.length ?? 0
    );
    
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

    // Scroll to the new sub-question after render
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

  // CSV Import
  const handleCSVImport = useCallback((importedSections: CreatorSection[]) => {
    setState(prev => ({
      ...prev,
      sections: [...prev.sections.filter(s => s.questionGroups.some(q => q.stem)), ...importedSections],
    }));
    toast.success('Questions imported from CSV!');
  }, []);

  // Save / Publish
  const handleSave = async (publish: boolean) => {
    if (!state.title.trim()) { toast.error('Enter a test title'); return; }
    if (!state.subject) { toast.error('Select a subject'); return; }
    if (!state.topic.trim()) { toast.error('Enter a topic'); return; }
    if (totalQuestions === 0) { toast.error('Add at least one question'); return; }

    // Validate all questions have text
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
      // 1. Create mock test
      const { data: mockTest, error: testError } = await supabase
        .from('mock_tests')
        .insert({
          title: state.title,
          subject: state.subject as TestSubject,
          topic: state.topic,
          is_published: publish,
          time_limit_minutes: state.durationMinutes,
          total_questions: totalQuestions,
        })
        .select()
        .single();
      if (testError) throw testError;

      // 2. Create sections
      for (const section of state.sections) {
        const { data: dbSection, error: sectionError } = await supabase
          .from('mock_test_sections')
          .insert({
            mock_test_id: mockTest.id,
            title: section.title,
            section_order: section.order,
          })
          .select()
          .single();
        if (sectionError) throw sectionError;

        // 3. Create questions in this section
        for (const group of section.questionGroups) {
          const hasSubs = group.subQuestions.length > 0;
          const { data: dbQuestion, error: qError } = await supabase
            .from('mock_questions')
            .insert({
              mock_test_id: mockTest.id,
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
        }
      }

      toast.success(`Mock test ${publish ? 'published' : 'saved as draft'}!`);
      navigate('/admin/mock-tests');
    } catch (error: any) {
      console.error('Save error:', error);
      const msg = error?.message || error?.details || 'Unknown error';
      toast.error(`Failed to save mock test: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

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
                  onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Untitled Mock Test"
                  className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1"><Award className="w-3 h-3" />{totalMarks} marks</Badge>
              <Badge variant="outline" className="gap-1">{totalQuestions} Q</Badge>
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
          {/* Test info card */}
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
                  <Input
                    value={state.topic}
                    onChange={(e) => setState(prev => ({ ...prev, topic: e.target.value }))}
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
                      onChange={(e) => setState(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 120 }))}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import toolbar */}
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

          <div className="h-20" /> {/* Bottom spacing */}
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
                toast.success('Mock test created! Redirecting...');
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
          // Convert bank questions to creator format and add to first section
          const firstSection = state.sections[0];
          if (!firstSection) return;
          const nextNum = getNextQuestionNumber(state.sections);
          const newGroups: CreatorQuestionGroup[] = selectedQuestions.map((q: any, idx: number) => ({
            id: `bank-${Date.now()}-${idx}`,
            number: nextNum + idx,
            stem: q.question_text || '',
            stemImageUrl: q.question_image_url || '',
            marks: q.marks || 1,
            difficulty: q.difficulty || 'medium',
            commandTerm: q.command_term || '',
            category: q.category || '',
            diagramDescription: q.diagram_description || '',
            answerBlockType: q.answer_block_type || 'text_equation',
            answerBlockConfig: q.answer_block_config || {},
            answerKey: q.answer_key || '',
            wordLimit: q.word_limit?.toString() || '',
            subQuestions: (q.sub_questions || []).map((sq: any, sIdx: number) => ({
              id: `bank-sq-${Date.now()}-${idx}-${sIdx}`,
              label: sq.sub_question_label || String.fromCharCode(97 + sIdx),
              text: sq.sub_question_text || '',
              imageUrl: sq.sub_question_image_url || '',
              marks: sq.marks || 1,
              answerKey: sq.answer_key || '',
              wordLimit: sq.word_limit?.toString() || '',
              commandTerm: sq.command_term || '',
              answerBlockType: sq.answer_block_type || 'text_equation',
              answerBlockConfig: sq.answer_block_config || {},
            })),
          }));
          updateSection(firstSection.id, {
            questionGroups: [...firstSection.questionGroups, ...newGroups],
          });
          toast.success(`Added ${newGroups.length} questions from bank`);
        }}
        currentSubject={state.subject}
        currentTopic={state.topic}
      />
    </div>
  );
};

export default AdminMockTestCreate;
