import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle, XCircle, Brain, FileSearch, ListChecks, Eye, Crop } from 'lucide-react';
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
import { useAutoDiagramCropper } from '@/hooks/useAutoDiagramCropper';

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
  const [sourceImages, setSourceImages] = useState<string[]>([]);
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

  // Convert PDF page to HIGH RESOLUTION base64 image for Vision AI
  // Critical: Full resolution ensures graphs/diagrams are clearly visible
  const pdfPageToImage = async (pdf: any, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    
    // Get original page dimensions
    const defaultViewport = page.getViewport({ scale: 1 });
    
    // Calculate scale to achieve target resolution (2048px on longest side for Vision AI)
    // Higher resolution = better graph/diagram detection
    const TARGET_SIZE = 2048;
    const longestSide = Math.max(defaultViewport.width, defaultViewport.height);
    const scale = Math.min(TARGET_SIZE / longestSide, 3); // Cap at 3x to avoid memory issues
    
    const viewport = page.getViewport({ scale });
    
    console.log(`📄 Page ${pageNum}: ${Math.round(viewport.width)}x${Math.round(viewport.height)}px (scale: ${scale.toFixed(2)})`);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    
    // White background for better OCR
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ 
      canvasContext: context, 
      viewport,
      // Enable text rendering for better OCR
      renderInteractiveForms: true
    }).promise;
    
    // Use PNG for better quality (no JPEG artifacts on diagrams)
    const dataUrl = canvas.toDataURL('image/png');
    
    // Log image size for debugging
    const sizeKB = Math.round(dataUrl.length * 0.75 / 1024);
    console.log(`📸 Page ${pageNum} image: ${sizeKB}KB`);
    
    return dataUrl;
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
        const MAX_PAGES = 50; // Maximum pages to process
        const numPages = Math.min(pdf.numPages, MAX_PAGES);
        
        console.log(`PDF has ${pdf.numPages} pages, processing ${numPages}`);
        setPageProgress({ current: 0, total: numPages });
        
        // Notify user if PDF has more pages than limit
        if (pdf.numPages > MAX_PAGES) {
          toast.warning(`PDF has ${pdf.numPages} pages. Processing first ${MAX_PAGES} pages only.`);
        }
        
        for (let i = 1; i <= numPages; i++) {
          setProcessingStage(`📄 Converting page ${i}/${numPages} to image...`);
          setPageProgress({ current: i, total: numPages });
          const pageImage = await pdfPageToImage(pdf, i);
          images.push(pageImage);
          setProgress(15 + (i / numPages) * 25);
        }
        
        console.log(`Converted ${images.length} pages to images`);
        setSourceImages(images); // Store for bounding box overlay
        
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
      setProcessingStage(`🤖 AI Vision analyzing ${images.length} pages...`);
      setPageProgress({ current: 0, total: images.length });
      toast.info(images.length > 0 
        ? `🔍 AI Vision analyzing ${images.length} page(s) for questions & diagrams...` 
        : '🤖 AI is parsing questions...');

      // Process images with pagination to avoid resource limits
      let allQuestions: any[] = [];
      let startPage = 0;
      let hasMorePages = true;
      let batchNumber = 1;
      
      if (images.length > 0) {
        while (hasMorePages) {
          setProcessingStage(`🤖 Processing batch ${batchNumber} (pages ${startPage + 1}-${Math.min(startPage + 5, images.length)})...`);
          setPageProgress({ current: startPage, total: images.length });
          
          const { data, error } = await supabase.functions.invoke('ai-question-parser', {
            body: {
              content: null,
              images: images,
              fileName: file.name,
              parseMode: mode,
              actionMode,
              startPage
            }
          });
          
          if (error) throw error;
          
          if (!data || !data.success) {
            throw new Error(data?.error || 'Failed to parse document');
          }
          
          // Collect questions from this batch
          if (data.all_pages && data.all_pages.length > 0) {
            allQuestions.push(...data.all_pages);
          }
          
          // Check pagination
          hasMorePages = data.pagination?.has_more || false;
          startPage = data.pagination?.next_start_page || images.length;
          batchNumber++;
          
          setProgress(45 + (startPage / images.length) * 40);
        }
      } else {
        // Text-only processing (single call)
        const { data, error } = await supabase.functions.invoke('ai-question-parser', {
          body: {
            content: content || null,
            images: null,
            fileName: file.name,
            parseMode: mode,
            actionMode
          }
        });
        
        if (error) throw error;
        
        if (!data || !data.success) {
          throw new Error(data?.error || 'Failed to parse document');
        }
        
        allQuestions = data.all_pages || [];
      }
      
      setProgress(85);

      // Convert parsed results to question format with interactive types
      let questions = allQuestions.map((page: any, idx: number) => ({
        question_number: page.question_number === "not found" ? idx + 1 : page.question_number,
        parent_question: page.parent_question || null,
        question_text: page.question_text || "unreadable",
        marks: page.marks || 1,
        has_sub_questions: false,
        graph_found: Boolean(page.graph_found),
        graph_bounding_box: page.graph_bounding_box || null,
        graph_type: page.graph_type || null,
        graph_description: page.graph_description || null,
        diagram_type: page.diagram_type || null,
        diagram_crop: page.diagram_crop || null,
        has_table: page.has_table || false,
        table_data: page.table_data || null,
        table_type: page.table_type || null,
        table_bounding_box: page.table_bounding_box || null,
        command_term: page.command_term || null,
        difficulty: "medium",
        page: page.page || idx + 1,
        // source_image comes from local sourceImages array via page index fallback
        source_image: page.source_image || null,
        // Also store diagram description for AI generation fallback
        diagram_description: page.graph_description || page.diagram_description || null,
        // MCQ options
        options: page.options || null,
        option_images: page.option_images || null,
        option_descriptions: page.option_descriptions || null,
        // Draggable items
        draggable_items: page.draggable_items || null,
        // Interactive type detection
        interactive_type: page.interactive_type || page.answer_block_type || 'text_equation',
        answer_block_type: page.answer_block_type || page.interactive_type || 'text_equation',
        // Parsing verification
        parsing_verified: page.parsing_verified !== false
      }));
      
      let metadata = {
        title: file.name.replace(/\.[^/.]+$/, '') || 'Imported Test',
        subject: 'mathematics',
        topic: 'General'
      };
      
      setPendingQuestions(questions);
      setPendingMetadata(metadata);
      setShowPreviewEditor(true);
      
      const graphCount = questions.filter((q: any) => q.graph_found || q.has_diagram).length;
      const tableCount = questions.filter((q: any) => q.has_table).length;
      const verifiedCount = questions.filter((q: any) => q.parsing_verified).length;
      const interactiveTypes = [...new Set(questions.map((q: any) => q.interactive_type))];
      const diagramTypes = [...new Set(questions.filter((q: any) => q.diagram_type).map((q: any) => q.diagram_type))];
      
      // Show detailed success message
      let successMsg = `✅ Extracted ${questions.length} question(s)`;
      if (graphCount > 0) successMsg += ` | ${graphCount} diagram(s)`;
      if (tableCount > 0) successMsg += ` | ${tableCount} table(s)`;
      if (verifiedCount < questions.length) {
        successMsg += ` | ${verifiedCount}/${questions.length} verified`;
      }
      
      toast.success(successMsg, {
        description: `Types: ${interactiveTypes.join(', ')}${diagramTypes.length > 0 ? ` | Diagrams: ${diagramTypes.join(', ')}` : ''}`
      });
      
      setProgress(100);
      setParseResult({
        success: true,
        actionMode: actionMode,
        count: questions.length,
        graphCount,
        tableCount,
        diagramTypes,
        verifiedCount,
        interactiveTypes,
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
      const isMCQ = q.options && (q.options.A || q.options.B || q.options.C || q.options.D);
      const hasArrayOptions = Array.isArray(q.options) && q.options.length > 0;
      
      let correctAnswer = null;
      if (isMCQ || hasArrayOptions) {
        const answerChar = q.correct_answer?.charAt(0)?.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(answerChar)) {
          correctAnswer = answerChar;
        } else {
          correctAnswer = 'A';
        }
      }
      
      // Handle both object and array option formats
      let optionA = '', optionB = '', optionC = '', optionD = '';
      if (isMCQ) {
        optionA = q.options?.A || '';
        optionB = q.options?.B || '';
        optionC = q.options?.C || '';
        optionD = q.options?.D || '';
      } else if (hasArrayOptions) {
        optionA = q.options?.[0] || '';
        optionB = q.options?.[1] || '';
        optionC = q.options?.[2] || '';
        optionD = q.options?.[3] || '';
      }
      
      // Add image indicator to option text if option is image-based
      if (q.option_images) {
        if (q.option_images.A && q.option_descriptions?.A) {
          optionA = `[Image: ${q.option_descriptions.A}]`;
        }
        if (q.option_images.B && q.option_descriptions?.B) {
          optionB = `[Image: ${q.option_descriptions.B}]`;
        }
        if (q.option_images.C && q.option_descriptions?.C) {
          optionC = `[Image: ${q.option_descriptions.C}]`;
        }
        if (q.option_images.D && q.option_descriptions?.D) {
          optionD = `[Image: ${q.option_descriptions.D}]`;
        }
      }
      
      return {
        test_id: test.id,
        question_text: q.question_text,
        question_image_url: q.question_image_url || null,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        explanation: (isMCQ || hasArrayOptions) ? q.explanation : `Answer: ${q.correct_answer}\n\n${q.explanation || ''}`,
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
  // Build answer block config from parsed question data
  const buildAnswerBlockConfig = (q: any) => {
    const interactiveType = q.interactive_type || q.answer_block_type;
    if (!interactiveType) return null;
    
    const config: any = { type: interactiveType };
    
    switch (interactiveType) {
      case 'graph_plot':
      case 'graph_interaction':
        config.graphConfig = {
          showGrid: true,
          xRange: [-10, 10],
          yRange: [-10, 10],
          allowPoints: true,
          allowLines: true,
          allowShading: q.question_text?.toLowerCase().includes('shade')
        };
        break;
        
      case 'drag_drop':
      case 'drag_drop_match':
        // Extract draggable items from question with puzzle colors
        const items: any[] = [];
        const targets: any[] = [];
        const puzzleColors = ['red', 'blue', 'green', 'orange', 'purple'] as const;
        
        if (q.draggable_items && Array.isArray(q.draggable_items)) {
          q.draggable_items.forEach((item: string, i: number) => {
            items.push({ 
              id: `item-${i}`, 
              content: item, 
              isLatex: item.includes('$') || item.includes('\\'),
              color: puzzleColors[i % puzzleColors.length]
            });
          });
        }
        
        // Default items if none found - ratio matching example
        if (items.length === 0) {
          items.push(
            { id: 'item-1', content: '6 : 4', isLatex: false, color: 'red' },
            { id: 'item-2', content: '24 : 36', isLatex: false, color: 'blue' },
            { id: 'item-3', content: '1 : 3', isLatex: false, color: 'green' }
          );
        }
        
        // Create matching puzzle slots
        items.forEach((_, i) => {
          targets.push({ 
            id: `slot-${i}`, 
            label: `Puzzle ${i + 1}`, 
            correctItemId: `item-${i}`,
            shape: 'notch'
          });
        });
        
        config.dragDropConfig = { items, targets };
        break;
        
      case 'image_drop':
      case 'image_drop_zone':
        config.imageDropConfig = {
          imageUrl: q.question_image_url || '',
          dropZones: [
            { id: 'zone-1', x: 30, y: 30, label: 'A' },
            { id: 'zone-2', x: 70, y: 30, label: 'B' },
            { id: 'zone-3', x: 50, y: 70, label: 'C' }
          ],
          draggableLabels: [
            { id: 'label-1', content: 'Label 1' },
            { id: 'label-2', content: 'Label 2' },
            { id: 'label-3', content: 'Label 3' }
          ]
        };
        break;
        
      case 'arrange_order':
      case 'step_builder':
        const steps = q.sub_questions?.map((sq: any, i: number) => ({
          id: `step-${i}`,
          content: sq.text || sq.sub_question_text,
          correctOrder: i + 1
        })) || [
          { id: 'step-1', content: 'Step 1', correctOrder: 1 },
          { id: 'step-2', content: 'Step 2', correctOrder: 2 }
        ];
        config.arrangeConfig = { items: steps };
        break;
        
      case 'smart_math':
      case 'math_input':
        config.smartMathConfig = {
          expectedAnswer: q.correct_answer || '',
          acceptedFormats: ['decimal', 'fraction', 'percentage'],
          showStepBuilder: q.command_term?.toLowerCase() === 'show that'
        };
        break;
        
      case 'multiple_choice':
        const options = [];
        if (q.options) {
          if (q.options.A) options.push({ id: 'opt-a', content: q.options.A, isCorrect: q.correct_answer === 'A' });
          if (q.options.B) options.push({ id: 'opt-b', content: q.options.B, isCorrect: q.correct_answer === 'B' });
          if (q.options.C) options.push({ id: 'opt-c', content: q.options.C, isCorrect: q.correct_answer === 'C' });
          if (q.options.D) options.push({ id: 'opt-d', content: q.options.D, isCorrect: q.correct_answer === 'D' });
        }
        config.mcqConfig = { options, allowMultiple: false };
        break;
        
      case 'table_input':
      case 'table_fill':
        // Build table config from parsed table_data
        if (q.table_data && Array.isArray(q.table_data) && q.table_data.length > 0) {
          const headers = q.table_data[0] || [];
          const rows = q.table_data.slice(1).map((row: string[]) => ({
            cells: row.map((cellValue: string) => ({
              value: cellValue || '',
              editable: cellValue === '' || cellValue === '?' || cellValue === '...',
              correct: '' // Will be filled by admin
            }))
          }));
          
          config.tableConfig = {
            headers: headers,
            rows: rows,
            tableType: q.table_type || 'data'
          };
        } else {
          // Default table structure
          config.tableConfig = {
            headers: ['x', 'f(x)'],
            rows: [
              { cells: [{ value: '1', editable: false }, { value: '', editable: true, correct: '' }] },
              { cells: [{ value: '2', editable: false }, { value: '', editable: true, correct: '' }] },
              { cells: [{ value: '3', editable: false }, { value: '', editable: true, correct: '' }] }
            ],
            tableType: 'function'
          };
        }
        break;
    }
    
    return config;
  };

  // Map parsed interactive_type to database answer_block_type
  const mapInteractiveToBlockType = (interactiveType?: string, hasTable?: boolean): string => {
    if (!interactiveType) return hasTable ? 'table_input' : 'text_equation';
    
    const typeMap: Record<string, string> = {
      'graph_interaction': 'graph_plot',
      'graph_plot': 'graph_plot',
      'drag_drop_match': 'drag_drop',
      'drag_drop': 'drag_drop',
      'image_drop_zone': 'image_drop',
      'image_drop': 'image_drop',
      'step_builder': 'arrange_order',
      'arrange_order': 'arrange_order',
      'math_input': 'smart_math',
      'smart_math': 'smart_math',
      'text_input': 'text_equation',
      'text_equation': 'text_equation',
      'multiple_choice': 'multiple_choice',
      'table_input': 'table_input',
      'table_fill': 'table_input'
    };
    
    return typeMap[interactiveType] || (hasTable ? 'table_input' : 'text_equation');
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
      // Determine answer block type from interactive_type
      const answerBlockType = mapInteractiveToBlockType(q.interactive_type || q.answer_block_type);
      const answerBlockConfig = buildAnswerBlockConfig(q);
      
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
        category: q.category || q.question_type || 'general',
        answer_key: q.correct_answer || '',
        diagram_description: q.diagram_description || null,
        command_term: q.command_term || null,
        // Add interactive type mapping
        answer_block_type: answerBlockType,
        answer_block_config: answerBlockConfig ? JSON.stringify(answerBlockConfig) : null
      }).select().single();
      if (questionError) throw questionError;
      
      if (q.sub_questions && q.sub_questions.length > 0) {
        const subQuestions = q.sub_questions.map((sq: any) => {
          const subAnswerBlockType = mapInteractiveToBlockType(sq.interactive_type || sq.answer_block_type);
          const subAnswerBlockConfig = buildAnswerBlockConfig(sq);
          
          return {
            question_id: question.id,
            sub_question_label: sq.label,
            sub_question_text: sq.text || sq.sub_question_text,
            marks: sq.marks || 1,
            answer_key: sq.answer || sq.correct_answer || '',
            command_term: sq.command_term || null,
            answer_block_type: subAnswerBlockType,
            answer_block_config: subAnswerBlockConfig ? JSON.stringify(subAnswerBlockConfig) : null
          };
        });
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
  const aiCreditsAvailable = false;

  if (!aiCreditsAvailable) {
    return <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="py-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <Brain className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Insufficient AI Credits</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md mx-auto">
            This feature doesn't meet the required balance. Please top-up your AI credits to use the AI Document Parser.
          </p>
          <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30 gap-2 mt-2">
            <Upload className="w-4 h-4" />
            Top-up AI Credits
          </Button>
        </div>
      </CardContent>
    </Card>;
  }

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
        sourceImages={sourceImages}
      />
    </Card>;
};
export default QuestionUploadCard;