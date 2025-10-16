import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
interface ParsedMockQuestion {
  question_text: string;
  question_image_url?: string;
  category?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  word_limit?: number;
  answer_key: string;
  has_sub_questions: boolean;
  sub_questions?: Array<{
    sub_question_label: string;
    sub_question_text: string;
    sub_question_image_url?: string;
    marks: number;
    answer_key: string;
    word_limit?: number;
  }>;
}
interface ParsedMockTest {
  title: string;
  subject: string;
  topic: string;
  questions: ParsedMockQuestion[];
}
interface MockTestWordUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onTestParsed: (testData: ParsedMockTest) => void;
}
const MockTestWordUpload: React.FC<MockTestWordUploadProps> = ({
  isOpen,
  onClose,
  onTestParsed
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedMockTest | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        setSelectedFile(file);
        setParsedData(null);
        setShowPreview(false);
      } else {
        toast.error('Please select a .doc or .docx file.');
      }
    }
  };
  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      toast.error('Please select a Word file first.');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use the parse-word-test edge function
      const FUNCTION_URL = 'https://mvmciqmszakciijfdyos.supabase.co/functions/v1/parse-word-test';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bWNpcW1zemFrY2lpamZkeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjUzNjcsImV4cCI6MjA2NTMwMTM2N30.SVtqZR-q4nSYCwlFfMq7GUoaK2mtTVasv5Zt8dJFO9w';
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: formData
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed with status ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        // Transform the parsed data to match mock test format
        const transformedData: ParsedMockTest = {
          title: data.data.test_name || 'Imported Mock Test',
          subject: data.data.category?.toLowerCase() || 'mathematics',
          topic: data.data.category || 'General',
          questions: data.data.questions.map((q: any, index: number) => ({
            question_text: q.question_text,
            question_image_url: '',
            category: q.category || 'General',
            marks: q.marks || 1,
            difficulty: 'medium' as const,
            word_limit: q.word_limit,
            answer_key: q.correct_answer || q.explanation || '',
            has_sub_questions: false,
            sub_questions: []
          }))
        };
        setParsedData(transformedData);
        setShowPreview(true);
        toast.success('Word file parsed successfully!');
      } else {
        throw new Error(data.error || 'Failed to parse file');
      }
    } catch (error) {
      console.error('Error uploading and parsing file:', error);
      toast.error(error.message || 'Failed to parse the Word file. Please check the format and try again.');
    } finally {
      setIsUploading(false);
    }
  };
  const handleImportToForm = () => {
    if (parsedData) {
      onTestParsed(parsedData);
      handleClose();
      toast.success('Questions imported successfully! Review and edit as needed before saving.');
    }
  };
  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setShowPreview(false);
    setIsUploading(false);
    onClose();
  };
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Mock Test from Word Document
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              
            </Alert>

            <div>
              <label className="block text-sm font-medium mb-2">
                Select Word File (.docx)
              </label>
              <input type="file" accept=".doc,.docx" onChange={handleFileSelect} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            {selectedFile && <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            <div className="flex gap-3">
              <Button onClick={handleUploadAndParse} disabled={!selectedFile || isUploading} className="flex items-center gap-2">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Parsing...' : 'Upload & Parse'}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div> : <div className="space-y-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">File Parsed Successfully</h3>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-2">
                <p><strong>Test Title:</strong> {parsedData?.title}</p>
                <p><strong>Subject:</strong> {parsedData?.subject}</p>
                <p><strong>Topic:</strong> {parsedData?.topic}</p>
                <p><strong>Questions Found:</strong> {parsedData?.questions.length}</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h4 className="font-semibold">Preview Questions (First 3)</h4>
              {parsedData?.questions.slice(0, 3).map((question, index) => <Card key={index}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h5 className="font-medium">Question {index + 1}</h5>
                      <div className="flex gap-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {question.marks} marks
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{question.question_text}</p>
                    {question.category && <p className="text-xs text-gray-600">Category: {question.category}</p>}
                    {question.answer_key && <p className="text-sm text-green-700">
                        <strong>Answer:</strong> {question.answer_key}
                      </p>}
                  </CardContent>
                </Card>)}

              {parsedData && parsedData.questions.length > 3 && <p className="text-sm text-gray-500 text-center">
                  ... and {parsedData.questions.length - 3} more questions
                </p>}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleImportToForm} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Import to Mock Test Form
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Back
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>}
      </DialogContent>
    </Dialog>;
};
export default MockTestWordUpload;