import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, GripVertical, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExamQuestion } from './types';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuestionTabProps {
  question: ExamQuestion;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const QuestionTab: React.FC<QuestionTabProps> = ({ 
  question, 
  index, 
  isActive, 
  onClick, 
  onDelete 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "relative flex flex-col min-w-[120px] max-w-[160px] rounded-t-lg border-2 overflow-hidden cursor-pointer transition-all group",
        isActive 
          ? "bg-card border-primary/50 border-b-0 shadow-sm" 
          : "bg-muted/50 border-border hover:border-primary/30 hover:bg-muted",
        isDragging && "opacity-50 z-50"
      )}
      onClick={onClick}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Tab content */}
      <div className="p-2 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-3 h-3" />
          </span>
          <span className="text-xs font-semibold text-foreground">
            {index + 1}
          </span>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {question.title || 'Untitled'}
          </span>
        </div>
        
        {/* Mini thumbnail/preview */}
        <div className="h-12 bg-muted/50 rounded border border-border/50 flex items-center justify-center">
          {question.components.length > 0 ? (
            <div className="flex flex-wrap gap-0.5 p-1">
              {question.components.slice(0, 4).map((comp, i) => (
                <div 
                  key={i} 
                  className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30"
                />
              ))}
              {question.components.length > 4 && (
                <span className="text-[8px] text-muted-foreground">
                  +{question.components.length - 4}
                </span>
              )}
            </div>
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground/50" />
          )}
        </div>
        
        {/* Component count indicator */}
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[0, 1].map((i) => (
              <div 
                key={i}
                className={cn(
                  "w-2 h-1 rounded-full",
                  i < question.components.length ? "bg-primary/60" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Active indicator bar */}
      {isActive && (
        <motion.div 
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        />
      )}
    </motion.div>
  );
};

interface QuestionTabsProps {
  questions: ExamQuestion[];
  activeQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
  onReorderQuestions: (oldIndex: number, newIndex: number) => void;
}

const QuestionTabs: React.FC<QuestionTabsProps> = ({
  questions,
  activeQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onDeleteQuestion,
}) => {
  return (
    <div className="flex items-end gap-1 px-4 pb-0 overflow-x-auto scrollbar-thin">
      <AnimatePresence mode="popLayout">
        {questions.map((question, index) => (
          <QuestionTab
            key={question.id}
            question={question}
            index={index}
            isActive={question.id === activeQuestionId}
            onClick={() => onSelectQuestion(question.id)}
            onDelete={() => onDeleteQuestion(question.id)}
          />
        ))}
      </AnimatePresence>
      
      {/* Add new question button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddQuestion}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent border-2 border-dashed border-border hover:border-primary/50 transition-colors mb-1"
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
      </motion.button>
    </div>
  );
};

export default QuestionTabs;
