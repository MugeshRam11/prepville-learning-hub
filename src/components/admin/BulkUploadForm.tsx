import React, { useState } from 'react';
import { Upload, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileUploadZone from './FileUploadZone';
import DataPreviewTable from './DataPreviewTable';
import UploadProgressTracker from './UploadProgressTracker';

export interface QuestionRow {
  question_id: string;
  topic: string;
  difficulty: string;
  question_text: string;
  correct_answer: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  potential_xp_reward: string;
  related_video_id?: string;
  explanation_text?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const BulkUploadForm = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [uploadedData, setUploadedData] = useState<QuestionRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      'question_id,topic,difficulty,question_text,correct_answer,option_a,option_b,option_c,option_d,potential_xp_reward,related_video_id,explanation_text',
      'Q001,Linear Equations,3,"Solve for x: 2x + 5 = 15",B,"x = 5","x = 10","x = 15","x = 20",15,YT123,"Subtract 5 from both sides, then divide by 2"',
      'Q002,Geometry,2,"What is the area of a circle with radius 5?",A,"25π","50π","10π","5π",10,YT124,"Use formula A = πr²"',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hasRequiredFields = selectedSubject && selectedLevel;
  const hasCriticalErrors = validationErrors.some(e => 
    ['topic', 'difficulty', 'question_text', 'correct_answer'].includes(e.field)
  );

  return (
    <div className="space-y-6">
      {/* Subject & Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Subject & Download Template</CardTitle>
          <CardDescription>Choose the subject and download the CSV template to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                  <SelectItem value="computer_science">Computer Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="economics">Economics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MYP">MYP</SelectItem>
                  <SelectItem value="IGCSE">IGCSE</SelectItem>
                  <SelectItem value="AS">AS Level</SelectItem>
                  <SelectItem value="A2">A2 Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      {hasRequiredFields && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload Question Data</CardTitle>
            <CardDescription>Drag and drop your CSV or JSON file, or click to browse</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone 
              onDataParsed={(data, errors) => {
                setUploadedData(data);
                setValidationErrors(errors);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <Alert variant={hasCriticalErrors ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">
              Found {validationErrors.length} validation {validationErrors.length === 1 ? 'error' : 'errors'}
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {Object.entries(
                validationErrors.reduce((acc, err) => {
                  const key = err.message;
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([msg, count]) => (
                <li key={msg}>{count} row(s): {msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {uploadedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Preview & Validate Data</CardTitle>
            <CardDescription>
              Showing first 20 rows. Review the data and fix any highlighted errors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataPreviewTable 
              data={uploadedData.slice(0, 20)} 
              errors={validationErrors}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <UploadProgressTracker 
          progress={uploadProgress}
          total={uploadedData.length}
        />
      )}

      {/* Submit Button */}
      {uploadedData.length > 0 && !isUploading && (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={async () => {
                setIsUploading(true);
                setUploadProgress(0);
                
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    toast({
                      title: "Error",
                      description: "You must be logged in to upload questions",
                      variant: "destructive",
                    });
                    setIsUploading(false);
                    return;
                  }

                  // Map uploaded data to database schema
                  const questionsToInsert = uploadedData.map((row) => ({
                    subject: selectedSubject as any,
                    level: selectedLevel,
                    topic: row.topic,
                    difficulty: row.difficulty,
                    question_text: row.question_text,
                    answer_key: row.correct_answer,
                    option_a: row.option_a,
                    option_b: row.option_b,
                    option_c: row.option_c,
                    option_d: row.option_d,
                    xp_reward: parseInt(row.potential_xp_reward) || 10,
                    video_id: row.related_video_id || null,
                    explanation: row.explanation_text || null,
                    title: row.question_text.substring(0, 100),
                    is_published: true,
                    created_by: user.id,
                  }));

                  // Insert in batches of 50
                  const batchSize = 50;
                  let successCount = 0;
                  
                  for (let i = 0; i < questionsToInsert.length; i += batchSize) {
                    const batch = questionsToInsert.slice(i, i + batchSize);
                    
                    const { error } = await supabase
                      .from('subject_questions')
                      .insert(batch);

                    if (error) {
                      throw error;
                    }

                    successCount += batch.length;
                    setUploadProgress(successCount);
                  }

                  toast({
                    title: "Upload completed",
                    description: `Successfully uploaded ${successCount} questions to ${selectedSubject} - ${selectedLevel}`,
                  });

                  // Reset form
                  setUploadedData([]);
                  setValidationErrors([]);
                  setIsUploading(false);
                  setUploadProgress(0);

                } catch (error: any) {
                  console.error('Upload error:', error);
                  toast({
                    title: "Upload failed",
                    description: error.message || "An error occurred during upload",
                    variant: "destructive",
                  });
                  setIsUploading(false);
                }
              }}
              disabled={hasCriticalErrors || isUploading}
              className="w-full"
              size="lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Commit Data Import ({uploadedData.length} questions)
            </Button>
            {hasCriticalErrors && (
              <p className="text-sm text-destructive mt-2 text-center">
                Please fix all critical errors before uploading
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUploadForm;
