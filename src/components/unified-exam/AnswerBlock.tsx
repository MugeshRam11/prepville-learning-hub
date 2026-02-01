import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AnswerBlockType, 
  AnswerBlockConfig,
  getAnswerBlockTypeLabel,
  getAnswerBlockTypeIcon
} from '@/types/answerBlock';

// Import interactive components
import InteractiveGraphCanvas from '@/components/mock-exam/InteractiveGraphCanvas';
import DragDropMatcher from '@/components/mock-exam/DragDropMatcher';
import ImageDropZone from '@/components/mock-exam/ImageDropZone';
import StepBuilder from '@/components/mock-exam/StepBuilder';
import SmartMathInput from '@/components/mock-exam/SmartMathInput';
import { MathTypeInput } from '@/components/math';

interface AnswerBlockProps {
  questionId: string;
  subQuestionId?: string;
  answerType: AnswerBlockType;
  config?: AnswerBlockConfig;
  value: any;
  onChange: (value: any) => void;
  wordLimit?: number;
  placeholder?: string;
  disabled?: boolean;
}

const AnswerBlock: React.FC<AnswerBlockProps> = ({
  questionId,
  subQuestionId,
  answerType,
  config,
  value,
  onChange,
  wordLimit,
  placeholder = 'Enter your answer here...',
  disabled = false
}) => {
  const renderAnswerComponent = () => {
    switch (answerType) {
      case 'text_equation':
        return (
          <MathTypeInput
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            wordLimit={wordLimit}
            showPreview={true}
          />
        );

      case 'graph_plot':
        return (
          <div className="border rounded-lg overflow-hidden bg-white p-4">
            <InteractiveGraphCanvas
              onPointsChange={(points) => onChange({ ...value, points })}
              onLinesChange={(lines) => onChange({ ...value, lines })}
              initialPoints={value?.points || []}
              initialLines={value?.lines || []}
              showGrid={config?.graphConfig?.showGrid ?? true}
              allowDrawing={true}
            />
          </div>
        );

      case 'drag_drop':
        if (!config?.dragDropConfig) {
          return <div className="text-muted-foreground p-4 text-center">Drag & Drop not configured</div>;
        }
        return (
          <DragDropMatcher
            items={config.dragDropConfig.items}
            targets={config.dragDropConfig.targets.map(t => ({
              ...t,
              correctItemId: t.correctItemId || ''
            }))}
            onMatchesChange={(matches) => onChange(matches)}
            showFeedback={false}
          />
        );

      case 'image_drop':
        if (!config?.imageDropConfig) {
          return <div className="text-muted-foreground p-4 text-center">Image Drop Zone not configured</div>;
        }
        return (
          <ImageDropZone
            imageUrl={config.imageDropConfig.imageUrl}
            dropZones={config.imageDropConfig.dropZones.map(z => ({
              ...z,
              correctLabel: z.label || ''
            }))}
            draggableLabels={config.imageDropConfig.draggableLabels}
            onPlacementsChange={(placements) => onChange(placements)}
            showFeedback={false}
          />
        );

      case 'arrange_order':
        if (!config?.arrangeConfig) {
          return <div className="text-muted-foreground p-4 text-center">Arrange/Order not configured</div>;
        }
        return (
          <StepBuilder
            steps={config.arrangeConfig.items.map(item => ({
              ...item,
              correctOrder: item.correctOrder || 0
            }))}
            onOrderChange={(orderedIds) => onChange(orderedIds)}
            showFeedback={false}
          />
        );

      case 'smart_math':
        return (
          <SmartMathInput
            expectedAnswer={config?.smartMathConfig?.expectedAnswer || ''}
            acceptedFormats={config?.smartMathConfig?.acceptedFormats}
            onAnswerChange={(answer) => onChange(answer)}
            showFeedback={false}
          />
        );

      case 'multiple_choice':
        if (!config?.mcqConfig) {
          return <div className="text-muted-foreground p-4 text-center">Multiple choice not configured</div>;
        }
        return (
          <div className="space-y-2">
            {config.mcqConfig.options.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (config.mcqConfig?.allowMultiple) {
                    const current = Array.isArray(value) ? value : [];
                    const newValue = current.includes(option.id)
                      ? current.filter((id: string) => id !== option.id)
                      : [...current, option.id];
                    onChange(newValue);
                  } else {
                    onChange(option.id);
                  }
                }}
                disabled={disabled}
                className={`w-full p-4 text-left rounded-lg border transition-all ${
                  (Array.isArray(value) ? value.includes(option.id) : value === option.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="font-medium mr-3">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {option.content}
              </button>
            ))}
          </div>
        );

      default:
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[120px]"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="answer-block"
    >
      <Card className="border-l-4 border-l-primary/50">
        <CardContent className="p-4">
          {/* Answer type badge */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-xs">
              {getAnswerBlockTypeIcon(answerType)} {getAnswerBlockTypeLabel(answerType)}
            </Badge>
          </div>

          {/* Answer component */}
          {renderAnswerComponent()}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnswerBlock;
