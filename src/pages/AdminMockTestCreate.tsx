import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { TOPIC_TREE, SUBJECT_DB_TO_DISPLAY, getUnits, getTopics, getSubtopics } from '@/data/topicTree';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search as SearchIcon, Check, ChevronDown } from 'lucide-react';
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

// ─── Searchable hierarchical topic selector for admin ────────
const TopicSelector = ({ subject, value, onChange }: { subject: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [creating, setCreating] = useState(false);

  const displaySubject = SUBJECT_DB_TO_DISPLAY[subject] || subject;
  const units = useMemo(() => getUnits(displaySubject), [displaySubject]);

  // Fetch custom topics from DB
  useEffect(() => {
    if (!subject) return;
    const fetchCustom = async () => {
      const { data } = await supabase
        .from('custom_topics')
        .select('topic, unit')
        .eq('subject', subject);
      if (data) setCustomTopics(data.map(d => d.topic));
    };
    fetchCustom();
  }, [subject]);

  const grouped = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const unit of units) {
      const topics = getTopics(displaySubject, unit);
      if (topics.length) result[unit] = topics;
    }
    // Merge custom topics under "Custom Topics" group
    if (customTopics.length > 0) {
      result['Custom Topics'] = customTopics;
    }
    return result;
  }, [displaySubject, units, customTopics]);

  const filteredGrouped = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, items] of Object.entries(grouped)) {
      const matches = items.filter(i => i.toLowerCase().includes(q) || group.toLowerCase().includes(q));
      if (matches.length) result[group] = matches;
    }
    return result;
  }, [grouped, search]);

  const noResults = Object.keys(filteredGrouped).length === 0;

  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('custom_topics').insert({
        subject,
        unit: newUnit.trim() || 'Custom',
        topic: newTopic.trim(),
      });
      if (error) throw error;
      setCustomTopics(prev => [...prev, newTopic.trim()]);
      onChange(newTopic.trim());
      setNewTopic('');
      setNewUnit('');
      setShowCreateForm(false);
      setOpen(false);
      setSearch('');
      toast.success(`Topic "${newTopic.trim()}" created!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create topic');
    } finally {
      setCreating(false);
    }
  };

  const hasTopics = Object.keys(grouped).length > 0 || subject;

  if (!hasTopics) {
    return (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g., Algebra, Force & Motion" />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{value || 'Select topic...'}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0 overflow-hidden" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search topics..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto overscroll-contain" style={{ scrollBehavior: 'smooth' }}>
          <div className="p-1">
            {Object.entries(filteredGrouped).map(([unit, topics]) => (
              <div key={unit}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">{unit}</div>
                {topics.map((topic) => (
                  <button key={topic} onClick={() => { onChange(topic); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left pl-6">
                    <Check className={`h-3.5 w-3.5 ${value === topic ? 'opacity-100' : 'opacity-0'}`} />
                    {topic}
                  </button>
                ))}
              </div>
            ))}

            {/* No results + create option */}
            {noResults && !showCreateForm && (
              <div className="px-3 py-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No topics found for "{search}"</p>
                <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(true); setNewTopic(search); }}
                  className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Create "{search}"
                </Button>
              </div>
            )}

            {/* Always show create option at bottom */}
            {!noResults && !showCreateForm && (
              <div className="border-t border-border mt-1 pt-1">
                <button onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left text-primary">
                  <Plus className="h-3.5 w-3.5" /> Create new topic
                </button>
              </div>
            )}

            {/* Create form */}
            {showCreateForm && (
              <div className="border-t border-border mt-1 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Create New Topic</p>
                <Input placeholder="Unit (optional, e.g. Unit 6: Calculus)"
                  value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Topic name *"
                  value={newTopic} onChange={(e) => setNewTopic(e.target.value)} className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateTopic} disabled={!newTopic.trim() || creating} className="flex-1">
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCreateForm(false); setNewTopic(''); setNewUnit(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

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
              <div>
                <label className="text-sm font-medium mb-2 block">Topic *</label>
                <TopicSelector
                  subject={state.subject}
                  value={state.topic}
                  onChange={(topic) => setState(prev => ({ ...prev, topic }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Import toolbar */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAIParser(true)}>
              <Wand2 className="w-4 h-4 mr-1" /> AI Upload
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
