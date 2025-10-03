import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { QuestionRow, ValidationError } from './BulkUploadForm';

interface FileUploadZoneProps {
  onDataParsed: (data: QuestionRow[], errors: ValidationError[]) => void;
}

const FileUploadZone = ({ onDataParsed }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const validateRow = (row: QuestionRow, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const rowNum = index + 1;

    // Required fields validation
    if (!row.topic?.trim()) {
      errors.push({ row: rowNum, field: 'topic', message: 'Topic is required' });
    }
    if (!row.difficulty?.trim()) {
      errors.push({ row: rowNum, field: 'difficulty', message: 'Difficulty is required' });
    }
    if (!row.question_text?.trim()) {
      errors.push({ row: rowNum, field: 'question_text', message: 'Question text is required' });
    }
    if (!row.correct_answer?.trim()) {
      errors.push({ row: rowNum, field: 'correct_answer', message: 'Correct answer is required' });
    }

    // Difficulty validation (must be 1-5)
    const difficulty = parseInt(row.difficulty);
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      errors.push({ 
        row: rowNum, 
        field: 'difficulty', 
        message: 'Difficulty must be between 1 and 5' 
      });
    }

    // XP reward validation
    const xpReward = parseInt(row.potential_xp_reward);
    if (isNaN(xpReward) || xpReward <= 0) {
      errors.push({ 
        row: rowNum, 
        field: 'potential_xp_reward', 
        message: 'XP reward must be a positive integer' 
      });
    }

    // MCQ options validation
    if (!row.option_a?.trim()) {
      errors.push({ row: rowNum, field: 'option_a', message: 'Option A is required' });
    }
    if (!row.option_b?.trim()) {
      errors.push({ row: rowNum, field: 'option_b', message: 'Option B is required' });
    }
    if (!row.option_c?.trim()) {
      errors.push({ row: rowNum, field: 'option_c', message: 'Option C is required' });
    }
    if (!row.option_d?.trim()) {
      errors.push({ row: rowNum, field: 'option_d', message: 'Option D is required' });
    }

    return errors;
  };

  const processFile = useCallback((file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as QuestionRow[];
          const allErrors: ValidationError[] = [];

          data.forEach((row, index) => {
            const rowErrors = validateRow(row, index);
            allErrors.push(...rowErrors);
          });

          onDataParsed(data, allErrors);
          setIsProcessing(false);
          
          toast({
            title: "File processed",
            description: `Loaded ${data.length} questions with ${allErrors.length} validation issues`,
          });
        },
        error: (error) => {
          toast({
            title: "Parse error",
            description: error.message,
            variant: "destructive",
          });
          setIsProcessing(false);
        },
      });
    } else if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as QuestionRow[];
          const allErrors: ValidationError[] = [];

          data.forEach((row, index) => {
            const rowErrors = validateRow(row, index);
            allErrors.push(...rowErrors);
          });

          onDataParsed(data, allErrors);
          setIsProcessing(false);
          
          toast({
            title: "File processed",
            description: `Loaded ${data.length} questions with ${allErrors.length} validation issues`,
          });
        } catch (error) {
          toast({
            title: "Parse error",
            description: "Invalid JSON format",
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or JSON file",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  }, [onDataParsed, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center transition-colors
        ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary'}
      `}
    >
      <input
        type="file"
        accept=".csv,.json"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isProcessing ? 'Processing file...' : 'Drop your file here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Accepts CSV and JSON files only
            </p>
          </div>
          {fileName && (
            <div className="flex items-center space-x-2 text-sm text-primary">
              <FileText className="h-4 w-4" />
              <span>{fileName}</span>
            </div>
          )}
        </div>
      </label>
    </div>
  );
};

export default FileUploadZone;
