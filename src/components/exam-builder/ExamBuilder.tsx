import React, { useState, useCallback } from 'react';
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
import { ExamQuestion, ComponentConfig, ComponentType, COMPONENT_TYPES, ExamBuilderState } from './types';

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
  return {
    id: generateId(),
    type,
    label: typeInfo?.label || 'Component',
    content: '',
    settings: {},
  };
}

interface ExamBuilderProps {
  initialState?: Partial<ExamBuilderState>;
  onSave?: (state: ExamBuilderState) => Promise<void>;
}

const ExamBuilder: React.FC<ExamBuilderProps> = ({
  initialState,
  onSave,
}) => {
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
    
    // Check if dragging from sidebar
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

    // Dropping from sidebar onto canvas
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

    // Reordering components within canvas
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

  const handlePublish = async () => {
    if (questions.every(q => q.components.length === 0)) {
      toast.error('Please add at least one component to publish');
      return;
    }
    toast.success('Exam published successfully!');
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
        {/* Top header */}
        <ExamBuilderHeader
          examName={examName}
          onExamNameChange={setExamName}
          onPreview={handlePreview}
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          isSaving={isSaving}
        />

        {/* Question tabs */}
        <div className="bg-muted/50 border-b border-border pt-2">
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

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Component sidebar */}
          <BuilderSidebar />

          {/* Canvas */}
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

      {/* Drag overlay */}
      <DragOverlay>
        {activeId && draggedType && renderDragOverlay()}
      </DragOverlay>
    </DndContext>
  );
};

export default ExamBuilder;
