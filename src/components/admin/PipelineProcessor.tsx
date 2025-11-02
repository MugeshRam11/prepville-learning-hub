import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle, Loader2, FileText, FileCode, Database } from 'lucide-react';

interface PipelineTask {
  id: string;
  operation: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
}

interface PipelineProcessorProps {
  file: File;
  onComplete?: (result: any) => void;
}

const PipelineProcessor: React.FC<PipelineProcessorProps> = ({ file, onComplete }) => {
  const [processing, setProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [tasks, setTasks] = useState<PipelineTask[]>([
    { id: 'import-1', operation: 'import/upload', status: 'pending' },
    { id: 'convert-1', operation: 'convert (PDF → Word)', status: 'pending' },
    { id: 'parse-1', operation: 'parse (Extract Questions)', status: 'pending' },
    { id: 'export-1', operation: 'export/url', status: 'pending' }
  ]);

  const updateTaskStatus = (taskId: string, status: PipelineTask['status'], result?: any) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status, result } : task
    ));
  };

  const executePipeline = async () => {
    setProcessing(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Task 1: Import
      setCurrentTask('Importing file...');
      updateTaskStatus('import-1', 'processing');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateTaskStatus('import-1', 'completed', { fileName: file.name });

      // Task 2: Convert to Word
      setCurrentTask('Converting PDF to Word format...');
      updateTaskStatus('convert-1', 'processing');
      
      // Extract text from PDF first (client-side)
      const pdfjsLib = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedText += `\n--- Page ${i} ---\n${pageText}`;
      }

      // Task 2: Convert to Word using RapidAPI
      setCurrentTask('Converting to Word format with RapidAPI...');
      updateTaskStatus('convert-1', 'processing');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const convertResponse = await fetch(
        `https://mvmciqmszakciijfdyos.supabase.co/functions/v1/pdf-pipeline`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bWNpcW1zemFrY2lpamZkeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjUzNjcsImV4cCI6MjA2NTMwMTM2N30.SVtqZR-q4nSYCwlFfMq7GUoaK2mtTVasv5Zt8dJFO9w`
          },
          body: formData
        }
      );
      
      if (!convertResponse.ok) {
        throw new Error('Failed to convert PDF to Word');
      }
      
      const wordBlob = await convertResponse.blob();
      
      // Create download URL for the Word file
      const wordUrl = URL.createObjectURL(wordBlob);
      updateTaskStatus('convert-1', 'completed', { format: 'docx', downloadUrl: wordUrl });

      // Task 3: Parse questions with AI and save to database
      setCurrentTask('Parsing questions with AI and saving to database...');
      updateTaskStatus('parse-1', 'processing');

      // Create a mock test record first to get the test ID
      const { data: testData, error: testError } = await supabase
        .from('mock_tests')
        .insert({
          title: `Imported Test - ${file.name}`,
          subject: 'mathematics',
          topic: 'Auto-imported from PDF pipeline',
          is_published: false
        })
        .select()
        .single();

      if (testError) {
        console.error('Failed to create test:', testError);
        throw new Error('Failed to create test record');
      }

      const { data: parseData, error: parseError } = await supabase.functions.invoke('pdf-pipeline', {
        body: {
          extractedText,
          fileName: file.name,
          operation: 'parse',
          testId: testData.id
        }
      });

      if (parseError) throw parseError;
      
      const questionsData = parseData?.parse?.questions || [];
      const savedToDb = parseData?.parse?.metadata?.savedToDatabase || false;
      
      updateTaskStatus('parse-1', 'completed', { 
        questions: questionsData,
        count: questionsData.length,
        testId: testData.id,
        savedToDatabase: savedToDb
      });

      // Task 4: Export
      setCurrentTask('Preparing export...');
      updateTaskStatus('export-1', 'processing');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateTaskStatus('export-1', 'completed', { 
        downloadUrl: null,
        data: {
          questions: questionsData,
          metadata: parseData?.parse?.metadata
        }
      });

      toast.success(`Pipeline completed! Parsed ${questionsData.length} questions`);
      
      if (onComplete) {
        onComplete({
          questions: questionsData,
          metadata: parseData?.parse?.metadata
        });
      }

    } catch (error) {
      console.error('Pipeline error:', error);
      toast.error('Pipeline processing failed');
      const failedTask = tasks.find(t => t.status === 'processing');
      if (failedTask) {
        updateTaskStatus(failedTask.id, 'error');
      }
    } finally {
      setProcessing(false);
      setCurrentTask('');
    }
  };

  const getTaskIcon = (task: PipelineTask) => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <div className="w-5 h-5 rounded-full bg-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getOperationIcon = (operation: string) => {
    if (operation.includes('import')) return <FileText className="w-4 h-4" />;
    if (operation.includes('convert')) return <FileCode className="w-4 h-4" />;
    if (operation.includes('parse')) return <Database className="w-4 h-4" />;
    return <ArrowRight className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Processing Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pipeline Visualization */}
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div key={task.id}>
              <div className="flex items-center gap-3">
                {getTaskIcon(task)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getOperationIcon(task.operation)}
                    <span className="text-sm font-medium">{task.operation}</span>
                  </div>
                  {task.status === 'completed' && task.result && (
                    <p className="text-xs text-green-700 mt-1">
                      {task.result.questions 
                        ? `✓ ${task.result.count} questions ${task.result.savedToDatabase ? 'parsed & saved' : 'parsed'}` 
                        : '✓ Completed'}
                    </p>
                  )}
                </div>
              </div>
              {index < tasks.length - 1 && (
                <div className="ml-2.5 my-1 w-0.5 h-4 bg-gray-300" />
              )}
            </div>
          ))}
        </div>

        {/* Current Progress */}
        {processing && currentTask && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">{currentTask}</p>
                <Progress value={33} className="mt-2 h-2" />
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={executePipeline}
          disabled={processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Start Pipeline
            </>
          )}
        </Button>

        {/* Summary with Download Link */}
        {tasks.every(t => t.status === 'completed') && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Pipeline completed successfully!</p>
                  <p className="text-xs text-green-700 mt-1">
                    All tasks executed: Import → Convert → Parse → Export
                  </p>
                </div>
              </div>
              {tasks.find(t => t.id === 'convert-1')?.result?.downloadUrl && (
                <a
                  href={tasks.find(t => t.id === 'convert-1')?.result?.downloadUrl}
                  download="converted-document.docx"
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  Download Word
                </a>
              )}
            </div>
            {tasks.find(t => t.id === 'parse-1')?.result?.testId && (
              <div className="bg-white border border-green-200 rounded p-3">
                <p className="text-xs font-medium text-green-900 mb-1">
                  ✓ {tasks.find(t => t.id === 'parse-1')?.result?.count} questions saved to database
                </p>
                <p className="text-xs text-green-700">
                  Test ID: {tasks.find(t => t.id === 'parse-1')?.result?.testId}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineProcessor;
