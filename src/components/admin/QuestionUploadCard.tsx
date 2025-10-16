import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

interface QuestionUploadCardProps {
  mode: 'quick' | 'mock';
  onSuccess?: (data: any) => void;
}

const QuestionUploadCard: React.FC<QuestionUploadCardProps> = ({ mode, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parseResult, setParseResult] = useState<any>(null);

  const processFile = async (file: File) => {
    setUploading(true);
    setProgress(10);
    setParseResult(null);

    try {
      let content = '';
      let extractedText = '';
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      console.log('📄 Processing:', fileName, '| Type:', fileType);
      setProgress(20);
      
      // Enhanced document parsing with text extraction
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        // Read CSV as text
        content = await file.text();
        extractedText = content;
        console.log('✅ CSV text extracted:', content.substring(0, 200));
        
      } else if (fileName.endsWith('.docx')) {
        // Extract text from Word using mammoth
        setProgress(25);
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        content = extractedText;
        console.log('✅ Word text extracted:', extractedText.substring(0, 200));
        toast.info(`Extracted ${extractedText.length} characters from Word doc`);
        
      } else if (fileName.endsWith('.pdf')) {
        // Extract text from PDF using pdfjs
        setProgress(25);
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        let pdfText = '';
        
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
        toast.info(`Extracted text from ${numPages} PDF pages`);
        
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

      toast.info('🤖 AI is analyzing your document...', {
        description: `Extracted: ${extractedText ? `${extractedText.length} characters` : 'preparing content'}`
      });

      // Call AI parser function with extracted text
      const { data, error } = await supabase.functions.invoke('ai-question-parser', {
        body: { 
          content, 
          fileType: file.type,
          fileName: file.name,
          parseMode: mode,
          extractedText: extractedText || undefined
        }
      });

      if (error) throw error;

      setProgress(70);

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to parse questions');
      }

      setProgress(90);
      
      // Save questions to database
      const savedData = await saveQuestions(data.data);
      
      setProgress(100);
      setParseResult({
        success: true,
        count: data.parsed_count,
        data: savedData
      });

      toast.success(`Successfully parsed ${data.parsed_count} questions!`);
      
      if (onSuccess) {
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
      setParseResult({ success: false, error: errorMessage });
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create test
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({
        title: data.quiz_metadata?.title || 'Quick Practice Test',
        test_type: data.quiz_metadata?.subject || 'general',
        difficulty_level: data.quiz_metadata?.difficulty || 'medium',
        total_questions: data.questions.length,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (testError) throw testError;

    // Create questions
    const questions = data.questions.map((q: any, idx: number) => ({
      test_id: test.id,
      question_text: q.question_text,
      option_a: q.options?.[0] || '',
      option_b: q.options?.[1] || '',
      option_c: q.options?.[2] || '',
      option_d: q.options?.[3] || '',
      correct_answer: q.correct_answer?.charAt(0)?.toUpperCase() || 'A',
      explanation: q.explanation || null,
      difficulty_level: q.difficulty || 'medium'
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questions);

    if (questionsError) throw questionsError;

    return { test, questions: data.questions };
  };

  const saveMockTestQuestions = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create mock test
    const { data: mockTest, error: mockTestError } = await supabase
      .from('mock_tests')
      .insert({
        title: data.test_metadata?.title || 'Mock Test',
        subject: data.test_metadata?.subject || 'general',
        topic: data.test_metadata?.topic || 'General',
        total_questions: data.questions.length,
        is_published: false,
        created_by: user.id
      })
      .select()
      .single();

    if (mockTestError) throw mockTestError;

    // Create questions
    for (const q of data.questions) {
      const { data: question, error: questionError } = await supabase
        .from('mock_questions')
        .insert({
          mock_test_id: mockTest.id,
          question_number: q.question_number,
          question_text: q.question_text,
          marks: q.marks || 1,
          has_sub_questions: q.has_sub_questions || false,
          difficulty: q.difficulty || 'medium',
          category: q.question_type || 'mcq',
          answer_key: q.correct_answer || ''
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Add sub-questions if any
      if (q.sub_questions && q.sub_questions.length > 0) {
        const subQuestions = q.sub_questions.map((sq: any) => ({
          question_id: question.id,
          sub_question_label: sq.label,
          sub_question_text: sq.text,
          marks: sq.marks || 1,
          answer_key: sq.answer || ''
        }));

        const { error: subQError } = await supabase
          .from('mock_sub_questions')
          .insert(subQuestions);

        if (subQError) throw subQError;
      }
    }

    return { mockTest, questions: data.questions };
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
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
    maxSize: 20 * 1024 * 1024, // 20MB max
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload & Parse Questions with AI
        </CardTitle>
        <CardDescription>
          📄 Multi-format AI parser: CSV, PDF, Word (.docx), Images, Text | Auto-extracts text using docTR-like OCR + Gemini AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing with AI...</p>
              <Progress value={progress} className="w-full max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">
                {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: CSV, PDF, Word (.docx), Images (OCR), Text | Max 20MB
              </p>
            </>
          )}
        </div>

        {parseResult && (
          <div className={`p-4 rounded-lg ${parseResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {parseResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${parseResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {parseResult.success ? `Success! Parsed ${parseResult.count} questions` : 'Parsing Failed'}
                </p>
                {!parseResult.success && (
                  <p className="text-sm text-red-700 mt-1">{parseResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionUploadCard;