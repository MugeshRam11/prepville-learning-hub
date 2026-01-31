import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PracticeExamHeaderProps {
  title: string;
  subject: string;
  totalMarks: number;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;
}

const PracticeExamHeader: React.FC<PracticeExamHeaderProps> = ({
  title,
  subject,
  totalMarks,
  answeredCount,
  totalQuestions,
  onSubmit
}) => {
  const navigate = useNavigate();
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-sm"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back button, Title and subject */}
          <div className="flex items-center gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/practice')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">{title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {subject}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {totalMarks} marks
                </span>
              </div>
            </div>
          </div>

          {/* Center: Progress */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">{answeredCount}/{totalQuestions}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Right: Practice Mode Badge and Submit */}
          <div className="flex items-center gap-3">
            {/* Practice Mode Badge */}
            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
              Practice Mode
            </Badge>

            {/* Submit to Review button */}
            <Button 
              onClick={onSubmit}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Submit to Review</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default PracticeExamHeader;
