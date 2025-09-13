import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  incorrect_type: number;
}

interface ParsedTest {
  test_name: string;
  category: string;
  questions: ParsedQuestion[];
}

interface WordUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WordUploadModal: React.FC<WordUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTest | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form fields
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  
  const { toast } = useToast();
  
  const subjects = [
    'mathematics',
    'physics', 
    'chemistry',
    'biology',
    'english',
    'history',
    'geography',
    'computer_science'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        setSelectedFile(file);
        setParsedData(null);
        setShowPreview(false);
      } else {
        toast({
          title: "Invalid File Format",
          description: "Please select a .doc or .docx file.",
          variant: "destructive"
        });
      }
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a Word file first.",
        variant: "destructive"
      });
      return;
    }

    if (!testName.trim() || !subject || !topic.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in test name, subject, and topic.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use direct fetch to send multipart/form-data to Edge Function
      const FUNCTION_URL = 'https://mvmciqmszakciijfdyos.supabase.co/functions/v1/parse-word-test';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bWNpcW1zemFrY2lpamZkeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjUzNjcsImV4cCI6MjA2NTMwMTM2N30.SVtqZR-q4nSYCwlFfMq7GUoaK2mtTVasv5Zt8dJFO9w';

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setParsedData(data.data);
        setShowPreview(true);
        toast({
          title: 'File Parsed Successfully',
          description: data.message || 'Word file has been parsed successfully.'
        });
      } else {
        throw new Error(data.error || 'Failed to parse file');
      }
    } catch (error) {
      console.error('Error uploading and parsing file:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to parse the Word file. Please check the format and try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!parsedData) return;

    setIsCreating(true);
    try {
      // Create the test first
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([{
          title: testName,
          test_type: 'quick_test',
          description: description || `Quick test imported from Word file - ${subject}`,
          total_questions: parsedData.questions.length,
          time_limit_minutes: timeLimit,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (testError) throw testError;

      // Create questions
      const questionsData = parsedData.questions.map((q, index) => ({
        test_id: testData.id,
        question_text: q.question_text,
        option_a: q.options[0] || '',
        option_b: q.options[1] || '',
        option_c: q.options[2] || '',
        option_d: q.options[3] || '',
        correct_answer: q.correct_answer.charAt(0).toUpperCase(),
        explanation: q.explanation,
        difficulty_level: 'medium' as const
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);

      if (questionsError) throw questionsError;

      toast({
        title: "Test Created Successfully",
        description: `Quick test "${testName}" has been created with ${parsedData.questions.length} questions.`
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating test:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create the test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setShowPreview(false);
    setIsUploading(false);
    setIsCreating(false);
    setTestName('');
    setSubject('');
    setTopic('');
    setDescription('');
    setTimeLimit(30);
    onClose();
  };

  const getIncorrectTypeLabel = (type: number): string => {
    switch (type) {
      case 0: return 'Correct';
      case 1: return 'Concept Error';
      case 2: return 'Calculation Error';
      case 3: return 'Interpretation Error';
      case 4: return 'Carelessness';
      case 5: return 'Subjective';
      default: return 'Unknown';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Quick Test (Word File)
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fill in the test details below, then upload your Word file with:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Minimum 5 questions with options (1-5)</li>
                  <li>Correct answers and explanations</li>
                  <li>Incorrect type classification (0-5)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-name">Test Name *</Label>
                  <Input
                    id="test-name"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Enter test name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subj) => (
                        <SelectItem key={subj} value={subj}>
                          {subj.charAt(0).toUpperCase() + subj.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter topic"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    min="5"
                    max="180"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter test description"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="word-file">Select Word File (.doc/.docx)</Label>
                <Input
                  id="word-file"
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
              </div>

              {selectedFile && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleUploadAndParse}
                  disabled={!selectedFile || isUploading || !testName.trim() || !subject || !topic.trim()}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? 'Parsing...' : 'Upload & Parse'}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">File Parsed Successfully</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Test Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Test Name:</strong> {parsedData?.test_name}</p>
                <p><strong>Category:</strong> {parsedData?.category}</p>
                <p><strong>Questions Found:</strong> {parsedData?.questions.length}</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h4 className="font-semibold">Preview Questions</h4>
              {parsedData?.questions.slice(0, 3).map((question, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-sm">Question {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{question.question_text}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded border text-sm ${
                            String(optIndex + 1) === question.correct_answer
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          {optIndex + 1}. {option}
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    )}
                    <Badge variant="outline">
                      {getIncorrectTypeLabel(question.incorrect_type)}
                    </Badge>
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
                onClick={handleCreateTest}
                disabled={isCreating}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isCreating ? 'Creating Test...' : 'Create Quick Test'}
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

export default WordUploadModal;