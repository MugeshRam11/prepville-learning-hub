import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { 
  AlignLeft, FileText, Calculator, List, CheckSquare, 
  ListOrdered, LineChart, Pencil, Image, Table2,
  Lightbulb, Code, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPONENT_TYPES, DraggableSidebarItem, ComponentType } from './types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, React.ElementType> = {
  AlignLeft,
  FileText,
  Calculator,
  List,
  CheckSquare,
  ListOrdered,
  LineChart,
  Pencil,
  Image,
  Table2,
};

interface DraggableItemProps {
  item: DraggableSidebarItem;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${item.type}`,
    data: {
      type: item.type,
      fromSidebar: true,
    },
  });

  const Icon = iconMap[item.icon] || FileText;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-grab transition-all",
              "bg-card hover:bg-accent/50 border-border hover:border-primary/40",
              "hover:shadow-md active:cursor-grabbing",
              isDragging && "opacity-50 scale-95 shadow-lg z-50"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-xs font-medium text-foreground truncate w-full text-center">
              {item.label}
            </span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface BuilderSidebarProps {
  className?: string;
}

const BuilderSidebar: React.FC<BuilderSidebarProps> = ({ className }) => {
  return (
    <div className={cn("w-[260px] bg-muted/30 border-r border-border flex flex-col", className)}>
      {/* Header Tabs */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="text-xs">Teacher Tips</span>
        </Button>
        <Button variant="ghost" size="sm" className="px-2">
          <Code className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="px-2">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Components Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {COMPONENT_TYPES.map((item) => (
            <DraggableItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-border bg-muted/50">
        <p className="text-xs text-muted-foreground text-center">
          Drag components to the canvas to build your exam
        </p>
      </div>
    </div>
  );
};

export default BuilderSidebar;
