import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Edit2, Trash2, Save, ChevronDown, ChevronUp, AlertCircle, Image as ImageIcon, BarChart3, Crop, Wand2, Eye, Images, Loader2, FolderTree, Table, FileImage, ListChecks, Settings2 } from 'lucide-react';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import PageRegionsOverlay from './PageRegionsOverlay';
import TableBuilder, { TableConfig } from './TableBuilder';
import { useDiagramCropping } from '@/hooks/useDiagramCropping';
import { useAutoDiagramCropper } from '@/hooks/useAutoDiagramCropper';
import { toast } from 'sonner';

interface SubQuestion {
  label: string;
  text: string;
  marks: number;
  answer?: string;
}

interface ParsedQuestion {
  question_number: number | string;
  question_text: string;
  question_image_url?: string | null;
  marks: number;
  has_sub_questions: boolean;
  parent_question?: string | null; // For sub-question grouping
  graph_found?: boolean;
  graph_bounding_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  } | null;
  graph_type?: string | null;
  graph_description?: string | null;
  diagram_crop?: {
    source_image_index: number;
    bbox: {
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
    };
    crop_instructions: string;
  } | null;
  has_diagram?: boolean;
  diagram_description?: string;
  sub_questions?: SubQuestion[];
  difficulty?: string;
  category?: string;
  correct_answer?: string;
  page?: number;
  model_used?: string;
  source_image?: string;
  // Table data support
  has_table?: boolean;
  table_data?: string[][] | null;
  table_config?: TableConfig | null;
  is_table?: boolean;
  is_diagram?: boolean;
  related_questions?: string[];
  command_term?: string | null;
  // Interactive type detection
  interactive_type?: string;
  answer_block_type?: string;
  parsing_verified?: boolean;
  options?: { A?: string; B?: string; C?: string; D?: string } | null;
  draggable_items?: string[];
  diagram_type?: string;
}

interface QuestionPreviewEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ParsedQuestion[];
  metadata?: {
    title?: string;
    subject?: string;
    topic?: string;
  };
  onConfirm: (questions: ParsedQuestion[], metadata: any) => void;
  onCancel: () => void;
  mode: 'quick' | 'mock';
  sourceImages?: string[];
}

const QuestionPreviewEditor: React.FC<QuestionPreviewEditorProps> = ({
  open,
  onOpenChange,
  questions: initialQuestions,
  metadata: initialMetadata,
  onConfirm,
  onCancel,
  mode,
  sourceImages = []
}) => {
  const [questions, setQuestions] = useState<ParsedQuestion[]>(initialQuestions);
  const [metadata, setMetadata] = useState(initialMetadata || { title: '', subject: 'mathematics', topic: '' });
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set(initialQuestions.map((_, i) => i)));
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Bounding box overlay state
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [selectedQuestionForOverlay, setSelectedQuestionForOverlay] = useState<number | null>(null);
  
  // Bulk cropping state
  const [isBulkCropping, setIsBulkCropping] = useState(false);
  const [bulkCropProgress, setBulkCropProgress] = useState({ current: 0, total: 0 });
  
  // View mode: 'flat' or 'grouped'
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  
  // Table builder state
  const [tableBuilderIndex, setTableBuilderIndex] = useState<number | null>(null);
  
  // Diagram cropping hooks
  const { isCropping, isGenerating, uploadCroppedImage, cropFromSourceImage, generateMissingDiagram } = useDiagramCropping();
  const { autoCropAllDiagrams, extractDiagramsFromParsedData, progress: autoCropProgress } = useAutoDiagramCropper();

  // Sync state when props change
  React.useEffect(() => {
    setQuestions(initialQuestions);
    setSelectedQuestions(new Set(initialQuestions.map((_, i) => i)));
  }, [initialQuestions]);

  React.useEffect(() => {
    setMetadata(initialMetadata || { title: '', subject: 'mathematics', topic: '' });
  }, [initialMetadata]);

  const toggleQuestion = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateSubQuestion = (qIndex: number, sqIndex: number, field: keyof SubQuestion, value: any) => {
    const updated = [...questions];
    if (updated[qIndex].sub_questions) {
      updated[qIndex].sub_questions![sqIndex] = {
        ...updated[qIndex].sub_questions![sqIndex],
        [field]: value
      };
      setQuestions(updated);
    }
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    const newSelected = new Set<number>();
    selectedQuestions.forEach(i => {
      if (i < index) newSelected.add(i);
      else if (i > index) newSelected.add(i - 1);
    });
    setSelectedQuestions(newSelected);
  };

  const handleConfirm = () => {
    const selectedQs = questions
      .filter((_, i) => selectedQuestions.has(i))
      .map((q, i) => ({ ...q, question_number: i + 1 }));
    
    if (selectedQs.length === 0) {
      return;
    }
    
    onConfirm(selectedQs, metadata);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(questions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const validSubjects = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'];

  // Open bounding box overlay for a question
  const openBoundingBoxOverlay = (index: number) => {
    setSelectedQuestionForOverlay(index);
    setOverlayOpen(true);
  };

  // Handle cropped image from overlay
  const handleCroppedImage = async (blob: Blob, questionIndex: number) => {
    const q = questions[questionIndex];
    const result = await uploadCroppedImage(blob, q.question_number, q.page || 1);
    
    if (result) {
      const updated = [...questions];
      updated[questionIndex] = {
        ...updated[questionIndex],
        question_image_url: result.url
      };
      setQuestions(updated);
      setOverlayOpen(false);
      toast.success('Diagram cropped and saved to question!');
    }
  };

  // Handle AI-generated diagram for missing images
  const handleGenerateDiagram = async (description: string, questionIndex: number) => {
    const q = questions[questionIndex];
    const result = await generateMissingDiagram(
      description,
      q.question_text,
      q.question_number,
      q.graph_type || undefined // Pass the detected graph type
    );
    
    if (result) {
      const updated = [...questions];
      updated[questionIndex] = {
        ...updated[questionIndex],
        question_image_url: result.url,
        graph_found: true
      };
      setQuestions(updated);
      setOverlayOpen(false);
      toast.success('AI diagram generated and saved to question!');
    }
  };

  // Get source image for a question
  const getSourceImageForQuestion = (q: ParsedQuestion): string | undefined => {
    if (q.source_image) return q.source_image;
    const pageIndex = (q.page || 1) - 1;
    return sourceImages[pageIndex];
  };

  // Get questions with diagrams that need cropping
  const questionsWithDiagrams = questions.filter(
    q => q.graph_found && q.graph_bounding_box && !q.question_image_url && getSourceImageForQuestion(q)
  );

  // Bulk crop all diagrams
  const handleBulkCropDiagrams = async () => {
    if (questionsWithDiagrams.length === 0) {
      toast.info('No diagrams to crop');
      return;
    }

    setIsBulkCropping(true);
    setBulkCropProgress({ current: 0, total: questionsWithDiagrams.length });

    const updated = [...questions];
    let successCount = 0;

    for (let i = 0; i < questionsWithDiagrams.length; i++) {
      const q = questionsWithDiagrams[i];
      const qIndex = questions.findIndex(x => x.question_number === q.question_number && x.page === q.page);
      
      if (qIndex === -1) continue;
      
      setBulkCropProgress({ current: i + 1, total: questionsWithDiagrams.length });
      
      const sourceImg = getSourceImageForQuestion(q);
      if (!sourceImg || !q.graph_bounding_box) continue;

      try {
        const result = await cropFromSourceImage(
          sourceImg,
          q.graph_bounding_box,
          q.question_number,
          q.page || 1
        );

        if (result) {
          updated[qIndex] = {
            ...updated[qIndex],
            question_image_url: result.url
          };
          successCount++;
        }
      } catch (e) {
        console.error(`Failed to crop diagram for Q${q.question_number}:`, e);
      }
    }

    setQuestions(updated);
    setIsBulkCropping(false);
    toast.success(`Cropped ${successCount}/${questionsWithDiagrams.length} diagrams`);
  };

  // Group questions by parent for hierarchical view
  const groupedQuestions = React.useMemo(() => {
    if (viewMode !== 'grouped') return null;

    const groups: Map<string, { main: ParsedQuestion & { originalIndex: number } | null; subs: (ParsedQuestion & { originalIndex: number })[] }> = new Map();
    
    questions.forEach((q, index) => {
      const qNum = String(q.question_number);
      const parentMatch = q.parent_question || qNum.match(/^(\d+)/)?.[1];
      const isMainQuestion = !q.parent_question && /^\d+$/.test(qNum);
      
      if (isMainQuestion) {
        if (!groups.has(qNum)) {
          groups.set(qNum, { main: { ...q, originalIndex: index }, subs: [] });
        } else {
          groups.get(qNum)!.main = { ...q, originalIndex: index };
        }
      } else {
        const parentNum = parentMatch || qNum.match(/^(\d+)/)?.[1] || '0';
        if (!groups.has(parentNum)) {
          groups.set(parentNum, { main: null, subs: [] });
        }
        groups.get(parentNum)!.subs.push({ ...q, originalIndex: index });
      }
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const numA = parseInt(a[0]) || 0;
      const numB = parseInt(b[0]) || 0;
      return numA - numB;
    });
  }, [questions, viewMode]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            Review Extracted Questions ({selectedQuestions.size}/{questions.length} selected)
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            PDR Output: question_number, question_text, graph_found, graph_bounding_box
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Metadata Section */}
          <Card className="flex-shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Test Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 py-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Title</label>
                <Input
                  value={metadata.title || ''}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Test title"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Subject</label>
                <Select
                  value={metadata.subject || 'mathematics'}
                  onValueChange={(v) => setMetadata({ ...metadata, subject: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {validSubjects.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Topic</label>
                <Input
                  value={metadata.topic || ''}
                  onChange={(e) => setMetadata({ ...metadata, topic: e.target.value })}
                  placeholder="Topic"
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selection Controls */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
            
            {/* View Mode Toggle */}
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === 'flat' ? 'grouped' : 'flat')}
              className="ml-2"
            >
              <FolderTree className="w-3 h-3 mr-1" />
              {viewMode === 'grouped' ? 'Grouped' : 'Flat'} View
            </Button>
            
            {/* Bulk Crop Diagrams */}
            {questionsWithDiagrams.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkCropDiagrams}
                disabled={isBulkCropping}
                className="ml-auto border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                {isBulkCropping ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Cropping {bulkCropProgress.current}/{bulkCropProgress.total}...
                  </>
                ) : (
                  <>
                    <Images className="w-3 h-3 mr-1" />
                    Crop All Diagrams ({questionsWithDiagrams.length})
                  </>
                )}
              </Button>
            )}
            
            {questions.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 ml-auto">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">No questions extracted</span>
              </div>
            )}
          </div>

          {/* Questions List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2 space-y-2">
              {/* Grouped View */}
              {viewMode === 'grouped' && groupedQuestions && groupedQuestions.map(([parentNum, group]) => (
                <Card key={parentNum} className="border-2 border-primary/30">
                  <div className="p-3">
                    {/* Parent Question Header */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                      <FolderTree className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-primary">Question {parentNum}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.main ? 1 : 0} main + {group.subs.length} sub-questions
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Total marks: {(group.main?.marks || 0) + group.subs.reduce((sum, s) => sum + (s.marks || 0), 0)}
                      </span>
                    </div>
                    
                    {/* Main Question */}
                    {group.main && (
                      <div className={`p-2 rounded mb-2 ${
                        selectedQuestions.has(group.main.originalIndex)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/50 opacity-60'
                      }`}>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedQuestions.has(group.main.originalIndex)}
                            onCheckedChange={() => toggleQuestion(group.main!.originalIndex)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-mono">Q{group.main.question_number}</Badge>
                              <Badge variant="secondary" className="text-xs">{group.main.marks || 1} marks</Badge>
                              {group.main.graph_found && (
                                <Badge variant="outline" className="text-xs text-purple-600">
                                  <BarChart3 className="w-3 h-3 mr-1" />Graph
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2">{group.main.question_text}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Sub-Questions */}
                    {group.subs.length > 0 && (
                      <div className="ml-4 border-l-2 border-primary/20 pl-3 space-y-2">
                        {group.subs.map((sq) => (
                          <div
                            key={sq.originalIndex}
                            className={`p-2 rounded ${
                              selectedQuestions.has(sq.originalIndex)
                                ? 'bg-primary/10 border border-primary/30'
                                : 'bg-muted/30 opacity-60'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Checkbox
                                checked={selectedQuestions.has(sq.originalIndex)}
                                onCheckedChange={() => toggleQuestion(sq.originalIndex)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-mono">{sq.question_number}</Badge>
                                  <Badge variant="secondary" className="text-xs">{sq.marks || 1} marks</Badge>
                                  {sq.graph_found && (
                                    <Badge variant="outline" className="text-xs text-purple-600">
                                      <BarChart3 className="w-3 h-3 mr-1" />Graph
                                    </Badge>
                                  )}
                                  {sq.question_image_url && (
                                    <Badge variant="outline" className="text-xs text-green-600">
                                      <ImageIcon className="w-3 h-3 mr-1" />Image
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs line-clamp-2 text-muted-foreground">{sq.question_text}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openBoundingBoxOverlay(sq.originalIndex)}
                                disabled={!getSourceImageForQuestion(sq)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {/* Flat View */}
              {viewMode === 'flat' && questions.map((q, index) => (
                <Card
                  key={index}
                  className={`transition-all ${
                    selectedQuestions.has(index)
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border opacity-60'
                  }`}
                >
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedQuestions.has(index)}
                        onCheckedChange={() => toggleQuestion(index)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono">
                            question_number: {q.question_number}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {q.marks || 1} mark{(q.marks || 1) !== 1 ? 's' : ''}
                          </Badge>
                          {q.difficulty && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                q.difficulty === 'easy' ? 'text-green-600' :
                                q.difficulty === 'hard' ? 'text-red-600' : 'text-amber-600'
                              }`}
                            >
                              {q.difficulty}
                            </Badge>
                          )}
                          {q.question_image_url && (
                            <Badge variant="outline" className="text-xs text-blue-600">
                              <ImageIcon className="w-3 h-3 mr-1" />
                              Image
                            </Badge>
                          )}
                          {q.graph_found && (
                            <Badge variant="outline" className="text-xs text-purple-600">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Graph Detected
                            </Badge>
                          )}
                          {(q.has_table || q.is_table) && (
                            <Badge variant="outline" className="text-xs text-blue-600">
                              <Table className="w-3 h-3 mr-1" />
                              Table
                            </Badge>
                          )}
                          {q.command_term && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              {q.command_term}
                            </Badge>
                          )}
                          {q.page && (
                            <Badge variant="outline" className="text-xs">
                              Page {q.page}
                            </Badge>
                          )}
                        </div>

                        {/* Graph Bounding Box - PDR Field */}
                        {q.graph_found && (
                          <div className="mb-2 p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                                <BarChart3 className="w-3 h-3" />
                                graph_bounding_box (PDR):
                              </div>
                              <div className="flex items-center gap-1">
                                {q.model_used && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 rounded text-purple-600 dark:text-purple-400">
                                    {q.model_used}
                                  </span>
                                )}
                                {/* View Overlay Button */}
                                {getSourceImageForQuestion(q) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700"
                                    onClick={() => openBoundingBoxOverlay(index)}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Preview
                                  </Button>
                                )}
                              </div>
                            </div>
                            {q.graph_bounding_box ? (
                              <div className="space-y-2">
                                <div className="text-xs font-mono text-purple-600 dark:text-purple-400 grid grid-cols-2 gap-1">
                                  <span>x_min: {q.graph_bounding_box.x_min}%</span>
                                  <span>y_min: {q.graph_bounding_box.y_min}%</span>
                                  <span>x_max: {q.graph_bounding_box.x_max}%</span>
                                  <span>y_max: {q.graph_bounding_box.y_max}%</span>
                                </div>
                                {q.diagram_crop && (
                                  <p className="text-[10px] text-purple-500 dark:text-purple-400">
                                    📐 {q.diagram_crop.crop_instructions}
                                  </p>
                                )}
                                {/* Crop & Save Button */}
                                {getSourceImageForQuestion(q) && !q.question_image_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs border-purple-300 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                    onClick={() => openBoundingBoxOverlay(index)}
                                  >
                                    <Crop className="w-3 h-3 mr-1" />
                                    Crop & Save Diagram
                                  </Button>
                                )}
                                {q.question_image_url && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                      <Check className="w-3 h-3 mr-1" />
                                      Image saved
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">null</p>
                            )}
                            {/* Graph description */}
                            {q.graph_description && (
                              <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-1 italic">
                                📊 {q.graph_description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Show graph_found = false for questions without graphs */}
                        {!q.graph_found && (
                          <div className="mb-2 p-2 bg-muted/50 border border-border rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BarChart3 className="w-3 h-3" />
                                graph_found: <span className="font-mono">false</span>
                              </div>
                              {/* Generate diagram button for questions without detected graphs */}
                              {q.diagram_description && getSourceImageForQuestion(q) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => openBoundingBoxOverlay(index)}
                                >
                                  <Wand2 className="w-3 h-3 mr-1" />
                                  Generate Diagram
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {editingIndex === index ? (
                          <div className="space-y-2">
                            <Textarea
                              value={q.question_text}
                              onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                              className="text-sm min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={q.marks}
                                onChange={(e) => updateQuestion(index, 'marks', parseInt(e.target.value) || 1)}
                                className="w-20 h-8 text-sm"
                                placeholder="Marks"
                              />
                              <Select
                                value={q.difficulty || 'medium'}
                                onValueChange={(v) => updateQuestion(index, 'difficulty', v)}
                              >
                                <SelectTrigger className="w-28 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => setEditingIndex(null)}
                                className="h-8"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-mono">question_text:</p>
                            <p className="text-sm line-clamp-3">{q.question_text}</p>
                          </div>
                        )}

                        {/* Table Data Preview & Builder */}
                        {(q.table_data && q.table_data.length > 0) || q.has_table || q.is_table ? (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                <Table className="w-3 h-3" />
                                {q.table_data ? `table_data (${q.table_data.length} rows)` : 'Table Detected'}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs border-blue-300 text-blue-600 hover:bg-blue-100"
                                onClick={() => setTableBuilderIndex(index)}
                              >
                                <Settings2 className="w-3 h-3 mr-1" />
                                Edit Table Config
                              </Button>
                            </div>
                            
                            {/* Table Builder Modal */}
                            {tableBuilderIndex === index && (
                              <div className="mt-2">
                                <TableBuilder
                                  config={q.table_config || {
                                    headers: q.table_data?.[0] || ['x', 'f(x)'],
                                    rows: (q.table_data?.slice(1) || []).map(row => ({
                                      cells: row.map((cell, idx) => ({
                                        value: cell || '',
                                        editable: idx > 0,
                                        correct: ''
                                      }))
                                    })),
                                    tableType: 'data'
                                  }}
                                  onChange={(config) => updateQuestion(index, 'table_config', config)}
                                  onClose={() => setTableBuilderIndex(null)}
                                />
                              </div>
                            )}
                            
                            {/* Raw table preview when builder not open */}
                            {tableBuilderIndex !== index && q.table_data && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs border-collapse">
                                  <tbody>
                                    {q.table_data.slice(0, 5).map((row, rowIdx) => (
                                      <tr key={rowIdx} className={rowIdx === 0 ? 'font-semibold bg-blue-100 dark:bg-blue-900/50' : ''}>
                                        {row.map((cell, cellIdx) => (
                                          <td key={cellIdx} className="border border-blue-200 dark:border-blue-700 px-2 py-1">
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                    {q.table_data.length > 5 && (
                                      <tr>
                                        <td colSpan={q.table_data[0]?.length || 1} className="text-center text-blue-500 py-1">
                                          ... {q.table_data.length - 5} more rows
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Sub-questions */}
                        {q.has_sub_questions && q.sub_questions && q.sub_questions.length > 0 && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(index)}
                              className="h-6 text-xs px-2"
                            >
                              {expandedQuestions.has(index) ? (
                                <ChevronUp className="w-3 h-3 mr-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 mr-1" />
                              )}
                              {q.sub_questions.length} sub-question(s)
                            </Button>

                            {expandedQuestions.has(index) && (
                              <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary/20 pl-3">
                                {q.sub_questions.map((sq, sqIndex) => (
                                  <div key={sqIndex} className="text-xs">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {sq.label}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        ({sq.marks} mark{sq.marks !== 1 ? 's' : ''})
                                      </span>
                                    </div>
                                    <p className="mt-1 text-muted-foreground">{sq.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteQuestion(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Image Preview */}
                    {q.question_image_url && expandedQuestions.has(index) && (
                      <div className="mt-3 ml-8">
                        <img
                          src={q.question_image_url}
                          alt={`Question ${q.question_number} image`}
                          className="max-w-xs max-h-40 rounded border object-contain"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No questions were extracted from the document.</p>
                  <p className="text-sm">Try uploading a clearer document or different format.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedQuestions.size === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Bounding Box Overlay for diagram preview and cropping */}
    {selectedQuestionForOverlay !== null && (
      <BoundingBoxOverlay
        open={overlayOpen}
        onOpenChange={(open) => {
          setOverlayOpen(open);
          if (!open) setSelectedQuestionForOverlay(null);
        }}
        sourceImage={getSourceImageForQuestion(questions[selectedQuestionForOverlay]) || ''}
        boundingBox={questions[selectedQuestionForOverlay]?.graph_bounding_box || null}
        graphType={questions[selectedQuestionForOverlay]?.graph_type}
        graphDescription={questions[selectedQuestionForOverlay]?.graph_description || questions[selectedQuestionForOverlay]?.diagram_description}
        pageNumber={questions[selectedQuestionForOverlay]?.page || 1}
        onCrop={(blob) => handleCroppedImage(blob, selectedQuestionForOverlay)}
        onGenerateImage={(desc) => handleGenerateDiagram(desc, selectedQuestionForOverlay)}
        isCropping={isCropping}
        isGenerating={isGenerating}
      />
    )}
  </>
  );
};

export default QuestionPreviewEditor;
