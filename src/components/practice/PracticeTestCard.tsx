import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Zap } from 'lucide-react';

interface PracticeTestCardProps {
  id: string;
  title: string;
  description?: string | null;
  totalQuestions: number;
  difficulty?: string | null;
  timeLimitMinutes?: number | null;
  onStart: (testId: string) => void;
}

const PracticeTestCard: React.FC<PracticeTestCardProps> = ({
  id,
  title,
  description,
  totalQuestions,
  difficulty,
  timeLimitMinutes,
  onStart
}) => {
  const getDifficultyColor = (diff: string | null | undefined) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDifficulty = (diff: string | null | undefined) => {
    if (!diff) return 'Mixed';
    return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-green-200/50 bg-card rounded-2xl hover:border-green-300">
      <CardContent className="p-6 space-y-4">
        {/* Header with badge */}
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="text-xs font-medium bg-green-100 text-green-700">
            Practice-QA
          </Badge>
          {difficulty && (
            <Badge className={`text-xs ${getDifficultyColor(difficulty)}`}>
              {formatDifficulty(difficulty)}
            </Badge>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">{totalQuestions || 0} Questions</span>
          </div>
          {timeLimitMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{timeLimitMinutes} min</span>
            </div>
          )}
        </div>

        {/* No pressure indicator */}
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
          <Zap className="w-3 h-3" />
          <span>Learn at your own pace • No timer pressure</span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={() => onStart(id)}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-6 text-base font-semibold shadow-lg shadow-green-500/25 transition-all duration-200"
          >
            Start Practice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PracticeTestCard;
