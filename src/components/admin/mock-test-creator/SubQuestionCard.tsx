import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, GripVertical } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';
import ImageUpload from '../ImageUpload';
import AnswerBlockTypeSelector from '../AnswerBlockTypeSelector';

import CommandTermSelector from '../CommandTermSelector';
import ImageDropZoneEditor, { createDefaultImageDropConfig } from '../ImageDropZoneEditor';
import DragDropMatchingEditor, { createDefaultDragDropConfig } from '../DragDropMatchingEditor';
import MultipleChoiceConfigEditor, { createDefaultMCQConfig } from '../MultipleChoiceConfigEditor';
import GraphPlotConfigEditor, { createDefaultGraphPlotConfig } from '../GraphPlotConfigEditor';
import ArrangeOrderEditor, { createDefaultArrangeOrderConfig } from '../ArrangeOrderEditor';
import SmartMathEditor, { createDefaultSmartMathConfig } from '../SmartMathEditor';
import ImageFillBlanksEditor, { createDefaultImageFillBlanksConfig } from '@/components/answer-types/ImageFillBlanksEditor';
import type { CreatorSubQuestion } from './types';
import type { AnswerBlockType } from '../AnswerBlockTypeSelector';

interface SubQuestionCardProps {
  subQuestion: CreatorSubQuestion;
  questionNumber: number;
  onUpdate: (id: string, updates: Partial<CreatorSubQuestion>) => void;
  onDelete: (id: string) => void;
}

const SubQuestionCard: React.FC<SubQuestionCardProps> = ({
  subQuestion,
  questionNumber,
  onUpdate,
  onDelete,
}) => {
  return (
    <div id={`sub-question-${subQuestion.id}`} className="ml-6 border-l-2 border-primary/30 pl-4 py-3 space-y-3 group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="font-semibold text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
            {questionNumber}({subQuestion.label})
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(subQuestion.id)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <RichTextEditor
        value={subQuestion.text}
        onChange={(v) => onUpdate(subQuestion.id, { text: v })}
        placeholder={`Enter sub-question (${subQuestion.label}) text...`}
      />

      <ImageUpload
        value={subQuestion.imageUrl}
        onChange={(url) => onUpdate(subQuestion.id, { imageUrl: url })}
        placeholder="Image (optional)"
        folder={`questions/q${questionNumber}-${subQuestion.label}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Marks</label>
          <Input type="number" min={1} value={subQuestion.marks} onChange={(e) => onUpdate(subQuestion.id, { marks: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Word Limit</label>
          <Input value={subQuestion.wordLimit} onChange={(e) => onUpdate(subQuestion.id, { wordLimit: e.target.value })} placeholder="—" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Command Term</label>
          <CommandTermSelector value={subQuestion.commandTerm} onChange={(v) => onUpdate(subQuestion.id, { commandTerm: v })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Answer Type</label>
          <AnswerBlockTypeSelector value={subQuestion.answerBlockType} onChange={(v: AnswerBlockType) => {
            const updates: Partial<CreatorSubQuestion> = { answerBlockType: v };
            if (v === 'image_drop') {
              updates.answerBlockConfig = createDefaultImageDropConfig();
              updates.answerKey = '';
            } else if (v === 'multiple_choice') {
              updates.answerBlockConfig = createDefaultMCQConfig();
              updates.answerKey = '';
            } else if (v === 'graph_plot') {
              updates.answerBlockConfig = createDefaultGraphPlotConfig();
              updates.answerKey = '';
            } else if (v === 'drag_drop') {
              updates.answerBlockConfig = createDefaultDragDropConfig();
              updates.answerKey = '';
            } else if (v === 'arrange_order') {
              updates.answerBlockConfig = createDefaultArrangeOrderConfig();
              updates.answerKey = '';
            } else if (v === 'smart_math') {
              updates.answerBlockConfig = createDefaultSmartMathConfig();
              updates.answerKey = '';
            }
            onUpdate(subQuestion.id, updates);
          }} />
        </div>
      </div>

      {subQuestion.answerBlockType === 'image_drop' ? (
        <ImageDropZoneEditor
          config={{
            imageUrl: subQuestion.answerBlockConfig?.imageUrl || '',
            zones: subQuestion.answerBlockConfig?.zones || [],
            elements: subQuestion.answerBlockConfig?.elements || [],
            answers: subQuestion.answerBlockConfig?.answers || {},
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
          folder={`questions/q${questionNumber}-${subQuestion.label}/image-drop`}
        />
      ) : subQuestion.answerBlockType === 'multiple_choice' ? (
        <MultipleChoiceConfigEditor
          config={{
            mode: subQuestion.answerBlockConfig?.mode || 'single',
            options: subQuestion.answerBlockConfig?.options || createDefaultMCQConfig().options,
            correctOptionIds: subQuestion.answerBlockConfig?.correctOptionIds || [],
            shuffleOptions: subQuestion.answerBlockConfig?.shuffleOptions || false,
            explanation: subQuestion.answerBlockConfig?.explanation || '',
            evaluationNotes: subQuestion.answerBlockConfig?.evaluationNotes || '',
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
        />
      ) : subQuestion.answerBlockType === 'graph_plot' ? (
        <GraphPlotConfigEditor
          config={{
            ...createDefaultGraphPlotConfig(),
            ...(subQuestion.answerBlockConfig || {}),
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
        />
      ) : subQuestion.answerBlockType === 'drag_drop' ? (
        <DragDropMatchingEditor
          config={{
            ...createDefaultDragDropConfig(),
            ...(subQuestion.answerBlockConfig || {}),
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
        />
      ) : subQuestion.answerBlockType === 'arrange_order' ? (
        <ArrangeOrderEditor
          config={{
            ...createDefaultArrangeOrderConfig(),
            ...(subQuestion.answerBlockConfig || {}),
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
        />
      ) : subQuestion.answerBlockType === 'smart_math' ? (
        <SmartMathEditor
          config={{
            ...createDefaultSmartMathConfig(),
            ...(subQuestion.answerBlockConfig || {}),
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
        />
      ) : subQuestion.answerBlockType === 'image_fill_blanks' ? (
        <ImageFillBlanksEditor
          config={{
            ...createDefaultImageFillBlanksConfig(),
            ...(subQuestion.answerBlockConfig || {}),
          }}
          onChange={(cfg) => onUpdate(subQuestion.id, { answerBlockConfig: cfg })}
          folder={`questions/q${questionNumber}-${subQuestion.label}/fill-blanks`}
        />
      ) : (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Answer Key</label>
          <RichTextEditor
            value={subQuestion.answerKey}
            onChange={(v) => onUpdate(subQuestion.id, { answerKey: v })}
            placeholder="Correct answer..."
          />
        </div>
      )}
    </div>
  );
};

export default SubQuestionCard;
