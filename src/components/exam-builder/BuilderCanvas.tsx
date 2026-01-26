import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, Copy, Code, MoreHorizontal,
  Trash2, Move, ChevronDown,
  AlignLeft, FileText, Calculator, List, CheckSquare, 
  ListOrdered, LineChart, Pencil, Image, Table2,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ComponentConfig, 
  ComponentType, 
  ExamQuestion,
  createDefaultOptions,
  createDefaultTableConfig,
  createDefaultGraphConfig 
} from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MultipleChoiceEditor, TableEditor, GraphEditor, MediaUploader } from './components';

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

interface SortableComponentProps {
  component: ComponentConfig;
  onUpdate: (id: string, updates: Partial<ComponentConfig>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const SortableComponent: React.FC<SortableComponentProps> = ({
  component,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = iconMap[component.type] || FileText;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        "group relative bg-card rounded-xl border-2 border-border shadow-sm transition-all",
        "hover:shadow-md hover:border-primary/30",
        isDragging && "opacity-50 shadow-2xl z-50 rotate-1"
      )}
    >
      {/* Component Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30 rounded-t-xl flex-wrap sm:flex-nowrap">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded shrink-0"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <Input
          value={component.label}
          onChange={(e) => onUpdate(component.id, { label: e.target.value })}
          placeholder="Name this component"
          className="flex-1 h-7 text-sm bg-transparent border-none focus:ring-0 px-1 min-w-[100px]"
        />

        {/* Marks input */}
        <div className="flex items-center gap-1 shrink-0">
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="number"
            value={component.marks || ''}
            onChange={(e) => onUpdate(component.id, { marks: Number(e.target.value) || undefined })}
            placeholder="Marks"
            className="w-16 h-7 text-xs"
            min={0}
          />
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(component.id)}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Code className="w-3.5 h-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDuplicate(component.id)}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(component.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Component Content */}
      <div className="p-4 min-h-[100px]">
        {renderComponentContent(component, onUpdate)}
      </div>

      {/* Quick delete on hover */}
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
        <Button 
          variant="destructive" 
          size="icon" 
          className="h-7 w-7 rounded-full shadow-lg"
          onClick={() => onDelete(component.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};

function renderComponentContent(
  component: ComponentConfig, 
  onUpdate: (id: string, updates: Partial<ComponentConfig>) => void
) {
  switch (component.type) {
    case 'note':
      return (
        <Textarea
          placeholder="Enter your note or instructions for students..."
          value={component.content}
          onChange={(e) => onUpdate(component.id, { content: e.target.value })}
          className="min-h-[80px] resize-y border-muted"
        />
      );
    
    case 'free_response':
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter your question text here..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[60px] resize-y"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">Students will type their answer below</Badge>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-muted-foreground">Word limit:</span>
              <Input
                type="number"
                value={component.wordLimit || ''}
                onChange={(e) => onUpdate(component.id, { wordLimit: Number(e.target.value) || undefined })}
                placeholder="None"
                className="w-20 h-7 text-xs"
                min={0}
              />
            </div>
          </div>
          <div className="h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/20">
            <span className="text-sm text-muted-foreground">Student answer area</span>
          </div>
        </div>
      );

    case 'math_response':
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter your math question here (use LaTeX: $x^2 + y^2 = z^2$)..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[60px] resize-y font-mono"
          />
          <Badge variant="secondary" className="text-xs">Math keyboard will be available for students</Badge>
          <div className="h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/20">
            <span className="text-sm text-muted-foreground">Math input area with equation editor</span>
          </div>
        </div>
      );
    
    case 'graph':
      return <GraphEditor component={component} onUpdate={onUpdate} />;
    
    case 'media':
      return <MediaUploader component={component} onUpdate={onUpdate} />;
    
    case 'multiple_choice':
      // Initialize options if not present
      if (!component.options) {
        onUpdate(component.id, { options: createDefaultOptions() });
      }
      return <MultipleChoiceEditor component={component} onUpdate={onUpdate} />;
    
    case 'checkboxes':
      // Similar to multiple choice but allows multiple selections
      if (!component.options) {
        onUpdate(component.id, { options: createDefaultOptions() });
      }
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter your question text..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[40px] resize-none"
          />
          <Badge variant="outline" className="text-xs">Students can select multiple answers</Badge>
          <MultipleChoiceEditor component={component} onUpdate={onUpdate} />
        </div>
      );
    
    case 'sketch':
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter instructions for the sketch..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[40px] resize-none"
          />
          <div className="h-40 bg-muted/30 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
            <div className="text-center">
              <Pencil className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <span className="text-sm text-muted-foreground">Students will be able to sketch here</span>
            </div>
          </div>
        </div>
      );
    
    case 'table':
      if (!component.tableConfig) {
        onUpdate(component.id, { tableConfig: createDefaultTableConfig() });
      }
      return <TableEditor component={component} onUpdate={onUpdate} />;

    case 'ordered_list':
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter your question about ordering/sequencing..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[40px] resize-none"
          />
          <Badge variant="secondary" className="text-xs">Students will drag items into correct order</Badge>
          <div className="space-y-2">
            {['First item', 'Second item', 'Third item'].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <Input placeholder={item} className="flex-1 h-8 border-none bg-transparent" />
              </div>
            ))}
          </div>
        </div>
      );
    
    default: {
      const _type: string = component.type;
      return (
        <Textarea
          placeholder={`Enter ${_type.replace('_', ' ')} content...`}
          value={component.content}
          onChange={(e) => onUpdate(component.id, { content: e.target.value })}
          className="min-h-[80px] resize-y"
        />
      );
    }
  }
}

interface BuilderCanvasProps {
  question: ExamQuestion | null;
  onUpdateInstructions: (instructions: string) => void;
  onUpdateComponent: (id: string, updates: Partial<ComponentConfig>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onReorderComponents: (oldIndex: number, newIndex: number) => void;
}

const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  question,
  onUpdateInstructions,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">No question selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 to-background p-3 sm:p-6">
      {/* Instructions field */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6">
        <Input
          value={question.instructions}
          onChange={(e) => onUpdateInstructions(e.target.value)}
          placeholder="Add a title or instructions for your students."
          className="text-base sm:text-lg text-center border-none bg-transparent focus:ring-0 text-muted-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Canvas drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "max-w-4xl mx-auto min-h-[300px] sm:min-h-[400px] rounded-xl border-2 border-dashed transition-all p-2 sm:p-4",
          question.components.length === 0 
            ? "border-muted-foreground/30 bg-muted/10" 
            : "border-transparent",
          isOver && "border-primary bg-primary/5 scale-[1.01]"
        )}
      >
        {question.components.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 sm:py-16 gap-4">
            {/* Empty state illustration */}
            <div className="relative w-48 sm:w-64 h-36 sm:h-48">
              {/* Decorative shapes */}
              <motion.div 
                className="absolute top-0 left-1/4 w-6 sm:w-8 h-6 sm:h-8 border-2 border-muted-foreground/20 rotate-45"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="absolute top-4 right-1/4 w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-muted-foreground/20"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-8 left-1/3 w-10 sm:w-12 h-6 sm:h-8 border-2 border-dashed border-muted-foreground/30 rounded"
                animate={{ rotate: [0, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-0 right-1/3 w-5 sm:w-6 h-5 sm:h-6 border-2 border-muted-foreground/20 rounded-full"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Center dashed boxes */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                <div className="w-16 sm:w-20 h-12 sm:h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                  <Move className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground/40" />
                </div>
                <div className="w-16 sm:w-20 h-12 sm:h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                  <Move className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground/40" />
                </div>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground text-center px-4">
              Drag components from the sidebar to build your question.
            </p>
          </div>
        ) : (
          <SortableContext 
            items={question.components.map(c => c.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 sm:space-y-4">
              <AnimatePresence mode="popLayout">
                {question.components.map((component) => (
                  <SortableComponent
                    key={component.id}
                    component={component}
                    onUpdate={onUpdateComponent}
                    onDelete={onDeleteComponent}
                    onDuplicate={onDuplicateComponent}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
};

export default BuilderCanvas;
