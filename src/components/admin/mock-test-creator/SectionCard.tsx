import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ChevronDown, ChevronUp, GripVertical, Pencil } from 'lucide-react';
import QuestionGroupCard from './QuestionGroupCard';
import { createQuestionGroup, createSubQuestion, getNextQuestionNumber } from './types';
import type { CreatorSection, CreatorQuestionGroup, CreatorSubQuestion } from './types';

interface SectionCardProps {
  section: CreatorSection;
  allSections: CreatorSection[];
  onUpdate: (updates: Partial<CreatorSection>) => void;
  onDelete: () => void;
  onUpdateGroup: (groupId: string, updates: Partial<CreatorQuestionGroup>) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddGroup: () => void;
  onUpdateSub: (groupId: string, subId: string, updates: Partial<CreatorSubQuestion>) => void;
  onDeleteSub: (groupId: string, subId: string) => void;
  onAddSub: (groupId: string) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  allSections,
  onUpdate,
  onDelete,
  onUpdateGroup,
  onDeleteGroup,
  onAddGroup,
  onUpdateSub,
  onDeleteSub,
  onAddSub,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const totalMarks = section.questionGroups.reduce((total, q) => {
    if (q.subQuestions.length > 0) {
      return total + q.subQuestions.reduce((s, sq) => s + sq.marks, 0);
    }
    return total + q.marks;
  }, 0);

  return (
    <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3 bg-primary/10 border-b">
        <div className="flex items-center gap-3">
          <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
          {editingTitle ? (
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
              autoFocus
              className="h-8 w-40 text-sm font-bold"
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5 text-lg font-bold text-foreground hover:text-primary transition-colors">
              {section.title}
              <Pencil className="w-3.5 h-3.5 opacity-50" />
            </button>
          )}
          <Badge variant="secondary" className="text-xs">
            {section.questionGroups.length} questions · {totalMarks} marks
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          {allSections.length > 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Section content */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          {section.questionGroups.map((group) => (
            <QuestionGroupCard
              key={group.id}
              group={group}
              onUpdate={(updates) => onUpdateGroup(group.id, updates)}
              onDelete={() => onDeleteGroup(group.id)}
              onUpdateSub={(subId, updates) => onUpdateSub(group.id, subId, updates)}
              onDeleteSub={(subId) => onDeleteSub(group.id, subId)}
              onAddSub={() => onAddSub(group.id)}
            />
          ))}

          <Button variant="outline" onClick={onAddGroup} className="w-full border-dashed py-6 text-muted-foreground hover:text-foreground">
            <Plus className="w-5 h-5 mr-2" />
            Add Question Group
          </Button>
        </div>
      )}
    </div>
  );
};

export default SectionCard;
