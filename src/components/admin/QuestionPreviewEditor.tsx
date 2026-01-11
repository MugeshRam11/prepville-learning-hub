import React, { useState, useRef } from 'react';
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Check, X, Edit2, Trash2, Save, ChevronDown, ChevronUp, AlertCircle, Image as ImageIcon, BarChart3, Crop, Wand2, Eye, Images, Loader2, FolderTree, Table, FileImage, ListChecks, Settings2, RefreshCw, Sparkles, ImagePlus, AlertTriangle, CheckCircle2, ScrollText } from 'lucide-react';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import PageRegionsOverlay from './PageRegionsOverlay';
import TableBuilder, { TableConfig } from './TableBuilder';
import { useDiagramCropping } from '@/hooks/useDiagramCropping';
import { useAutoDiagramCropper } from '@/hooks/useAutoDiagramCropper';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  parent_question?: string | null;
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
  has_table?: boolean;
  table_data?: string[][] | null;
  table_config?: TableConfig | null;
  is_table?: boolean;
  is_diagram?: boolean;
  related_questions?: string[];
  command_term?: string | null;
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
  
  // Re-parse and generate states
  const [reparsingIndex, setReparsingIndex] = useState<number | null>(null);
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  
  // Scroll ref for scrolling to questions
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
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

  // Questions needing attention (missing images, unusual parsing)
  const questionsNeedingAttention = questions.filter(
    q => (q.graph_found && !q.question_image_url) || !q.parsing_verified || q.question_text?.includes('error')
  );

  // Get questions with diagrams that need cropping
  const questionsWithDiagrams = questions.filter(
    q => q.graph_found && q.graph_bounding_box && !q.question_image_url && getSourceImageForQuestion(q)
  );

  // Get questions with diagrams that need AI generation (no bounding box)
  const questionsNeedingGeneration = questions.filter(
    q => q.graph_found && !q.graph_bounding_box && !q.question_image_url
  );

  // Scroll to a specific question
  const scrollToQuestion = (index: number) => {
    const element = questionRefs.current.get(index);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Re-parse a single question from its source image
  const handleReparseQuestion = async (index: number) => {
    const q = questions[index];
    const sourceImage = getSourceImageForQuestion(q);
    
    if (!sourceImage) {
      toast.error('No source image available for re-parsing');
      return;
    }
    
    setReparsingIndex(index);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-parser', {
        body: {
          images: [sourceImage],
          startPage: 0,
          focusQuestion: q.question_number
        }
      });
      
      if (error) throw error;
      
      if (data?.all_pages?.[0]) {
        const reparsed = data.all_pages[0];
        const updated = [...questions];
        updated[index] = {
          ...updated[index],
          question_text: reparsed.question_text || q.question_text,
          marks: reparsed.marks || q.marks,
          graph_found: reparsed.graph_found ?? q.graph_found,
          graph_bounding_box: reparsed.graph_bounding_box || q.graph_bounding_box,
          diagram_type: reparsed.diagram_type || q.diagram_type,
          command_term: reparsed.command_term || q.command_term,
          interactive_type: reparsed.interactive_type || q.interactive_type,
          parsing_verified: true
        };
        setQuestions(updated);
        toast.success(`Question ${q.question_number} re-parsed successfully`);
      }
    } catch (error: any) {
      console.error('Re-parse error:', error);
      toast.error('Failed to re-parse question');
    } finally {
      setReparsingIndex(null);
    }
  };

  // Generate missing image for a question using AI
  const handleGenerateImage = async (index: number) => {
    const q = questions[index];
    setGeneratingImageIndex(index);
    
    try {
      const description = q.graph_description || q.diagram_description || 
        `Mathematical diagram for: ${q.question_text.substring(0, 200)}`;
      
      const result = await generateMissingDiagram(
        description,
        q.question_text,
        q.question_number,
        q.graph_type || q.diagram_type || undefined
      );
      
      if (result) {
        const updated = [...questions];
        updated[index] = {
          ...updated[index],
          question_image_url: result.url,
          graph_found: true
        };
        setQuestions(updated);
        toast.success(`Image generated for Question ${q.question_number}`);
      }
    } catch (error: any) {
      console.error('Generate image error:', error);
      toast.error('Failed to generate image');
    } finally {
      setGeneratingImageIndex(null);
    }
  };

  // Generate all missing images
  const handleGenerateAllMissingImages = async () => {
    if (questionsNeedingGeneration.length === 0) {
      toast.info('No questions need image generation');
      return;
    }
    
    setIsGeneratingAll(true);
    let successCount = 0;
    
    for (const q of questionsNeedingGeneration) {
      const index = questions.findIndex(x => x.question_number === q.question_number && x.page === q.page);
      if (index === -1) continue;
      
      try {
        const description = q.graph_description || q.diagram_description || 
          `Mathematical diagram for: ${q.question_text.substring(0, 200)}`;
        
        const result = await generateMissingDiagram(
          description,
          q.question_text,
          q.question_number,
          q.graph_type || q.diagram_type || undefined
        );
        
        if (result) {
          const updated = [...questions];
          updated[index] = {
            ...updated[index],
            question_image_url: result.url,
            graph_found: true
          };
          setQuestions(updated);
          successCount++;
        }
      } catch (e) {
        console.error(`Failed to generate image for Q${q.question_number}:`, e);
      }
    }
    
    setIsGeneratingAll(false);
    toast.success(`Generated ${successCount}/${questionsNeedingGeneration.length} images`);
  };

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
    <TooltipProvider>
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Review Extracted Questions ({selectedQuestions.size}/{questions.length} selected)
          </DialogTitle>
          
          {/* Status Summary Bar */}
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-3 h-3" />
              <span>{questions.filter(q => q.parsing_verified !== false).length} Verified</span>
            </div>
            {questionsWithDiagrams.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-full border border-purple-200 dark:border-purple-800">
                <Crop className="w-3 h-3" />
                <span>{questionsWithDiagrams.length} Ready to Crop</span>
              </div>
            )}
            {questionsNeedingGeneration.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3 h-3" />
                <span>{questionsNeedingGeneration.length} Need Images</span>
              </div>
            )}
            {questionsNeedingAttention.length > 0 && (
              <button 
                onClick={() => questionsNeedingAttention[0] && scrollToQuestion(questions.indexOf(questionsNeedingAttention[0]))}
                className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{questionsNeedingAttention.length} Need Attention</span>
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          {/* Metadata Section - Collapsible */}
          <Card className="flex-shrink-0 border-primary/20">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-primary" />
                Test Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 py-2 px-4">
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Title</label>
                <Input
                  value={metadata.title || ''}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Test title"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Subject</label>
                <Select
                  value={metadata.subject || 'mathematics'}
                  onValueChange={(v) => setMetadata({ ...metadata, subject: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
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
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Topic</label>
                <Input
                  value={metadata.topic || ''}
                  onChange={(e) => setMetadata({ ...metadata, topic: e.target.value })}
                  placeholder="Topic"
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap p-2 bg-muted/30 rounded-lg border">
            {/* Selection Controls */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={selectAll} className="h-8">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll} className="h-8">
                Deselect All
              </Button>
            </div>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            {/* View Mode Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grouped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'flat' ? 'grouped' : 'flat')}
                  className="h-8"
                >
                  <FolderTree className="w-3.5 h-3.5 mr-1.5" />
                  {viewMode === 'grouped' ? 'Grouped' : 'Flat'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle between flat list and grouped by parent question</TooltipContent>
            </Tooltip>
            
            <div className="flex-1" />
            
            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              {/* Bulk Crop Diagrams */}
              {questionsWithDiagrams.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkCropDiagrams}
                      disabled={isBulkCropping}
                      className="h-8 border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      {isBulkCropping ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          {bulkCropProgress.current}/{bulkCropProgress.total}
                        </>
                      ) : (
                        <>
                          <Crop className="w-3.5 h-3.5 mr-1.5" />
                          Crop All ({questionsWithDiagrams.length})
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Auto-crop all detected diagrams from source pages</TooltipContent>
                </Tooltip>
              )}
              
              {/* Generate All Missing Images */}
              {questionsNeedingGeneration.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAllMissingImages}
                      disabled={isGeneratingAll}
                      className="h-8 border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      {isGeneratingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Generate Images ({questionsNeedingGeneration.length})
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>AI-generate missing diagrams for all questions</TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {questions.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600">
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
                  ref={(el) => { if (el) questionRefs.current.set(index, el); }}
                  className={`transition-all ${
                    selectedQuestions.has(index)
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border opacity-60'
                  } ${!q.parsing_verified ? 'ring-2 ring-amber-400/50' : ''} ${
                    q.graph_found && !q.question_image_url ? 'border-l-4 border-l-amber-400' : ''
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

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {/* Action buttons row */}
                        <div className="flex items-center gap-1">
                          {/* Re-parse button */}
                          {getSourceImageForQuestion(q) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleReparseQuestion(index)}
                                  disabled={reparsingIndex === index}
                                >
                                  {reparsingIndex === index ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Re-parse this question from source</TooltipContent>
                            </Tooltip>
                          )}
                          
                          {/* Generate image button (only if graph found but no image) */}
                          {q.graph_found && !q.question_image_url && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleGenerateImage(index)}
                                  disabled={generatingImageIndex === index}
                                >
                                  {generatingImageIndex === index ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Generate missing image with AI</TooltipContent>
                            </Tooltip>
                          )}
                          
                          {/* Edit button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit question</TooltipContent>
                          </Tooltip>
                          
                          {/* Delete button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteQuestion(index)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete question</TooltipContent>
                          </Tooltip>
                        </div>
                        
                        {/* Status indicator */}
                        {!q.parsing_verified && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Unverified
                          </span>
                        )}
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

        <DialogFooter className="gap-2 flex-shrink-0 pt-3 border-t bg-muted/30 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
          <div className="flex-1 text-xs text-muted-foreground">
            {questionsWithDiagrams.length + questionsNeedingGeneration.length > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                {questionsWithDiagrams.length + questionsNeedingGeneration.length} questions may need images
              </span>
            )}
          </div>
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedQuestions.size === 0}
            className="gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Save className="w-4 h-4" />
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
  </TooltipProvider>
  );
};

export default QuestionPreviewEditor;
