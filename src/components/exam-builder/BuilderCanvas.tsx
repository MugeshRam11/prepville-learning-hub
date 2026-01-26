import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, Copy, AlignJustify, Code, MoreHorizontal,
  Trash2, Settings, Move,
  AlignLeft, FileText, Calculator, List, CheckSquare, 
  ListOrdered, LineChart, Pencil, Image, Table2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentConfig, ComponentType, ExamQuestion } from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30 rounded-t-xl">
        <Input
          value={component.label}
          onChange={(e) => onUpdate(component.id, { label: e.target.value })}
          placeholder="Name this component"
          className="flex-1 h-7 text-sm bg-transparent border-none focus:ring-0 px-1"
        />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(component.id)}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <AlignJustify className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Code className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Component Content */}
      <div className="p-4 min-h-[120px]">
        {renderComponentContent(component, onUpdate)}
      </div>

      {/* Quick actions on hover */}
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          placeholder="Enter your note or instructions..."
          value={component.content}
          onChange={(e) => onUpdate(component.id, { content: e.target.value })}
          className="min-h-[80px] resize-none border-none bg-transparent focus:ring-0"
        />
      );
    
    case 'free_response':
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter question text..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[60px] resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Students will type their answer below</span>
          </div>
          <div className="h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Student answer area</span>
          </div>
        </div>
      );
    
    case 'graph':
      return (
        <div className="space-y-3">
          <div className="aspect-square max-w-[300px] mx-auto border-2 border-border rounded-lg bg-muted/30 relative overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="border border-muted-foreground/10" />
              ))}
            </div>
            {/* Axes */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-foreground/50" />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/50" />
            {/* Labels */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">10</span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">-10</span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">-10</span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">10</span>
            {/* Edit overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-primary/5 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-primary font-semibold">Edit Graph</span>
            </div>
          </div>
        </div>
      );
    
    case 'media':
      return (
        <div className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors cursor-pointer">
          <Image className="w-10 h-10 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Drag an image or video here.</span>
          <span className="text-xs text-muted-foreground">or</span>
          <Button variant="secondary" size="sm">Choose a file to upload</Button>
        </div>
      );
    
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter question text..."
            value={component.content}
            onChange={(e) => onUpdate(component.id, { content: e.target.value })}
            className="min-h-[40px] resize-none"
          />
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map((option) => (
              <div key={option} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs font-medium">
                  {option}
                </div>
                <Input placeholder={`Option ${option}`} className="flex-1 h-8" />
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <GripVertical className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'sketch':
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Background</span>
            <Button variant="outline" size="sm">Choose background</Button>
          </div>
          <div className="h-32 bg-muted/30 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
            <div className="text-center">
              <Pencil className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <span className="text-sm text-muted-foreground">Students will be able to sketch below. Preview to try it out!</span>
            </div>
          </div>
        </div>
      );
    
    case 'table':
      return (
        <div className="space-y-3">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 border-b border-r">Column 1</th>
                  <th className="p-2 border-b border-r">Column 2</th>
                  <th className="p-2 border-b">Column 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b border-r"><Input placeholder="Cell" className="h-7 border-none bg-transparent" /></td>
                  <td className="p-2 border-b border-r"><Input placeholder="Cell" className="h-7 border-none bg-transparent" /></td>
                  <td className="p-2 border-b"><Input placeholder="Cell" className="h-7 border-none bg-transparent" /></td>
                </tr>
                <tr>
                  <td className="p-2 border-r"><Input placeholder="Cell" className="h-7 border-none bg-transparent" /></td>
                  <td className="p-2 border-r"><Input placeholder="Cell" className="h-7 border-none bg-transparent" /></td>
                  <td className="p-2"><Input placeholder="Cell" className="h-7 border-none bg-transparent" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm">Add Row</Button>
        </div>
      );
    
    default:
      return (
        <Textarea
          placeholder={`Enter ${component.type.replace('_', ' ')} content...`}
          value={component.content}
          onChange={(e) => onUpdate(component.id, { content: e.target.value })}
          className="min-h-[80px] resize-none"
        />
      );
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 to-background p-6">
      {/* Instructions field */}
      <div className="max-w-4xl mx-auto mb-6">
        <Input
          value={question.instructions}
          onChange={(e) => onUpdateInstructions(e.target.value)}
          placeholder="Add a title or instructions for your students."
          className="text-lg text-center border-none bg-transparent focus:ring-0 text-muted-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Canvas drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "max-w-4xl mx-auto min-h-[400px] rounded-xl border-2 border-dashed transition-all p-4",
          question.components.length === 0 
            ? "border-muted-foreground/30 bg-muted/10" 
            : "border-transparent",
          isOver && "border-primary bg-primary/5 scale-[1.01]"
        )}
      >
        {question.components.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-16 gap-4">
            {/* Empty state illustration */}
            <div className="relative w-64 h-48">
              {/* Decorative shapes */}
              <motion.div 
                className="absolute top-0 left-1/4 w-8 h-8 border-2 border-muted-foreground/20 rotate-45"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="absolute top-4 right-1/4 w-4 h-4 rounded-full bg-muted-foreground/20"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-8 left-1/3 w-12 h-8 border-2 border-dashed border-muted-foreground/30 rounded"
                animate={{ rotate: [0, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-0 right-1/3 w-6 h-6 border-2 border-muted-foreground/20 rounded-full"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Center dashed boxes */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                <div className="w-20 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                  <Move className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div className="w-20 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                  <Move className="w-5 h-5 text-muted-foreground/40" />
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-center">
              Choose an item on the left to add it to this screen.
            </p>
          </div>
        ) : (
          <SortableContext 
            items={question.components.map(c => c.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
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
