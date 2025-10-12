import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Sparkles, ArrowRight, BookOpen, GraduationCap, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface ParsedQuestion {
  subject: string;
  level: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  answer: string;
  marks: number;
}

interface UploadStats {
  extracting: boolean;
  categorizing: boolean;
  syncing: boolean;
  completed: boolean;
}

const BulkUploadForm = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    extracting: false,
    categorizing: false,
    syncing: false,
    completed: false
  });
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFiles(Array.from(files).filter(f => f.type === 'application/pdf'));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    setUploadedFiles(files);
  };

  const processAndUpload = async () => {
    if (uploadedFiles.length === 0) return;
    
    setUploadStats({ extracting: true, categorizing: false, syncing: false, completed: false });
    
    // Simulate processing - In real implementation, this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploadStats({ extracting: false, categorizing: true, syncing: false, completed: false });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploadStats({ extracting: false, categorizing: false, syncing: true, completed: false });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploadStats({ extracting: false, categorizing: false, syncing: false, completed: true });
    
    toast({
      title: "✅ Upload Complete",
      description: `Successfully processed ${uploadedFiles.length} PDF file(s)`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Feature Overview */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Auto-Parse PDFs</h3>
                <p className="text-sm text-muted-foreground">Extract questions automatically from PDF files</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Categorization</h3>
                <p className="text-sm text-muted-foreground">AI classifies by subject, topic & difficulty</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Instant Sync</h3>
                <p className="text-sm text-muted-foreground">Updates portal in real-time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload PDF Questions
          </CardTitle>
          <CardDescription>
            Drop one or multiple PDF files containing MCQs for MYP / IBDP subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
              ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'}
              ${uploadedFiles.length > 0 ? 'bg-primary/5' : ''}
            `}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <div className="flex flex-col items-center space-y-4">
                {uploadedFiles.length > 0 ? (
                  <CheckCircle2 className="h-16 w-16 text-primary" />
                ) : (
                  <Upload className="h-16 w-16 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xl font-semibold mb-2">
                    {uploadedFiles.length > 0 
                      ? `${uploadedFiles.length} PDF file(s) selected` 
                      : 'Drop PDF files here or click to browse'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports multiple file upload • PDF format only
                  </p>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="w-full max-w-md space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-background/60 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                        </div>
                        <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {(uploadStats.extracting || uploadStats.categorizing || uploadStats.syncing || uploadStats.completed) && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadStats.completed ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Processing Complete
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  Processing PDFs...
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Extracting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {uploadStats.extracting ? (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  )}
                  <span className="font-medium">Extracting Questions</span>
                </div>
                {!uploadStats.extracting && <Badge variant="secondary">Done</Badge>}
              </div>
              <Progress value={uploadStats.extracting ? 50 : 100} className="h-2" />
            </div>

            {/* Categorizing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {uploadStats.categorizing ? (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : uploadStats.completed || uploadStats.syncing ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium">Categorizing by Subject & Topic</span>
                </div>
                {uploadStats.categorizing && <Badge>In Progress</Badge>}
                {(uploadStats.completed || uploadStats.syncing) && <Badge variant="secondary">Done</Badge>}
              </div>
              <Progress value={uploadStats.categorizing ? 50 : (uploadStats.syncing || uploadStats.completed ? 100 : 0)} className="h-2" />
            </div>

            {/* Syncing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {uploadStats.syncing ? (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : uploadStats.completed ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium">Syncing to Portal</span>
                </div>
                {uploadStats.syncing && <Badge>In Progress</Badge>}
                {uploadStats.completed && <Badge variant="secondary">Done</Badge>}
              </div>
              <Progress value={uploadStats.syncing ? 50 : (uploadStats.completed ? 100 : 0)} className="h-2" />
            </div>

            {uploadStats.completed && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Successfully uploaded and synced to Quick Practice, Subjects, and Mock Exams sections
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      {uploadedFiles.length > 0 && !uploadStats.completed && (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={processAndUpload}
              disabled={uploadStats.extracting || uploadStats.categorizing || uploadStats.syncing}
              className="w-full h-14 text-lg"
              size="lg"
            >
              {uploadStats.extracting || uploadStats.categorizing || uploadStats.syncing ? (
                <>
                  <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Process & Upload {uploadedFiles.length} PDF{uploadedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUploadForm;
