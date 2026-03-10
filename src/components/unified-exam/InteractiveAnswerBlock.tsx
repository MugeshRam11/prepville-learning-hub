import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Settings2,
  PenTool,
  GripHorizontal,
  MousePointer2,
  ListOrdered,
  Hash,
  CheckSquare,
  FileText,
  Table2,
  Check,
  X
} from 'lucide-react';

// Import interactive components
import InteractiveGraphCanvas from '@/components/mock-exam/InteractiveGraphCanvas';
import GraphPlotPlayer from '@/components/mock-exam/GraphPlotPlayer';
import PuzzleDragDrop from '@/components/mock-exam/PuzzleDragDrop';
import ImageDropZone from '@/components/mock-exam/ImageDropZone';
import StepBuilder from '@/components/mock-exam/StepBuilder';
import SmartMathInput from '@/components/mock-exam/SmartMathInput';
import SmartMathPlayer from '@/components/mock-exam/SmartMathPlayer';
import TableAnswerValidator, { validateTableAnswers } from '@/components/unified-exam/TableAnswerValidator';
import EquationEditor from '@/components/admin/EquationEditor';

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
  showValidation?: boolean;
  onValidate?: () => void;
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
  const flatCfg = config as any;
  
  // Check for explicit configs first (nested or flat)
  if (config?.tableConfig || flatCfg?.headers) return 'table_input';
  if (config?.graphConfig) return 'graph_plot';
  if (config?.dragDropConfig || flatCfg?.draggableItems || flatCfg?.sourceItems) return 'drag_drop';
  if (config?.imageDropConfig || flatCfg?.zones) return 'image_drop';
  if (config?.arrangeConfig || flatCfg?.correctOrder) return 'arrange_order';
  if (config?.smartMathConfig || flatCfg?.expectedAnswers || flatCfg?.palettes) return 'smart_math';
  if (config?.mcqConfig || flatCfg?.options) return 'multiple_choice';
  
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
  diagramDescription,
  showValidation = false,
  onValidate
}) => {
  const autoType = autoDetectType(questionText, diagramDescription, config);
  const [currentType, setCurrentType] = useState<InteractiveType>(detectedType || autoType);
  const [validationTriggered, setValidationTriggered] = useState(false);

  // Validate table answers
  const tableValidation = useCallback(() => {
    if (currentType === 'table_input' && config?.tableConfig) {
      return validateTableAnswers(config.tableConfig, value || {});
    }
    return null;
  }, [currentType, config, value]);

  const getWordCount = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const currentTypeInfo = TYPE_OPTIONS.find(t => t.type === currentType) || TYPE_OPTIONS[0];

  const renderAnswerComponent = () => {
    switch (currentType) {
      case 'graph_plot': {
        // Read graph config from admin — support both nested graphConfig and flat canvas/allowedTools
        const flatCfg = config as any;
        const graphCanvas = flatCfg?.canvas || config?.graphConfig || {};
        const xMin = graphCanvas.xMin ?? -10;
        const xMax = graphCanvas.xMax ?? 10;
        const yMin = graphCanvas.yMin ?? -10;
        const yMax = graphCanvas.yMax ?? 10;
        const gridStep = graphCanvas.gridStep ?? 1;
        const showNumbers = graphCanvas.showNumbers ?? true;
        const showAxisLabels = graphCanvas.showAxisLabels ?? true;
        const allowedTools: string[] = flatCfg?.allowedTools || ['point', 'line', 'move', 'erase'];

        // Compute grid size in pixels based on range
        const canvasWidth = 400;
        const canvasHeight = 400;

        return (
          <GraphPlotPlayer
            canvasConfig={{ xMin, xMax, yMin, yMax, gridStep, showNumbers, showAxisLabels }}
            allowedTools={allowedTools}
            value={value || { points: [], lines: [] }}
            onChange={onChange}
            disabled={disabled}
            width={canvasWidth}
            height={canvasHeight}
          />
        );
      }

      case 'drag_drop': {
        // Support multiple config formats:
        // 1. New flat admin format: { sourceItems, targetItems, correctMatches }
        // 2. Legacy dragDropConfig: { items, targets }
        // 3. Legacy direct: { draggableItems, dropTargets }
        const dragDropConfig = config?.dragDropConfig;
        const directConfig = config as any;
        
        // Resolve source items (draggable chips)
        const sourceItems = directConfig?.sourceItems || dragDropConfig?.items || directConfig?.draggableItems || [
          { id: 'item-1', content: '6 : 4' },
          { id: 'item-2', content: '24 : 36' },
          { id: 'item-3', content: '1 : 3' }
        ];
        
        // Resolve target items (drop slots)
        const targetItems = directConfig?.targetItems || dragDropConfig?.targets || directConfig?.dropTargets || [
          { id: 'slot-1', label: 'Match 1', correctItemId: 'item-1' },
          { id: 'slot-2', label: 'Match 2', correctItemId: 'item-2' },
          { id: 'slot-3', label: 'Match 3', correctItemId: 'item-3' }
        ];
        
        // Map to DragDropMatcher format: items need { id, content }, targets need { id, label, correctItemId }
        const dragItems = sourceItems.map((s: any) => ({
          id: s.id,
          content: s.content || s.label || s.id,
          isLatex: s.isLatex || false,
          color: s.color,
        }));
        
        // For new admin format, correctMatches is sourceId->targetId, but DragDropMatcher uses target.correctItemId
        const correctMatches = directConfig?.correctMatches || {};
        
        // Build reverse map: targetId -> sourceId
        const reverseMatches: Record<string, string> = {};
        Object.entries(correctMatches).forEach(([srcId, tgtId]) => {
          reverseMatches[tgtId as string] = srcId;
        });
        
        const puzzleSlots = targetItems.map((t: any) => ({
          id: t.id,
          label: t.content || t.label || t.id,
          correctItemId: t.correctItemId || reverseMatches[t.id] || '',
          shape: 'notch' as const,
          image: t.image || t.imageUrl,
        }));
        
        return (
          <PuzzleDragDrop
            items={dragItems}
            slots={puzzleSlots}
            onMatchesChange={(matches) => onChange(matches)}
            showFeedback={showValidation}
            puzzleTitle={questionText || "Match the items"}
          />
        );
      }

      case 'image_drop': {
        // Admin saves flat config: { imageUrl, zones, elements, answers }
        // Type definition expects nested: config.imageDropConfig.imageUrl
        // Support both formats
        const flatCfg = config as any;
        const nestedCfg = config?.imageDropConfig;
        
        const imageUrl = nestedCfg?.imageUrl || flatCfg?.imageUrl || '';
        
        // Map admin "zones" format to dropZones expected by ImageDropZone component
        const adminZones = flatCfg?.zones || [];
        const dropZones = nestedCfg?.dropZones || (adminZones.length > 0
          ? adminZones.map((z: any) => ({ id: z.id, x: z.x, y: z.y, width: z.width, height: z.height, label: z.label }))
          : []);
        
        // Map admin "elements" to draggableLabels — preserve ALL fields
        const adminElements = flatCfg?.elements || [];
        const draggableLabels = nestedCfg?.draggableLabels || (adminElements.length > 0
          ? adminElements.map((e: any) => {
              const rawText = e?.content ?? e?.label ?? e?.text ?? '';
              const content = rawText === null || rawText === undefined
                ? ''
                : (typeof rawText === 'string' ? rawText : String(rawText));
              const imageUrl = (e?.imageUrl || e?.image_url || undefined) as string | undefined;
              return {
                id: String(e.id),
                content: content.trim(),
                type: e.type || (imageUrl ? 'image' : 'text'),
                imageUrl,
              };
            })
          : []);
        
        
        if (!imageUrl) {
          return (
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              <MousePointer2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Image Drop Zone not configured</p>
              <p className="text-sm">This question's image or zones were not saved correctly. Please contact your admin.</p>
            </div>
          );
        }
        
        if (dropZones.length === 0 || draggableLabels.length === 0) {
          return (
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              <MousePointer2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Incomplete configuration</p>
              <p className="text-sm">Drop zones or draggable elements are missing. Please contact your admin.</p>
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
        // Support new flat admin config (items/correctOrder) and legacy (arrangeConfig.items with correctOrder field)
        const flatCfg = config as any;
        const rawItems = flatCfg?.items || config?.arrangeConfig?.items || [
          { id: 'step-1', content: 'Step 1', correctOrder: 1 },
          { id: 'step-2', content: 'Step 2', correctOrder: 2 },
          { id: 'step-3', content: 'Step 3', correctOrder: 3 }
        ];
        
        // Build correctOrder-based index if new format has correctOrder array
        const correctOrderArr: string[] = flatCfg?.correctOrder || [];
        
        const steps = rawItems.map((item: any, i: number) => {
          // If we have explicit correctOrder array, use position in that array
          const orderIdx = correctOrderArr.indexOf(item.id);
          return {
            ...item,
            correctOrder: orderIdx >= 0 ? orderIdx + 1 : (item.correctOrder || i + 1),
          };
        });
        
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
        // Support both nested mcqConfig and flat admin config format
        const mcqCfg = config?.mcqConfig;
        const flatCfg = config as any;
        const options = mcqCfg?.options || flatCfg?.options || [
          { id: 'opt-a', content: 'Option A', isCorrect: false },
          { id: 'opt-b', content: 'Option B', isCorrect: false },
          { id: 'opt-c', content: 'Option C', isCorrect: false },
          { id: 'opt-d', content: 'Option D', isCorrect: false }
        ];
        const allowMultiple = mcqCfg?.allowMultiple || flatCfg?.mode === 'multiple';

        return (
          <div className="space-y-2">
            {options.map((option: any, idx: number) => {
              const isSelected = allowMultiple
                ? (Array.isArray(value) && value.includes(option.id))
                : value === option.id;

              return (
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
                  className={cn(
                    'w-full p-4 text-left rounded-lg border-2 transition-all flex items-center gap-3',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
                  )}
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'border-2 border-muted-foreground/30'
                  )}>
                    {option.label || String.fromCharCode(65 + idx)}
                  </span>
                  <span className={cn('font-medium', isSelected && 'text-primary')}>
                    {option.content || `Option ${String.fromCharCode(65 + idx)}`}
                  </span>
                </button>
              );
            })}
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
        const validation = (showValidation || validationTriggered) ? validateTableAnswers(tableConfig, tableValue) : null;
        
        const handleCellChange = (rowIndex: number, cellIndex: number, newValue: string) => {
          const newTableValue = { ...tableValue };
          if (!newTableValue[rowIndex]) {
            newTableValue[rowIndex] = {};
          }
          newTableValue[rowIndex][cellIndex] = newValue;
          onChange(newTableValue);
        };

        const getCellValidationClass = (rowIdx: number, cellIdx: number, isEditable: boolean) => {
          if (!isEditable || !validation) return '';
          const cellKey = `${rowIdx}-${cellIdx}`;
          const result = validation.cellResults.get(cellKey);
          
          switch (result) {
            case 'correct':
              return 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/30';
            case 'incorrect':
              return 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30';
            default:
              return '';
          }
        };

        const getCellIcon = (rowIdx: number, cellIdx: number, isEditable: boolean) => {
          if (!isEditable || !validation) return null;
          const cellKey = `${rowIdx}-${cellIdx}`;
          const result = validation.cellResults.get(cellKey);
          
          switch (result) {
            case 'correct':
              return <Check className="w-3 h-3 text-green-600 absolute -top-1 -right-1" />;
            case 'incorrect':
              return <X className="w-3 h-3 text-red-600 absolute -top-1 -right-1" />;
            default:
              return null;
          }
        };
        
        return (
          <div className="space-y-3">
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
                            <div className="relative">
                              <input
                                type="text"
                                value={tableValue[rowIdx]?.[cellIdx] || ''}
                                onChange={(e) => handleCellChange(rowIdx, cellIdx, e.target.value)}
                                disabled={disabled}
                                className={`w-full px-2 py-1 text-center bg-background border border-input rounded focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${getCellValidationClass(rowIdx, cellIdx, true)}`}
                                placeholder="?"
                              />
                              {getCellIcon(rowIdx, cellIdx, true)}
                            </div>
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
            </div>
            
            <div className="flex items-center justify-between">
              {tableConfig.tableType && (
                <Badge variant="outline" className="text-xs">
                  {tableConfig.tableType.replace('_', ' ')} table
                </Badge>
              )}
              
              {!showValidation && !validationTriggered && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValidationTriggered(true);
                    onValidate?.();
                  }}
                  className="text-xs"
                >
                  Check Answers
                </Button>
              )}
            </div>
            
            {/* Validation Results */}
            {(showValidation || validationTriggered) && validation && (
              <TableAnswerValidator
                tableConfig={tableConfig}
                tableValue={tableValue}
                showResults={true}
              />
            )}
          </div>
        );
      }

      case 'text_equation':
      default:
        return (
          <div className="space-y-3">
            {wordLimit && (
              <div className="flex justify-end">
                <Badge variant={getWordCount(value) > wordLimit ? 'destructive' : 'secondary'}>
                  {getWordCount(value)} / {wordLimit} words
                </Badge>
              </div>
            )}
            
            {/* Word-like Equation Editor */}
            <EquationEditor
              value={value || ''}
              onChange={onChange}
              placeholder={placeholder}
            />
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
