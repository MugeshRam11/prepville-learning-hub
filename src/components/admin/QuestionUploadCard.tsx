import React, { useState } from 'react';
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
  const processFile = async (file: File) => {
    setUploading(true);
    setProgress(10);
    setParseResult(null);
    try {
      let content = '';
      let extractedText = '';
      let extractedImages: string[] = [];
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      console.log('📄 Processing:', fileName, '| Type:', fileType);
      setProgress(20);

      // Enhanced document parsing with text AND image extraction
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        // Read CSV as text
        console.log('📊 Processing CSV file...');
        content = await file.text();
        extractedText = content;
        console.log('✅ CSV text extracted:', content.substring(0, 200));
        toast.success('CSV file loaded successfully');
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
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
      } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
        // Extract text from PDF using pdfjs
        console.log('📄 Processing PDF file...');
        setProgress(25);
        
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
          }).promise;
          const numPages = pdf.numPages;
          let pdfText = '';
          
          console.log(`📄 PDF has ${numPages} pages`);
          
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            pdfText += `\n--- Page ${i} ---\n${pageText}`;
            setProgress(25 + (i / numPages) * 15);
          }
          
          extractedText = pdfText;
          content = pdfText;
          console.log('✅ PDF text extracted:', pdfText.substring(0, 200));
          toast.success(`Extracted text from ${numPages} PDF pages`);
        } catch (pdfError: any) {
          console.error('❌ PDF parsing error:', pdfError);
          throw new Error(`Failed to read PDF: ${pdfError.message}`);
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
      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to call AI parser');
      }
      
      setProgress(70);
      
      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to process document';
        console.error('❌ AI parser returned error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('✅ AI parsing successful:', {
        actionMode: data.actionMode,
        count: data.parsed_count,
        hasData: !!data.data
      });
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
      console.error('❌ Upload error:', error);
      let errorMessage = 'Failed to process file';
      let errorDetails = '';
      
      if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
        errorMessage = '⏱️ Rate limit exceeded';
        errorDetails = 'Please wait a moment and try again.';
      } else if (error.message?.includes('credits') || error.message?.includes('402')) {
        errorMessage = '💳 Out of AI credits';
        errorDetails = 'Please add credits in Settings → Workspace → Usage';
      } else if (error.message?.includes('Failed to process document')) {
        errorMessage = '📄 Document processing failed';
        errorDetails = error.message || 'The AI could not extract questions from this document. Please check the document format.';
      } else {
        errorMessage = '❌ Processing failed';
        errorDetails = error.message || 'Please check the file format and try again.';
      }
      
      toast.error(errorMessage, {
        description: errorDetails,
        duration: 8000
      });
      
      setParseResult({
        success: false,
        error: `${errorMessage}: ${errorDetails}`
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
                PDF, Word (with images), CSV, Images (OCR), Text | Max 20MB
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