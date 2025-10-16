import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, FileImage, FileSpreadsheet, X } from "lucide-react";
import { useDropzone } from 'react-dropzone';

interface ParsedQuestion {
  question_text: string;
  question_image_url?: string;
  category?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  word_limit?: number;
  answer_key: string;
  has_sub_questions: boolean;
  sub_questions?: Array<{
    label: string;
    text: string;
    marks: number;
    answer_key: string;
    image_url?: string;
  }>;
}

interface ParsedTest {
  test_name: string;
  subject: string;
  topic?: string;
  questions: ParsedQuestion[];
}

interface UniversalFileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onTestParsed: (testData: ParsedTest) => void;
}

const UniversalFileUpload: React.FC<UniversalFileUploadProps> = ({ 
  isOpen, 
  onClose, 
  onTestParsed 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedTest | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validate file size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 100MB.');
        return;
      }
      
      setSelectedFile(file);
      setParsedData(null);
      setShowPreview(false);
      toast.success(`File "${file.name}" selected`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024
  });

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return FileImage;
    if (['csv', 'txt'].includes(ext || '')) return FileSpreadsheet;
    return FileText;
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const FUNCTION_URL = 'https://mvmciqmszakciijfdyos.supabase.co/functions/v1/parse-test-file';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bWNpcW1zemFrY2lpamZkeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjUzNjcsImV4cCI6MjA2NTMwMTM2N30.SVtqZR-q4nSYCwlFfMq7GUoaK2mtTVasv5Zt8dJFO9w';

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please contact support.');
        }
        throw new Error(err.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const transformedData: ParsedTest = {
          test_name: data.data.test_name || 'Imported Test',
          subject: data.data.subject || 'mathematics',
          topic: data.data.topic || 'General',
          questions: data.data.questions.map((q: any) => ({
            question_text: q.question_text,
            question_image_url: q.question_image_url || '',
            category: q.category || 'General',
            marks: q.marks || 1,
            difficulty: q.difficulty || 'medium',
            word_limit: q.word_limit,
            answer_key: q.answer_key || '',
            has_sub_questions: q.has_sub_questions || false,
            sub_questions: q.sub_questions || []
          }))
        };

        setParsedData(transformedData);
        setShowPreview(true);
        toast.success(`Parsed ${transformedData.questions.length} questions successfully!`);
      } else {
        throw new Error(data.error || 'Failed to parse file');
      }
    } catch (error: any) {
      console.error('Error uploading and parsing file:', error);
      toast.error(error.message || 'Failed to parse the file. Please check the format and try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImportToTest = () => {
    if (parsedData) {
      onTestParsed(parsedData);
      handleClose();
      toast.success('Questions imported successfully!');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setShowPreview(false);
    setIsUploading(false);
    setUploadProgress(0);
    onClose();
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile.name) : Upload;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            AI-Powered Test Import
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Supported formats:</strong> PDF, Word (.doc, .docx), CSV, TXT, Images (JPG, PNG, WebP)
                <br />
                <strong>Max size:</strong> 100MB
                <br />
                <strong>AI Processing:</strong> Automatically extracts questions, answers, marks, and structure
              </AlertDescription>
            </Alert>

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop your file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">Drag & drop your test file here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  <Button variant="secondary" type="button">
                    Select File
                  </Button>
                </div>
              )}
            </div>

            {selectedFile && (
              <Card className="bg-accent/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-10 w-10 text-primary" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing with AI...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleUploadAndParse}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing with AI...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Parse & Extract Questions
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">AI Extraction Complete</h3>
            </div>

            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Test Title</p>
                    <p className="font-medium">{parsedData?.test_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium capitalize">{parsedData?.subject.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Topic</p>
                    <p className="font-medium">{parsedData?.topic}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Questions Extracted</p>
                    <p className="font-medium text-primary">{parsedData?.questions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h4 className="font-semibold">Question Preview (First 3)</h4>
              {parsedData?.questions.slice(0, 3).map((question, index) => (
                <Card key={index}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h5 className="font-medium">Question {index + 1}</h5>
                      <div className="flex gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {question.marks} marks
                        </span>
                        <span className="text-xs bg-secondary/10 text-secondary-foreground px-2 py-1 rounded">
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{question.question_text}</p>
                    {question.category && (
                      <p className="text-xs text-muted-foreground">Type: {question.category}</p>
                    )}
                    {question.answer_key && (
                      <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                        <strong>Answer:</strong> {question.answer_key.substring(0, 100)}
                        {question.answer_key.length > 100 && '...'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {parsedData && parsedData.questions.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {parsedData.questions.length - 3} more questions
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleImportToTest}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Import to Mock Test
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Back
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UniversalFileUpload;
