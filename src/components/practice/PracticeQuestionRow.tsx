import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { ChevronRight } from 'lucide-react';
import PracticeStatusBadge, { PracticeQuestionStatus } from './PracticeStatusBadge';
import { cn } from '@/lib/utils';

interface PracticeQuestionRowProps {
  id: string;
  number: number;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: string;
  status: PracticeQuestionStatus;
  marks?: number;
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const PracticeQuestionRow: React.FC<PracticeQuestionRowProps> = ({
  id,
  number,
  title,
  topic,
  difficulty,
  questionType,
  status,
  marks
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/practice/question/${id}`);
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={handleClick}
    >
      {/* Number */}
      <TableCell className="w-16 font-mono text-muted-foreground">
        {number}
      </TableCell>

      {/* Title */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="line-clamp-1">{title}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </TableCell>

      {/* Topic */}
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline" className="text-xs">
          {topic}
        </Badge>
      </TableCell>

      {/* Difficulty */}
      <TableCell className="hidden sm:table-cell">
        <Badge className={cn("text-xs capitalize", difficultyColors[difficulty])}>
          {difficulty}
        </Badge>
      </TableCell>

      {/* Type */}
      <TableCell className="hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{questionType}</span>
      </TableCell>

      {/* Marks */}
      {marks && (
        <TableCell className="hidden lg:table-cell w-20 text-center">
          <span className="text-xs text-muted-foreground">{marks}</span>
        </TableCell>
      )}

      {/* Status */}
      <TableCell className="w-28">
        <PracticeStatusBadge status={status} />
      </TableCell>
    </TableRow>
  );
};

export default PracticeQuestionRow;
