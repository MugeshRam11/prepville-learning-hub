import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  Settings2,
  PenTool,
  GripHorizontal,
  MousePointer2,
  ListOrdered,
  Hash,
  CheckSquare,
  FileText,
  Table2
} from 'lucide-react';

// Import interactive components
import InteractiveGraphCanvas from '@/components/mock-exam/InteractiveGraphCanvas';
import DragDropMatcher from '@/components/mock-exam/DragDropMatcher';
import ImageDropZone from '@/components/mock-exam/ImageDropZone';
import StepBuilder from '@/components/mock-exam/StepBuilder';
import SmartMathInput from '@/components/mock-exam/SmartMathInput';
import MathKeyboard from '@/components/mock-exam/MathKeyboard';

import type { AnswerBlockConfig } from '@/types/answerBlock';

// Interactive type that can be auto-detected or manually set
export type InteractiveType = 
  | 'text_equation'
  | 'graph_plot'
  | 'drag_drop'
  | 'image_drop'
  | 'arrange_order'
  | 'smart_math'
  | 'multiple_choice'
  | 'table_input';

interface InteractiveAnswerBlockProps {
  questionId: string;
  subQuestionId?: string;
  detectedType?: InteractiveType;
  config?: AnswerBlockConfig;
  value: any;
  onChange: (value: any) => void;
  wordLimit?: number;
  placeholder?: string;
  disabled?: boolean;
  allowTypeChange?: boolean;
  questionText?: string;
  diagramDescription?: string;
}

const TYPE_OPTIONS: { type: InteractiveType; label: string; icon: React.ReactNode }[] = [
  { type: 'text_equation', label: 'Text / Math', icon: <FileText className="w-4 h-4" /> },
  { type: 'graph_plot', label: 'Graph Plot', icon: <PenTool className="w-4 h-4" /> },
  { type: 'drag_drop', label: 'Drag & Drop', icon: <GripHorizontal className="w-4 h-4" /> },
  { type: 'image_drop', label: 'Image Drop', icon: <MousePointer2 className="w-4 h-4" /> },
  { type: 'arrange_order', label: 'Arrange Order', icon: <ListOrdered className="w-4 h-4" /> },
  { type: 'smart_math', label: 'Smart Math', icon: <Hash className="w-4 h-4" /> },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'table_input', label: 'Table Input', icon: <Table2 className="w-4 h-4" /> },
];

// IB MYP eAssessment patterns for interactive type detection
const INTERACTIVE_PATTERNS: { type: InteractiveType; patterns: RegExp[] }[] = [
  // Table patterns - check first for table-based questions
  { 
    type: 'table_input', 
    patterns: [
      /complete\s+(?:the\s+)?table/i,
      /fill\s+(?:in\s+)?(?:the\s+)?table/i,
      /copy\s+and\s+complete/i,
      /missing\s+values?\s+(?:in\s+)?(?:the\s+)?table/i,
      /frequency\s+table/i,
      /two[\s-]*way\s+table/i,
      /contingency\s+table/i,
      /complete\s+(?:the\s+)?(?:frequency|probability)\s+(?:distribution)?/i,
      /input[\s-]*output\s+table/i,
      /function\s+table/i,
      /data\s+table/i,
      /complete\s+(?:the\s+)?following\s+table/i,
      /determine\s+(?:the\s+)?missing/i,
      /fill\s+(?:in\s+)?(?:the\s+)?blank/i
    ]
  },
  // Graph/Coordinate interactions - highest priority for visual math
  { 
    type: 'graph_plot', 
    patterns: [
      /plot\s+(?:the\s+)?point/i,
      /draw\s+(?:the\s+)?(?:graph|line|curve)/i,
      /sketch\s+(?:the\s+)?graph/i,
      /on\s+the\s+(?:coordinate|cartesian)\s+plane/i,
      /x[\s-]*axis|y[\s-]*axis/i,
      /graph\s+(?:of\s+)?(?:f|g|h)\s*\(/i,
      /shade\s+(?:the\s+)?region/i,
      /line\s+of\s+best\s+fit/i,
      /scatter\s+(?:plot|graph|diagram)/i,
      /coordinate\s+grid/i,
      /draw.*perpendicular|draw.*parallel/i
    ]
  },
  // Drag & Drop matching
  { 
    type: 'drag_drop', 
    patterns: [
      /drag\s+(?:and\s+)?drop/i,
      /draggable/i,
      /place\s+(?:them\s+)?in\s+(?:the\s+)?correct/i,
      /select\s+.*and\s+place/i,
      /label\s+.*by\s+placing/i,
      /match\s+(?:the\s+)?(?:following|pairs?|items?)/i,
      /pair\s+(?:the|each)/i,
      /select\s+(?:the\s+)?figure/i,
      /move\s+(?:the\s+)?(?:labels?|items?)/i
    ]
  },
  // Interactive diagrams (Venn, Tree, etc.)
  { 
    type: 'image_drop', 
    patterns: [
      /venn\s+diagram/i,
      /complete\s+(?:the\s+)?venn/i,
      /tree\s+diagram/i,
      /complete\s+(?:the\s+)?tree/i,
      /probability\s+tree/i,
      /set\s+a.*set\s+b/i,
      /a\s*[∩∪]\s*b/i,
      /intersection|union/i,
      /click\s+(?:on\s+)?(?:the\s+)?(?:region|area|zone)/i,
      /label\s+(?:the\s+)?diagram/i
    ]
  },
  // Step builder / Arrange order
  { 
    type: 'arrange_order', 
    patterns: [
      /arrange\s+(?:the\s+)?(?:steps?|following)/i,
      /correct\s+order/i,
      /order\s+(?:the\s+)?(?:steps?|following)/i,
      /sequence\s+(?:the\s+)?(?:steps?|following)/i,
      /show\s+(?:your\s+)?working/i,
      /show\s+that/i,
      /prove\s+that/i,
      /verify\s+(?:that|your)/i,
      /step[\s-]*by[\s-]*step/i
    ]
  },
  // Multiple choice with images/options
  { 
    type: 'multiple_choice', 
    patterns: [
      /select\s+(?:the\s+)?(?:correct|best|appropriate)/i,
      /choose\s+(?:the\s+)?(?:correct|best)/i,
      /which\s+(?:of\s+)?(?:the\s+)?following/i,
      /option\s+(?:a|b|c|d)/i,
      /\(a\).*\(b\).*\(c\)/i,
      /circle\s+(?:the\s+)?(?:correct|answer)/i
    ]
  },
  // Smart Math input - calculations
  { 
    type: 'smart_math', 
    patterns: [
      /calculate/i,
      /find\s+(?:the\s+)?(?:value|exact|probability)/i,
      /solve\s+(?:for|the)/i,
      /evaluate/i,
      /determine\s+(?:the\s+)?(?:value|equation)/i,
      /what\s+is\s+(?:the\s+)?(?:value|probability)/i,
      /compute/i,
      /work\s+out/i,
      /express\s+.*(?:in\s+)?(?:simplest|standard)\s+form/i
    ]
  }
];

// Auto-detect interactive type from question content with enhanced patterns
function autoDetectType(questionText?: string, diagramDesc?: string, config?: AnswerBlockConfig): InteractiveType {
  const text = `${questionText || ''} ${diagramDesc || ''}`.toLowerCase();
  
  // Check for explicit configs first
  if (config?.tableConfig) return 'table_input';
  if (config?.graphConfig) return 'graph_plot';
  if (config?.dragDropConfig) return 'drag_drop';
  if (config?.imageDropConfig) return 'image_drop';
  if (config?.arrangeConfig) return 'arrange_order';
  if (config?.smartMathConfig) return 'smart_math';
  if (config?.mcqConfig) return 'multiple_choice';
  
  // Pattern-based detection with priority ordering
  for (const { type, patterns } of INTERACTIVE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
  }
  
  // Default to text/equation for general questions
  return 'text_equation';
}

const InteractiveAnswerBlock: React.FC<InteractiveAnswerBlockProps> = ({
  questionId,
  subQuestionId,
  detectedType,
  config,
  value,
  onChange,
  wordLimit,
  placeholder = 'Enter your answer here...',
  disabled = false,
  allowTypeChange = true,
  questionText,
  diagramDescription
}) => {
  const autoType = autoDetectType(questionText, diagramDescription, config);
  const [currentType, setCurrentType] = useState<InteractiveType>(detectedType || autoType);
  const [showMathKeyboard, setShowMathKeyboard] = useState(false);

  const getWordCount = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const currentTypeInfo = TYPE_OPTIONS.find(t => t.type === currentType) || TYPE_OPTIONS[0];

  const renderAnswerComponent = () => {
    switch (currentType) {
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

      case 'drag_drop': {
        const dragDropItems = config?.dragDropConfig?.items || [
          { id: 'item-1', content: 'Item A', isLatex: false },
          { id: 'item-2', content: 'Item B', isLatex: false },
          { id: 'item-3', content: 'Item C', isLatex: false }
        ];
        const rawTargets = config?.dragDropConfig?.targets || [
          { id: 'target-1', label: 'Drop Zone 1', correctItemId: 'item-1' },
          { id: 'target-2', label: 'Drop Zone 2', correctItemId: 'item-2' },
          { id: 'target-3', label: 'Drop Zone 3', correctItemId: 'item-3' }
        ];
        const dragDropTargets = rawTargets.map(t => ({ 
          ...t, 
          correctItemId: t.correctItemId || '' 
        }));
        
        return (
          <DragDropMatcher
            items={dragDropItems}
            targets={dragDropTargets}
            onMatchesChange={(matches) => onChange(matches)}
            showFeedback={false}
          />
        );
      }

      case 'image_drop': {
        const imageUrl = config?.imageDropConfig?.imageUrl || '';
        const dropZones = config?.imageDropConfig?.dropZones || [
          { id: 'zone-1', x: 25, y: 50, label: 'A' },
          { id: 'zone-2', x: 75, y: 50, label: 'B' }
        ];
        const draggableLabels = config?.imageDropConfig?.draggableLabels || [
          { id: 'label-1', content: 'Label 1' },
          { id: 'label-2', content: 'Label 2' }
        ];
        
        if (!imageUrl) {
          return (
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              <MousePointer2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Image Drop Zone</p>
              <p className="text-sm">No image configured for this question</p>
            </div>
          );
        }
        
        return (
          <ImageDropZone
            imageUrl={imageUrl}
            dropZones={dropZones.map(z => ({ ...z, correctLabel: z.label || '' }))}
            draggableLabels={draggableLabels}
            onPlacementsChange={(placements) => onChange(placements)}
            showFeedback={false}
          />
        );
      }

      case 'arrange_order': {
        const steps = config?.arrangeConfig?.items?.map((item, i) => ({
          ...item,
          correctOrder: item.correctOrder || i + 1
        })) || [
          { id: 'step-1', content: 'Step 1', correctOrder: 1 },
          { id: 'step-2', content: 'Step 2', correctOrder: 2 },
          { id: 'step-3', content: 'Step 3', correctOrder: 3 }
        ];
        return (
          <StepBuilder
            steps={steps}
            onOrderChange={(orderedIds) => onChange(orderedIds)}
            showFeedback={false}
          />
        );
      }

      case 'smart_math':
        return (
          <SmartMathInput
            expectedAnswer={config?.smartMathConfig?.expectedAnswer || ''}
            acceptedFormats={config?.smartMathConfig?.acceptedFormats}
            onAnswerChange={(answer) => onChange(answer)}
            showFeedback={false}
          />
        );

      case 'multiple_choice': {
        const options = config?.mcqConfig?.options || [
          { id: 'opt-a', content: 'Option A', isCorrect: false },
          { id: 'opt-b', content: 'Option B', isCorrect: false },
          { id: 'opt-c', content: 'Option C', isCorrect: false },
          { id: 'opt-d', content: 'Option D', isCorrect: false }
        ];
        return (
          <div className="space-y-2">
            {options.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (config?.mcqConfig?.allowMultiple) {
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
      }

      case 'table_input': {
        const tableConfig = config?.tableConfig || {
          headers: ['x', 'f(x)'],
          rows: [
            { cells: [{ value: '1', editable: false }, { value: '', editable: true, correct: '2' }] },
            { cells: [{ value: '2', editable: false }, { value: '', editable: true, correct: '4' }] },
            { cells: [{ value: '3', editable: false }, { value: '', editable: true, correct: '6' }] }
          ]
        };
        
        const tableValue = value || {};
        
        const handleCellChange = (rowIndex: number, cellIndex: number, newValue: string) => {
          const newTableValue = { ...tableValue };
          if (!newTableValue[rowIndex]) {
            newTableValue[rowIndex] = {};
          }
          newTableValue[rowIndex][cellIndex] = newValue;
          onChange(newTableValue);
        };
        
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted">
                  {tableConfig.headers.map((header, idx) => (
                    <th key={idx} className="border border-border px-4 py-2 text-sm font-semibold text-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableConfig.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                    {row.cells.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-border px-2 py-1">
                        {cell.editable ? (
                          <input
                            type="text"
                            value={tableValue[rowIdx]?.[cellIdx] || ''}
                            onChange={(e) => handleCellChange(rowIdx, cellIdx, e.target.value)}
                            disabled={disabled}
                            className="w-full px-2 py-1 text-center bg-background border border-input rounded focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="?"
                          />
                        ) : (
                          <span className="block text-center font-medium text-foreground">
                            {cell.value}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {tableConfig.tableType && (
              <Badge variant="outline" className="mt-2 text-xs">
                {tableConfig.tableType.replace('_', ' ')} table
              </Badge>
            )}
          </div>
        );
      }

      case 'text_equation':
      default:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMathKeyboard(!showMathKeyboard)}
                className="flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Math Tools
                {showMathKeyboard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              {wordLimit && (
                <Badge variant={getWordCount(value) > wordLimit ? 'destructive' : 'secondary'}>
                  {getWordCount(value)} / {wordLimit} words
                </Badge>
              )}
            </div>

            {showMathKeyboard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-lg bg-muted/30"
              >
                <MathKeyboard
                  value={value || ''}
                  onChange={onChange}
                  placeholder={placeholder}
                />
              </motion.div>
            )}

            {!showMathKeyboard && (
              <Textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="min-h-[150px] font-mono text-base resize-y"
              />
            )}
          </div>
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
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-xs gap-1">
              {currentTypeInfo.icon}
              {currentTypeInfo.label}
            </Badge>
            
            {allowTypeChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    <Settings2 className="w-3 h-3 mr-1" />
                    Change Type
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {TYPE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      onClick={() => setCurrentType(option.type)}
                      className={currentType === option.type ? 'bg-primary/10' : ''}
                    >
                      {option.icon}
                      <span className="ml-2">{option.label}</span>
                      {option.type === autoType && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          Detected
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {renderAnswerComponent()}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InteractiveAnswerBlock;
