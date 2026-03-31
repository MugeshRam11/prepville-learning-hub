import React, { useState } from 'react';
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
import GraphPlotPlayer from '@/components/mock-exam/GraphPlotPlayer';
import DragDropMatcher from '@/components/mock-exam/DragDropMatcher';
import ImageDropZone from '@/components/mock-exam/ImageDropZone';
import StepBuilder from '@/components/mock-exam/StepBuilder';
import SmartMathInput from '@/components/mock-exam/SmartMathInput';
import SmartMathPlayer from '@/components/mock-exam/SmartMathPlayer';
import MathTextArea from '@/components/MathTextArea';

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
  // For equation editor, we store both text and equations
  const [equations, setEquations] = useState<any[]>(value?.equations || []);

  const getWordCount = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleTextEquationChange = (text: string) => {
    onChange({ text, equations });
  };

  const handleEquationsChange = (newEquations: EquationData[]) => {
    setEquations(newEquations);
    onChange({ text: value?.text || '', equations: newEquations });
  };

  const renderAnswerComponent = () => {
    switch (answerType) {
      case 'text_equation':
        return (
          <div className="space-y-3">
            {wordLimit && (
              <div className="flex justify-end">
                <Badge variant={getWordCount(value?.text) > wordLimit ? 'destructive' : 'secondary'}>
                  {getWordCount(value?.text || '')} / {wordLimit} words
                </Badge>
              </div>
            )}

            {/* Equation Text Editor - Object-based equation UX */}
            <MathTextArea
              value={value?.text || ''}
              onChange={handleTextEquationChange}
              placeholder={placeholder}
              disabled={disabled}
              minHeight="150px"
            />
          </div>
        );

      case 'graph_plot': {
        const flatCfg = config as any;
        const graphCanvas = flatCfg?.canvas || config?.graphConfig || {};
        return (
          <div className="border rounded-lg overflow-hidden p-4 bg-card">
            <GraphPlotPlayer
              canvasConfig={{
                xMin: graphCanvas.xMin ?? -10,
                xMax: graphCanvas.xMax ?? 10,
                yMin: graphCanvas.yMin ?? -10,
                yMax: graphCanvas.yMax ?? 10,
                gridStep: graphCanvas.gridStep ?? 1,
                showNumbers: graphCanvas.showNumbers ?? true,
                showAxisLabels: graphCanvas.showAxisLabels ?? true,
              }}
              allowedTools={flatCfg?.allowedTools || ['point', 'line', 'move', 'erase']}
              value={value || { points: [], lines: [] }}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        );
      }

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

      case 'smart_math': {
        const flatCfg = config as any;
        const palettes = flatCfg?.palettes || config?.smartMathConfig?.acceptedFormats || ['fraction', 'script', 'radical', 'bracket', 'operator', 'greek'];
        const inputMode = flatCfg?.inputMode || 'single_expression';

        return (
          <SmartMathPlayer
            palettes={palettes}
            inputMode={inputMode}
            value={typeof value === 'object' && value?.latex !== undefined ? value : { latex: typeof value === 'string' ? value : '' }}
            onChange={(answer) => onChange(answer)}
            disabled={disabled}
          />
        );
      }

      case 'multiple_choice': {
        const mcqCfg = config?.mcqConfig;
        const flatCfg = config as any;
        const options = mcqCfg?.options || flatCfg?.options || [];
        const allowMultiple = mcqCfg?.allowMultiple || flatCfg?.mode === 'multiple';

        if (options.length === 0) {
          return <div className="text-muted-foreground p-4 text-center">Multiple choice not configured</div>;
        }
        return (
          <div className="space-y-2">
            {options.map((option: any, idx: number) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (allowMultiple) {
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
                className={`w-full p-4 text-left rounded-lg border-2 transition-all flex items-center gap-3 ${
                  (Array.isArray(value) ? value.includes(option.id) : value === option.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                  (Array.isArray(value) ? value.includes(option.id) : value === option.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'border-2 border-muted-foreground/30'
                }`}>
                  {option.label || String.fromCharCode(65 + idx)}
                </span>
                <span className="font-medium">
                  {option.content || `Option ${String.fromCharCode(65 + idx)}`}
                </span>
              </button>
            ))}
          </div>
        );
      }

      case 'image_fill_blanks': {
        const ImageFillBlanksPlayer = React.lazy(() => import('@/components/answer-types/ImageFillBlanksPlayer'));
        return (
          <React.Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading...</div>}>
            <ImageFillBlanksPlayer
              config={config as any}
              value={value || {}}
              onChange={onChange}
              disabled={disabled}
            />
          </React.Suspense>
        );
      }

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
