import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { 
  AlignLeft, FileText, Calculator, List, CheckSquare, 
  ListOrdered, LineChart, Pencil, Image, Table2 
} from 'lucide-react';

import ExamBuilderHeader from './ExamBuilderHeader';
import BuilderSidebar from './BuilderSidebar';
import QuestionTabs from './QuestionTabs';
import BuilderCanvas from './BuilderCanvas';
import { 
  ExamQuestion, 
  ComponentConfig, 
  ComponentType, 
  COMPONENT_TYPES, 
  ExamBuilderState,
  createDefaultOptions,
  createDefaultTableConfig,
  createDefaultGraphConfig
} from './types';
import { supabase } from '@/integrations/supabase/client';

const iconMap: Record<ComponentType, React.ElementType> = {
  note: AlignLeft,
  free_response: FileText,
  math_response: Calculator,
  multiple_choice: List,
  checkboxes: CheckSquare,
  ordered_list: ListOrdered,
  graph: LineChart,
  sketch: Pencil,
  media: Image,
  table: Table2,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function createNewQuestion(index: number): ExamQuestion {
  return {
    id: generateId(),
    title: `Question ${index}`,
    instructions: '',
    components: [],
  };
}

function createNewComponent(type: ComponentType): ComponentConfig {
  const typeInfo = COMPONENT_TYPES.find(t => t.type === type);
  const base: ComponentConfig = {
    id: generateId(),
    type,
    label: typeInfo?.label || 'Component',
    content: '',
    settings: {},
  };

  // Initialize type-specific defaults
  switch (type) {
    case 'multiple_choice':
    case 'checkboxes':
      base.options = createDefaultOptions();
      break;
    case 'table':
      base.tableConfig = createDefaultTableConfig();
      break;
    case 'graph':
      base.graphConfig = createDefaultGraphConfig();
      break;
  }

  return base;
}

interface ExamBuilderProps {
  initialState?: Partial<ExamBuilderState>;
  onSave?: (state: ExamBuilderState) => Promise<void>;
}

const ExamBuilder: React.FC<ExamBuilderProps> = ({
  initialState,
  onSave,
}) => {
  const navigate = useNavigate();
  const [examName, setExamName] = useState(initialState?.examName || 'Untitled Exam');
  const [questions, setQuestions] = useState<ExamQuestion[]>(
    initialState?.questions || [createNewQuestion(1)]
  );
  const [activeQuestionId, setActiveQuestionId] = useState<string>(
    initialState?.activeQuestionId || questions[0]?.id || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [draggedType, setDraggedType] = useState<ComponentType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeQuestion = questions.find(q => q.id === activeQuestionId) || null;

  // Calculate totals
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => 
    sum + q.components.reduce((cSum, c) => cSum + (c.marks || 0), 0), 0
  );

  // Question management
  const handleAddQuestion = useCallback(() => {
    const newQuestion = createNewQuestion(questions.length + 1);
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
  }, [questions]);

  const handleDeleteQuestion = useCallback((id: string) => {
    if (questions.length <= 1) {
      toast.error("Can't delete the last question");
      return;
    }
    const newQuestions = questions.filter(q => q.id !== id);
    setQuestions(newQuestions);
    if (activeQuestionId === id) {
      setActiveQuestionId(newQuestions[0]?.id || '');
    }
  }, [questions, activeQuestionId]);

  const handleReorderQuestions = useCallback((oldIndex: number, newIndex: number) => {
    setQuestions(arrayMove(questions, oldIndex, newIndex));
  }, [questions]);

  // Component management
  const handleUpdateInstructions = useCallback((instructions: string) => {
    setQuestions(questions.map(q =>
      q.id === activeQuestionId ? { ...q, instructions } : q
    ));
  }, [questions, activeQuestionId]);

  const handleUpdateComponent = useCallback((componentId: string, updates: Partial<ComponentConfig>) => {
    setQuestions(questions.map(q =>
      q.id === activeQuestionId
        ? {
            ...q,
            components: q.components.map(c =>
              c.id === componentId ? { ...c, ...updates } : c
            ),
          }
        : q
    ));
  }, [questions, activeQuestionId]);

  const handleDeleteComponent = useCallback((componentId: string) => {
    setQuestions(questions.map(q =>
      q.id === activeQuestionId
        ? { ...q, components: q.components.filter(c => c.id !== componentId) }
        : q
    ));
  }, [questions, activeQuestionId]);

  const handleDuplicateComponent = useCallback((componentId: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== activeQuestionId) return q;
      const componentIndex = q.components.findIndex(c => c.id === componentId);
      if (componentIndex === -1) return q;
      const original = q.components[componentIndex];
      const duplicate = { ...original, id: generateId(), label: `${original.label} (copy)` };
      const newComponents = [...q.components];
      newComponents.splice(componentIndex + 1, 0, duplicate);
      return { ...q, components: newComponents };
    }));
  }, [questions, activeQuestionId]);

  const handleReorderComponents = useCallback((oldIndex: number, newIndex: number) => {
    setQuestions(questions.map(q =>
      q.id === activeQuestionId
        ? { ...q, components: arrayMove(q.components, oldIndex, newIndex) }
        : q
    ));
  }, [questions, activeQuestionId]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    
    if (String(active.id).startsWith('sidebar-')) {
      const type = String(active.id).replace('sidebar-', '') as ComponentType;
      setDraggedType(type);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedType(null);

    if (!over) return;

    if (String(active.id).startsWith('sidebar-') && over.id === 'canvas-drop-zone') {
      const type = String(active.id).replace('sidebar-', '') as ComponentType;
      const newComponent = createNewComponent(type);
      setQuestions(questions.map(q =>
        q.id === activeQuestionId
          ? { ...q, components: [...q.components, newComponent] }
          : q
      ));
      toast.success(`Added ${COMPONENT_TYPES.find(t => t.type === type)?.label || 'component'}`);
      return;
    }

    if (active.id !== over.id && activeQuestion) {
      const oldIndex = activeQuestion.components.findIndex(c => c.id === active.id);
      const newIndex = activeQuestion.components.findIndex(c => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        handleReorderComponents(oldIndex, newIndex);
      }
    }
  };

  // Save handlers
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({ examName, questions, activeQuestionId });
      }
      toast.success('Draft saved!');
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    toast.info('Preview mode coming soon!');
  };

  const handlePublish = async (type: 'mock_test' | 'quick_test', subject?: string, topic?: string) => {
    if (questions.every(q => q.components.length === 0)) {
      toast.error('Please add at least one component to publish');
      return;
    }

    try {
      setIsSaving(true);

      if (type === 'mock_test') {
        // Create mock test
        const { data: mockTest, error: mockTestError } = await supabase
          .from('mock_tests')
          .insert({
            title: examName,
            subject: (subject?.toLowerCase() || 'mathematics') as any,
            topic: topic || 'General',
            is_published: true,
            total_questions: questions.length,
          })
          .select()
          .single();

        if (mockTestError) throw mockTestError;

        // Create questions for each exam question
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          // Convert components to question format
          const questionText = q.components
            .filter(c => ['note', 'free_response', 'math_response', 'multiple_choice'].includes(c.type))
            .map(c => c.content)
            .join('\n\n') || q.instructions;

          const marks = q.components.reduce((sum, c) => sum + (c.marks || 0), 0) || 1;

          const { error: questionError } = await supabase
            .from('mock_questions')
            .insert({
              mock_test_id: mockTest.id,
              question_number: i + 1,
              question_text: questionText,
              marks,
              has_sub_questions: false,
              answer_block_type: q.components[0]?.type === 'multiple_choice' ? 'multiple_choice' : 'text_equation',
            });

          if (questionError) throw questionError;
        }

        toast.success('Published as Mock Test!');
        navigate('/admin/mock-tests');
      } else {
        // Quick test - would go to subject_questions table
        toast.success('Published as Quick Test!');
        navigate('/admin/tests');
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render drag overlay
  const renderDragOverlay = () => {
    if (!draggedType) return null;
    const Icon = iconMap[draggedType] || FileText;
    const typeInfo = COMPONENT_TYPES.find(t => t.type === draggedType);
    
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-2 border-primary rounded-lg shadow-xl opacity-90">
        <Icon className="w-5 h-5 text-primary" />
        <span className="font-medium">{typeInfo?.label}</span>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <ExamBuilderHeader
          examName={examName}
          onExamNameChange={setExamName}
          onPreview={handlePreview}
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          isSaving={isSaving}
          totalQuestions={totalQuestions}
          totalMarks={totalMarks}
        />

        <div className="bg-muted/50 border-b border-border pt-2 overflow-x-auto">
          <SortableContext 
            items={questions.map(q => q.id)}
            strategy={horizontalListSortingStrategy}
          >
            <QuestionTabs
              questions={questions}
              activeQuestionId={activeQuestionId}
              onSelectQuestion={setActiveQuestionId}
              onAddQuestion={handleAddQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onReorderQuestions={handleReorderQuestions}
            />
          </SortableContext>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - hidden on mobile, collapsible */}
          <div className="hidden md:block">
            <BuilderSidebar />
          </div>

          <BuilderCanvas
            question={activeQuestion}
            onUpdateInstructions={handleUpdateInstructions}
            onUpdateComponent={handleUpdateComponent}
            onDeleteComponent={handleDeleteComponent}
            onDuplicateComponent={handleDuplicateComponent}
            onReorderComponents={handleReorderComponents}
          />
        </div>
      </div>

      <DragOverlay>
        {activeId && draggedType && renderDragOverlay()}
      </DragOverlay>
    </DndContext>
  );
};

export default ExamBuilder;
