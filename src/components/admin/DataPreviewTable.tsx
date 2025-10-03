import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuestionRow, ValidationError } from './BulkUploadForm';
import { cn } from '@/lib/utils';

interface DataPreviewTableProps {
  data: QuestionRow[];
  errors: ValidationError[];
}

const DataPreviewTable = ({ data, errors }: DataPreviewTableProps) => {
  const getErrorsForCell = (rowIndex: number, field: string): ValidationError[] => {
    return errors.filter(e => e.row === rowIndex + 1 && e.field === field);
  };

  const hasError = (rowIndex: number, field: string): boolean => {
    return getErrorsForCell(rowIndex, field).length > 0;
  };

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Question ID</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead className="min-w-[200px]">Question Text</TableHead>
            <TableHead>Answer</TableHead>
            <TableHead>Option A</TableHead>
            <TableHead>Option B</TableHead>
            <TableHead>Option C</TableHead>
            <TableHead>Option D</TableHead>
            <TableHead>XP</TableHead>
            <TableHead>Video ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'question_id') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'question_id').map(e => e.message).join(', ')}
              >
                {row.question_id}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'topic') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'topic').map(e => e.message).join(', ')}
              >
                {row.topic || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'difficulty') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'difficulty').map(e => e.message).join(', ')}
              >
                {row.difficulty || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  'max-w-[200px] truncate',
                  hasError(index, 'question_text') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={row.question_text || getErrorsForCell(index, 'question_text').map(e => e.message).join(', ')}
              >
                {row.question_text || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'correct_answer') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'correct_answer').map(e => e.message).join(', ')}
              >
                {row.correct_answer || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'option_a') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'option_a').map(e => e.message).join(', ')}
              >
                {row.option_a || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'option_b') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'option_b').map(e => e.message).join(', ')}
              >
                {row.option_b || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'option_c') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'option_c').map(e => e.message).join(', ')}
              >
                {row.option_c || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'option_d') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'option_d').map(e => e.message).join(', ')}
              >
                {row.option_d || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell
                className={cn(
                  hasError(index, 'potential_xp_reward') && 'bg-red-50 border-l-2 border-red-500'
                )}
                title={getErrorsForCell(index, 'potential_xp_reward').map(e => e.message).join(', ')}
              >
                {row.potential_xp_reward || <span className="text-gray-400 italic">empty</span>}
              </TableCell>
              <TableCell className="text-gray-500 text-sm">
                {row.related_video_id || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataPreviewTable;
