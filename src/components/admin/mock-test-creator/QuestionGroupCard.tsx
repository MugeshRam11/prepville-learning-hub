import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, ChevronDown, ChevronUp, GripVertical, Blocks } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';
import EquationEditor from '../EquationEditor';
import ImageUpload from '../ImageUpload';
import AnswerBlockTypeSelector from '../AnswerBlockTypeSelector';
import CommandTermSelector from '../CommandTermSelector';
import ImageDropZoneEditor, { createDefaultImageDropConfig } from '../ImageDropZoneEditor';
import MultipleChoiceConfigEditor, { createDefaultMCQConfig } from '../MultipleChoiceConfigEditor';
import SubQuestionCard from './SubQuestionCard';
import { createSubQuestion } from './types';
import type { CreatorQuestionGroup, CreatorSubQuestion } from './types';
import type { AnswerBlockType } from '../AnswerBlockTypeSelector';

interface QuestionGroupCardProps {
  group: CreatorQuestionGroup;
  onUpdate: (updates: Partial<CreatorQuestionGroup>) => void;
  onDelete: () => void;
  onUpdateSub: (subId: string, updates: Partial<CreatorSubQuestion>) => void;
  onDeleteSub: (subId: string) => void;
  onAddSub: () => void;
}

const QuestionGroupCard: React.FC<QuestionGroupCardProps> = ({
  group,
  onUpdate,
  onDelete,
  onUpdateSub,
  onDeleteSub,
  onAddSub,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const hasSubs = group.subQuestions.length > 0;
  const totalMarks = hasSubs
    ? group.subQuestions.reduce((s, sq) => s + sq.marks, 0)
    : group.marks;

  return (
    <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <Badge variant="default" className="text-sm font-bold">Q{group.number}</Badge>
          <Badge variant="outline" className="text-xs">{totalMarks} marks</Badge>
          {hasSubs && <Badge variant="secondary" className="text-xs">{group.subQuestions.length} parts</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <CardContent className="pt-4 space-y-4">
          {/* Stem / Question text */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {hasSubs ? 'Shared Stem / Passage' : 'Question Text'} *
            </label>
            <RichTextEditor
              value={group.stem}
              onChange={(v) => onUpdate({ stem: v })}
              placeholder={hasSubs ? 'Enter shared stem, passage, or context...' : 'Enter question text...'}
            />
          </div>

          {/* Stem image */}
          <ImageUpload
            value={group.stemImageUrl}
            onChange={(url) => onUpdate({ stemImageUrl: url })}
            placeholder="Question image (optional)"
            folder={`questions/q${group.number}`}
          />

          {/* Settings row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={group.category} onValueChange={(v) => onUpdate({ category: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - Knowing</SelectItem>
                  <SelectItem value="B">B - Patterns</SelectItem>
                  <SelectItem value="C">C - Communication</SelectItem>
                  <SelectItem value="D">D - Applications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!hasSubs && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Marks</label>
                <Input type="number" min={1} value={group.marks} onChange={(e) => onUpdate({ marks: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select value={group.difficulty} onValueChange={(v) => onUpdate({ difficulty: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Command Term</label>
              <CommandTermSelector value={group.commandTerm} onChange={(v) => onUpdate({ commandTerm: v })} />
            </div>
            {!hasSubs && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Word Limit</label>
                <Input value={group.wordLimit} onChange={(e) => onUpdate({ wordLimit: e.target.value })} placeholder="—" className="h-8 text-sm" />
              </div>
            )}
          </div>

          {/* Answer block type for non-sub questions */}
          {!hasSubs && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Blocks className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Answer Type</label>
              </div>
              <AnswerBlockTypeSelector value={group.answerBlockType} onChange={(v: AnswerBlockType) => {
                const updates: Partial<CreatorQuestionGroup> = { answerBlockType: v };
                if (v === 'image_drop') {
                  updates.answerBlockConfig = createDefaultImageDropConfig();
                  updates.answerKey = '';
                } else if (v === 'multiple_choice') {
                  updates.answerBlockConfig = createDefaultMCQConfig();
                  updates.answerKey = '';
                }
                onUpdate(updates);
              }} />
            </div>
          )}

          {/* Answer key for non-sub questions */}
          {!hasSubs && group.answerBlockType === 'image_drop' ? (
            <ImageDropZoneEditor
              config={{
                imageUrl: group.answerBlockConfig?.imageUrl || '',
                zones: group.answerBlockConfig?.zones || [],
                elements: group.answerBlockConfig?.elements || [],
                answers: group.answerBlockConfig?.answers || {},
              }}
              onChange={(cfg) => onUpdate({ answerBlockConfig: cfg })}
              folder={`questions/q${group.number}/image-drop`}
            />
          ) : !hasSubs ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Answer Key</label>
              <EquationEditor
                value={group.answerKey}
                onChange={(v) => onUpdate({ answerKey: v })}
                placeholder="Correct answer..."
              />
            </div>
          ) : null}

          {/* Sub-questions */}
          {hasSubs && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub-questions</label>
              {group.subQuestions.map((sq) => (
                <SubQuestionCard
                  key={sq.id}
                  subQuestion={sq}
                  questionNumber={group.number}
                  onUpdate={onUpdateSub}
                  onDelete={onDeleteSub}
                />
              ))}
            </div>
          )}

          {/* Add sub-question button */}
          <Button variant="outline" size="sm" onClick={onAddSub} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-1" />
            Add Sub-question ({String.fromCharCode(97 + group.subQuestions.length)})
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

export default QuestionGroupCard;
