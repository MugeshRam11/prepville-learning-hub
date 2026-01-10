import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle, XCircle, Brain, FileSearch, ListChecks, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import UploadProgressTracker from './UploadProgressTracker';
import AIDocumentProcessingModal, { ProcessingStep, ExtractedImage } from './AIDocumentProcessingModal';
import QuestionPreviewEditor from './QuestionPreviewEditor';

// Configure PDF.js worker - use the correct path for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface QuestionUploadCardProps {
  mode: 'quick' | 'mock';
  onSuccess?: (data: any) => void;
}

type ActionMode = 'parse' | 'summarize' | 'quiz' | 'extract_data';

const QuestionUploadCard: React.FC<QuestionUploadCardProps> = ({
  mode,
  onSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parseResult, setParseResult] = useState<any>(null);
  const [actionMode, setActionMode] = useState<ActionMode>('parse');
  const [processingStage, setProcessingStage] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number } | null>(null);
  const [pageProgress, setPageProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Preview editor state
  const [showPreviewEditor, setShowPreviewEditor] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [pendingMetadata, setPendingMetadata] = useState<any>(null);
  const uploadImageToStorage = async (base64Data: string, contentType: string, sourceFileName: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: contentType
      });

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = contentType.split('/')[1] || 'png';
      const fileName = `question-img-${timestamp}-${random}.${extension}`;

      // Upload to Supabase storage
      const {
        data,
        error
      } = await supabase.storage.from('question-images').upload(fileName, blob, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });
      if (error) {
        console.error('Image upload error:', error);
        return null;
      }

      // Get public URL
      const {
        data: urlData
      } = supabase.storage.from('question-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload image:', error);
      return null;
    }
  };

  // Removed unused convertPDFToWord function

  // Convert PDF page to base64 image
  const pdfPageToImage = async (pdf: any, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const scale = 2; // Higher scale for better OCR
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setProgress(10);
    setParseResult(null);
    setCurrentFile({ name: file.name, size: file.size });
    setProcessingStage('Processing document...');
    setPageProgress(null);
    
    try {
      // Validate file size (20MB max)
      const MAX_FILE_SIZE = 20 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum size is 20MB.`);
      }

      const fileName = file.name.toLowerCase();
      console.log('📄 Processing:', fileName, '| Size:', (file.size / 1024).toFixed(1), 'KB');
      setProgress(15);
      
      let images: string[] = [];
      let content = '';
      
      // For PDFs: Convert pages to images for Vision API
      if (fileName.endsWith('.pdf')) {
        setProcessingStage('Converting PDF pages to images for Vision AI...');
        toast.info('📸 Converting PDF to images for GPT-4o Vision...');
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = Math.min(pdf.numPages, 15); // Increased to 15 pages
        
        console.log(`PDF has ${pdf.numPages} pages, processing ${numPages}`);
        setPageProgress({ current: 0, total: numPages });
        
        for (let i = 1; i <= numPages; i++) {
          setProcessingStage(`📄 Converting page ${i}/${numPages} to image...`);
          setPageProgress({ current: i, total: numPages });
          const pageImage = await pdfPageToImage(pdf, i);
          images.push(pageImage);
          setProgress(15 + (i / numPages) * 25);
        }
        
        console.log(`Converted ${images.length} pages to images`);
        
      } else if (fileName.endsWith('.docx')) {
        // For Word docs: Try text extraction first
        setProcessingStage('Extracting Word document...');
        const arrayBuffer = await file.arrayBuffer();
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        content = textResult.value;
        setProgress(50);
        
      } else if (file.type.startsWith('image/')) {
        // Direct image upload
        setProcessingStage('Processing image...');
        const base64 = await fileToBase64(file);
        images.push(`data:${file.type};base64,${base64}`);
        setProgress(50);
        
      } else {
        // Text files
        content = await file.text();
        setProgress(50);
      }
      
      // Check if we have content to process
      if (images.length === 0 && (!content || content.trim().length < 50)) {
        throw new Error('Could not extract sufficient content from document');
      }

      setProgress(45);
        setProcessingStage(`🤖 GPT-4o Vision analyzing ${images.length} pages...`);
        setPageProgress({ current: 0, total: images.length });
        toast.info(images.length > 0 
          ? `🔍 GPT-4o Vision analyzing ${images.length} page(s) for questions & diagrams...` 
          : '🤖 GPT-4o is parsing questions...');

      // Call AI parser with images or text
      const { data, error } = await supabase.functions.invoke('ai-question-parser', {
        body: {
          content: content || null,
          images: images.length > 0 ? images : null,
          fileName: file.name,
          parseMode: mode,
          actionMode
        }
      });
      
      if (error) throw error;
      setProgress(85);
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to parse document');
      }

      // Handle PDR format with bounding box (question_number, question_text, graph_found, graph_bounding_box)
      let questions = [];
      let metadata = {
        title: file.name.replace(/\.[^/.]+$/, '') || 'Imported Test',
        subject: 'mathematics',
        topic: 'General'
      };

      // Check if response is in PDR format
      if (data.question_number !== undefined && data.question_text !== undefined) {
        // Single question PDR format - convert to array format
        const pdrQuestion = {
          question_number: data.question_number === "not found" ? 1 : parseInt(data.question_number) || 1,
          question_text: data.question_text || "unreadable",
          marks: 1,
          has_sub_questions: false,
          graph_found: Boolean(data.graph_found),
          graph_bounding_box: data.graph_bounding_box || null,
          difficulty: "medium"
        };
        questions = [pdrQuestion];
        
        // Also include all pages if available
        if (data.all_pages && data.all_pages.length > 1) {
          questions = data.all_pages.map((page: any, idx: number) => ({
            question_number: page.question_number === "not found" ? idx + 1 : parseInt(page.question_number) || idx + 1,
            question_text: page.question_text || "unreadable",
            marks: 1,
            has_sub_questions: false,
            graph_found: Boolean(page.graph_found),
            graph_bounding_box: page.graph_bounding_box || null,
            difficulty: "medium",
            page: page.page || idx + 1
          }));
        }
      } else {
        // Legacy complex format
        questions = data.data?.questions || data.questions || [];
        if (data.data?.metadata) {
          metadata = { ...metadata, ...data.data.metadata };
        }
      }
      
      setPendingQuestions(questions);
      setPendingMetadata(metadata);
      setShowPreviewEditor(true);
      
      const graphCount = questions.filter((q: any) => q.graph_found || q.has_diagram).length;
      toast.success(`✅ Extracted ${questions.length} question(s)${graphCount > 0 ? ` with ${graphCount} diagram(s)` : ''} - please review`);
      setProgress(100);
      setParseResult({
        success: true,
        actionMode: actionMode,
        count: questions.length,
        graphCount,
        data: null,
        images: [],
        pending: true
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to process file';
      let errorDetails = error?.message || '';
      
      if (errorDetails.includes('Rate limit') || errorDetails.includes('429')) {
        errorMessage = 'Rate limit exceeded';
        errorDetails = 'Please wait a moment and try again.';
      } else if (errorDetails.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API key not configured';
        errorDetails = 'Please add your OpenAI API key in settings.';
      }
      
      toast.error(errorMessage, { description: errorDetails, duration: 6000 });
      setParseResult({ success: false, error: `${errorMessage}: ${errorDetails}` });
    } finally {
      setUploading(false);
      setProcessingStage('');
      setPageProgress(null);
    }
  };
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = reject;
    });
  };
  const saveQuestions = async (parsedData: any) => {
    if (mode === 'quick') {
      return saveQuickPracticeQuestions(parsedData);
    } else {
      return saveMockTestQuestions(parsedData);
    }
  };
  const saveQuickPracticeQuestions = async (data: any) => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const {
      data: test,
      error: testError
    } = await supabase.from('tests').insert({
      title: data.quiz_metadata?.title || 'Quick Practice Test',
      description: `Quick test imported from ${data.quiz_metadata?.subject || 'general'} questions`,
      test_type: 'quick_test',
      difficulty_level: data.quiz_metadata?.difficulty || 'medium',
      total_questions: data.questions.length,
      is_active: true,
      created_by: user.id
    }).select().single();
    if (testError) throw testError;
    const questions = data.questions.map((q: any, idx: number) => {
      const isMCQ = q.options && q.options.length > 0;
      let correctAnswer = null;
      if (isMCQ) {
        const answerChar = q.correct_answer?.charAt(0)?.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(answerChar)) {
          correctAnswer = answerChar;
        } else {
          correctAnswer = 'A';
        }
      }
      return {
        test_id: test.id,
        question_text: q.question_text,
        question_image_url: q.question_image_url || null,
        option_a: q.options?.[0] || '',
        option_b: q.options?.[1] || '',
        option_c: q.options?.[2] || '',
        option_d: q.options?.[3] || '',
        correct_answer: correctAnswer,
        explanation: isMCQ ? q.explanation : `Answer: ${q.correct_answer}\n\n${q.explanation || ''}`,
        difficulty_level: q.difficulty || 'medium'
      };
    });
    const {
      error: questionsError
    } = await supabase.from('questions').insert(questions);
    if (questionsError) throw questionsError;
    return {
      test,
      questions: data.questions
    };
  };
  const saveMockTestQuestions = async (data: any) => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const validSubjects = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'];
    let subject = data.test_metadata?.subject || 'mathematics';
    if (!validSubjects.includes(subject)) {
      console.warn(`Invalid subject "${subject}", defaulting to "mathematics"`);
      subject = 'mathematics';
    }
    const {
      data: mockTest,
      error: mockTestError
    } = await supabase.from('mock_tests').insert({
      title: data.test_metadata?.title || 'Mock Test',
      subject: subject as any,
      topic: data.test_metadata?.topic || 'General',
      total_questions: data.questions.length,
      is_published: false,
      created_by: user.id
    }).select().single();
    if (mockTestError) throw mockTestError;
    for (const q of data.questions) {
      const {
        data: question,
        error: questionError
      } = await supabase.from('mock_questions').insert({
        mock_test_id: mockTest.id,
        question_number: q.question_number,
        question_text: q.question_text,
        question_image_url: q.question_image_url || null,
        marks: q.marks || 1,
        has_sub_questions: q.has_sub_questions || false,
        difficulty: q.difficulty || 'medium',
        category: q.question_type || 'mcq',
        answer_key: q.correct_answer || '',
        diagram_description: q.diagram_description || null
      }).select().single();
      if (questionError) throw questionError;
      if (q.sub_questions && q.sub_questions.length > 0) {
        const subQuestions = q.sub_questions.map((sq: any) => ({
          question_id: question.id,
          sub_question_label: sq.label,
          sub_question_text: sq.text,
          marks: sq.marks || 1,
          answer_key: sq.answer || ''
        }));
        const {
          error: subQError
        } = await supabase.from('mock_sub_questions').insert(subQuestions);
        if (subQError) throw subQError;
      }
    }
    return {
      mockTest,
      questions: data.questions
    };
  };

  // Handle preview editor confirmation
  const handlePreviewConfirm = async (questions: any[], metadata: any) => {
    try {
      setShowPreviewEditor(false);
      toast.info('Saving questions...');
      
      const dataToSave = {
        questions,
        test_metadata: metadata,
        quiz_metadata: metadata
      };
      
      const savedData = await saveQuestions(dataToSave);
      
      setParseResult({
        success: true,
        actionMode: 'parse',
        count: questions.length,
        data: savedData,
        images: []
      });
      
      toast.success(`Successfully saved ${questions.length} questions!`);
      
      if (onSuccess && savedData) {
        onSuccess(savedData);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save questions', {
        description: error?.message || 'Unknown error'
      });
    }
  };

  const handlePreviewCancel = () => {
    setShowPreviewEditor(false);
    setPendingQuestions([]);
    setPendingMetadata(null);
    setParseResult(null);
    toast.info('Import cancelled');
  };
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop: files => {
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif']
    },
    maxSize: 20 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading
  });
  return <Card>
      <CardContent className="space-y-6">
        {/* Upload Progress */}
        <UploadProgressTracker
          isUploading={uploading}
          progress={progress}
          fileName={currentFile?.name}
          fileSize={currentFile?.size}
          stage={processingStage}
          pageProgress={pageProgress}
        />

        {/* Action Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Processing Action</label>
          <Tabs value={actionMode} onValueChange={v => setActionMode(v as ActionMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="parse" className="flex items-center gap-2" disabled={uploading}>
                <ListChecks className="w-4 h-4" />
                <span className="hidden sm:inline">Parse</span>
              </TabsTrigger>
              <TabsTrigger value="summarize" className="flex items-center gap-2" disabled={uploading}>
                <FileText className="w-4 h-4" />
                
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2" disabled={uploading}>
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Quiz</span>
              </TabsTrigger>
              <TabsTrigger value="extract_data" className="flex items-center gap-2" disabled={uploading}>
                <FileSearch className="w-4 h-4" />
                <span className="hidden sm:inline">Extract</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            {actionMode === 'parse' && '📝 Extract questions from document'}
            {actionMode === 'summarize' && '📊 Create structured summary'}
            {actionMode === 'quiz' && '🎯 Auto-generate quiz questions'}
            {actionMode === 'extract_data' && '🔍 Extract structured data'}
          </p>
        </div>

        {/* Dropzone - Hidden during upload */}
        {!uploading && (
          <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <input {...getInputProps()} />
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF (auto-converts to Word), Word (with images), CSV, Images (OCR), Text | Max 20MB
            </p>
          </div>
        )}

        {parseResult && <div className={`p-4 rounded-lg ${parseResult.success ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'}`}>
            <div className="flex items-start gap-3">
              {parseResult.success ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`font-medium ${parseResult.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {parseResult.success 
                    ? parseResult.actionMode === 'parse' 
                      ? `✅ Parsed ${parseResult.count} question(s)${parseResult.graphCount > 0 ? ` with ${parseResult.graphCount} diagram(s)` : ''}` 
                      : parseResult.actionMode === 'summarize' 
                        ? 'Summary created successfully!' 
                        : parseResult.actionMode === 'quiz' 
                          ? `Quiz generated with ${parseResult.count} questions!` 
                          : 'Data extracted successfully!' 
                    : `${parseResult.actionMode || 'Processing'} Failed`}
                </p>
                {!parseResult.success && <p className="text-sm text-red-700 dark:text-red-400 mt-1">{parseResult.error}</p>}
                {parseResult.success && parseResult.graphCount > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-purple-700 dark:text-purple-400">📊 {parseResult.graphCount} diagram(s) detected with descriptions</p>
                  </div>
                )}
                {parseResult.success && parseResult.data && <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => {
                const dataStr = JSON.stringify(parseResult.data, null, 2);
                const blob = new Blob([dataStr], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${parseResult.actionMode}-result.json`;
                a.click();
                toast.success('Result downloaded!');
              }}>
                      <Eye className="w-4 h-4 mr-2" />
                      Download Result
                    </Button>
                  </div>}
              </div>
            </div>
          </div>}
      </CardContent>
      
      {/* Question Preview Editor */}
      <QuestionPreviewEditor
        open={showPreviewEditor}
        onOpenChange={setShowPreviewEditor}
        questions={pendingQuestions}
        metadata={pendingMetadata}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
        mode={mode}
      />
    </Card>;
};
export default QuestionUploadCard;