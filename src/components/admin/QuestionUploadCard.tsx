import React, { useState, useEffect } from 'react';
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
  const [convertingToWord, setConvertingToWord] = useState(false);
  const [wordFileUrl, setWordFileUrl] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
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
  const convertPDFToWord = async (file: File, extractedPageContents: Array<{ pageNum: number; text: string }>): Promise<Blob | null> => {
    try {
      setConvertingToWord(true);
      setProcessingStage('Creating Word document...');
      
      const response = await fetch(
        `https://mvmciqmszakciijfdyos.supabase.co/functions/v1/pdf-to-word`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bWNpcW1zemFrY2lpamZkeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjUzNjcsImV4cCI6MjA2NTMwMTM2N30.SVtqZR-q4nSYCwlFfMq7GUoaK2mtTVasv5Zt8dJFO9w`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pageContents: extractedPageContents,
            fileName: file.name
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('PDF to Word conversion failed');
      }

      const wordBlob = await response.blob();
      console.log('✅ Converted PDF to Word:', wordBlob.size, 'bytes');
      toast.success('PDF converted to Word successfully!');
      setConvertingToWord(false);
      return wordBlob;
    } catch (error) {
      console.error('Word document creation error:', error);
      toast.error('Failed to create Word document');
      setConvertingToWord(false);
      setProcessingStage('');
      return null;
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setProgress(10);
    setParseResult(null);
    setWordFileUrl(null);
    
    try {
      let content = '';
      let extractedText = '';
      let extractedImages: string[] = [];
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      console.log('📄 Processing:', fileName, '| Type:', fileType);
      setProgress(20);
      
      // Handle PDF files - extract text first, then optionally create Word
      let pdfPageContents: Array<{ pageNum: number; text: string }> = [];
      if (fileName.endsWith('.pdf')) {
        setProcessingStage('Extracting text from PDF...');
        toast.info('Processing PDF document...');
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
          }).promise;
          const numPages = pdf.numPages;
          
          // Extract text from each page
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            pdfPageContents.push({
              pageNum: i,
              text: pageText
            });
            setProgress(20 + (i / numPages) * 15);
          }
          
          extractedText = pdfPageContents.map(p => `--- Page ${p.pageNum} ---\n${p.text}`).join('\n\n');
          content = extractedText;
          
          // Create Word document in background
          setProcessingStage('Creating Word document...');
          convertPDFToWord(file, pdfPageContents).catch(err => {
            console.warn('Word conversion failed but continuing with parsing:', err);
          });
          
          setProgress(35);
        } catch (pdfError: any) {
          console.error('PDF processing error:', pdfError);
          toast.error('Failed to process PDF. Please try another file format.');
          throw new Error(`PDF processing failed: ${pdfError.message}`);
        }
      }

      // Enhanced document parsing with text AND image extraction
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        // Read CSV as text
        content = await file.text();
        extractedText = content;
        console.log('✅ CSV text extracted:', content.substring(0, 200));
      } else if (fileName.endsWith('.docx')) {
        // Extract text AND images from Word document via edge function
        setProgress(25);
        const formData = new FormData();
        formData.append('file', file);
        toast.info('Extracting text and images from Word document...');

        // Call edge function to extract images and text
        const extractResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-doc-images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: formData
        });
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          extractedText = extractData.text || '';
          extractedImages = extractData.images || [];
          content = extractedText;
          console.log('✅ Word extraction complete:', {
            textLength: extractedText.length,
            imageCount: extractedImages.length
          });
          if (extractedImages.length > 0) {
            toast.success(`Extracted ${extractedImages.length} image(s) from Word document!`);
          }
        } else {
          // Fallback to text-only extraction
          console.warn('Image extraction failed, falling back to text-only');
          const arrayBuffer = await file.arrayBuffer();
          const textResult = await mammoth.extractRawText({
            arrayBuffer
          });
          extractedText = textResult.value;
          content = extractedText;
          toast.info('Extracted text only (image extraction unavailable)');
        }
        setProgress(35);
      } else if (fileName.endsWith('.pdf')) {
        // Extract text from PDF using pdfjs with enhanced image extraction
        setProgress(25);
        toast.info('Processing PDF document...');
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
          }).promise;
          const numPages = pdf.numPages;
          let pdfText = '';
          const pdfImages: string[] = [];
          
          // First attempt: Extract text normally
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            pdfText += `\n--- Page ${i} ---\n${pageText}`;
            setProgress(25 + i / numPages * 10);
          }
          
          // Check if PDF is likely scanned (minimal text extracted)
          const cleanText = pdfText.replace(/\s+/g, '').trim();
          const isScannedPDF = cleanText.length < 100 * numPages; // Less than 100 chars per page
          
          // Lovable AI-powered OCR + diagram extraction
          toast.info('🤖 Using Lovable AI vision to extract content...');
          
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            
            try {
              // Render page at high quality for AI analysis
              const scale = 2.5;
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              if (!context) continue;
              
              console.log(`📄 Rendering page ${pageNum} for Lovable AI vision...`);
              
              await page.render({
                canvasContext: context,
                viewport: viewport,
              } as any).promise;
              
              // Convert to base64 for AI processing
              const pageImageData = canvas.toDataURL('image/png');
              const pageBase64 = pageImageData.split(',')[1];
              
              // Call Lovable AI edge function for vision extraction
              console.log(`🤖 Calling Lovable AI for page ${pageNum}...`);
              const { data: visionData, error: visionError } = await supabase.functions.invoke('pdf-vision-extractor', {
                body: {
                  imageBase64: pageBase64,
                  pageNumber: pageNum,
                  fileName: fileName
                }
              });
              
              if (visionError) {
                console.error(`Vision extraction failed for page ${pageNum}:`, visionError);
                toast.error(`Failed to extract content from page ${pageNum}`);
                continue;
              }
              
              console.log(`✅ Lovable AI extraction for page ${pageNum}:`, visionData);
              
              // Append extracted text
              if (visionData.text) {
                pdfText += `\n--- Page ${pageNum} (AI OCR) ---\n${visionData.text}`;
              }
              
              // Handle diagram extraction
              if (visionData.diagram && visionData.diagram.type !== null) {
                console.log(`📊 Diagram detected: ${visionData.diagram.type}`);
                console.log(`📐 Shapes:`, visionData.diagram.shapes);
                console.log(`🏷️ Labels:`, visionData.diagram.labels);
                console.log(`📝 Blanks:`, visionData.diagram.blanks);
                
                // Upload the full page as diagram with structured data
                const diagramUrl = await uploadImageToStorage(
                  pageBase64,
                  'image/png',
                  `${fileName}-page${pageNum}-diagram`
                );
                
                if (diagramUrl) {
                  pdfImages.push(diagramUrl);
                  toast.success(`Extracted ${visionData.diagram.type} from page ${pageNum} with ${visionData.diagram.labels?.length || 0} labels`);
                }
              }
            } catch (error) {
              console.error(`Error processing page ${pageNum}:`, error);
              toast.error(`Failed to process page ${pageNum}`);
            }
            
            setProgress(35 + pageNum / numPages * 20);
          }
          
          if (pdfImages.length > 0) {
            extractedImages = pdfImages;
            toast.success(`✅ Extracted ${pdfImages.length} diagram(s) from PDF using AI`);
            
            if (isScannedPDF) {
              extractedText = '[Scanned PDF - AI OCR will extract text from images]';
              content = extractedText;
            } else {
              extractedText = pdfText;
              content = pdfText;
            }
          } else {
            // No images extracted, just text
            extractedText = pdfText;
            content = pdfText;
            console.log('✅ PDF text extracted:', pdfText.substring(0, 200));
            toast.success(`Extracted text from ${numPages} PDF pages`);
          }
          
          setProgress(55);
        } catch (pdfError: any) {
          console.error('PDF processing error:', pdfError);
          toast.error('Failed to process PDF. Please try another file format.');
          throw new Error(`PDF processing failed: ${pdfError.message}`);
        }
      } else if (fileType.includes('image')) {
        // For images, send as base64 (AI will perform OCR)
        const base64 = await fileToBase64(file);
        content = base64;
        extractedText = '[Image - AI will perform OCR]';
        console.log('✅ Image prepared for OCR');
        toast.info('Image uploaded - AI will extract text');
      } else if (fileType === 'text/plain') {
        // Plain text
        content = await file.text();
        extractedText = content;
        console.log('✅ Plain text read');
      } else {
        // Fallback: try to read as text
        content = await file.text();
        extractedText = content;
      }
      setProgress(40);
      const actionDescriptions: Record<ActionMode, string> = {
        parse: 'Parsing questions',
        summarize: 'Creating summary',
        quiz: 'Generating quiz',
        extract_data: 'Extracting data'
      };
      toast.info(`🤖 AI is ${actionDescriptions[actionMode]}...`, {
        description: `Content: ${extractedText ? `${extractedText.length} chars` : 'preparing'}${extractedImages.length > 0 ? ` | ${extractedImages.length} images` : ''}`
      });

      // Call AI parser function with action mode and extracted images
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-question-parser', {
        body: {
          content,
          fileType: file.type,
          fileName: file.name,
          parseMode: mode,
          extractedText: extractedText || undefined,
          extractedImages: extractedImages.length > 0 ? extractedImages : undefined,
          actionMode
        }
      });
      if (error) throw error;
      setProgress(70);
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to process document');
      }
      setProgress(90);

      // Handle different action modes
      let savedData = null;
      if (actionMode === 'parse' || actionMode === 'quiz') {
        savedData = await saveQuestions(data.data);
      }
      setProgress(100);
      setParseResult({
        success: true,
        actionMode: data.actionMode,
        count: data.parsed_count,
        data: savedData || data.data,
        images: extractedImages
      });
      const successMessages: Record<ActionMode, string> = {
        parse: `Successfully parsed ${data.parsed_count} questions${extractedImages.length > 0 ? ` with ${extractedImages.length} images` : ''}!`,
        summarize: 'Document summarized successfully!',
        quiz: `Generated ${data.parsed_count} quiz questions${extractedImages.length > 0 ? ` with ${extractedImages.length} images` : ''}!`,
        extract_data: 'Data extracted successfully!'
      };
      toast.success(successMessages[actionMode]);
      if (onSuccess && savedData) {
        onSuccess(savedData);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to process file';
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (error.message?.includes('credits')) {
        errorMessage = 'AI credits exhausted. Please add credits to continue.';
      }
      toast.error(errorMessage);
      setParseResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setUploading(false);
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
        answer_key: q.correct_answer || ''
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
        {/* Processing Stage Indicator */}
        {(uploading || convertingToWord) && processingStage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{processingStage}</p>
              {progress > 0 && (
                <Progress value={progress} className="mt-2 h-2" />
              )}
            </div>
          </div>
        )}

        {/* Download Converted Word File */}
        {wordFileUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Word Document Ready</p>
                  <p className="text-xs text-green-700">PDF successfully converted to Word format</p>
                </div>
              </div>
              <a
                href={wordFileUrl}
                download="converted-document.docx"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Download Word
              </a>
            </div>
          </div>
        )}

        {/* Action Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Processing Action</label>
          <Tabs value={actionMode} onValueChange={v => setActionMode(v as ActionMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="parse" className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                <span className="hidden sm:inline">Parse</span>
              </TabsTrigger>
              <TabsTrigger value="summarize" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Quiz</span>
              </TabsTrigger>
              <TabsTrigger value="extract_data" className="flex items-center gap-2">
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

        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input {...getInputProps()} />
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          {uploading ? <div className="space-y-2">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing with AI...</p>
              <Progress value={progress} className="w-full max-w-xs mx-auto" />
            </div> : <>
              <p className="text-sm font-medium mb-1">
                {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF (auto-converts to Word), Word (with images), CSV, Images (OCR), Text | Max 20MB
              </p>
            </>}
        </div>

        {parseResult && <div className={`p-4 rounded-lg ${parseResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {parseResult.success ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`font-medium ${parseResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {parseResult.success ? parseResult.actionMode === 'parse' ? `Success! Parsed ${parseResult.count} questions${parseResult.images?.length > 0 ? ` with ${parseResult.images.length} images` : ''}` : parseResult.actionMode === 'summarize' ? 'Summary created successfully!' : parseResult.actionMode === 'quiz' ? `Quiz generated with ${parseResult.count} questions!` : 'Data extracted successfully!' : `${parseResult.actionMode || 'Processing'} Failed`}
                </p>
                {!parseResult.success && <p className="text-sm text-red-700 mt-1">{parseResult.error}</p>}
                {parseResult.success && parseResult.images && parseResult.images.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-green-700">✓ Extracted {parseResult.images.length} image(s) from document</p>
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
    </Card>;
};
export default QuestionUploadCard;