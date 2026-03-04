import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, ArrowRight } from 'lucide-react';

interface MockTestListCardProps {
  id: string;
  title: string;
  subject: string;
  topic: string;
  totalQuestions: number;
  timeLimitMinutes?: number;
  onStart: (testId: string) => void;
}

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: 'Mathematics',
  science: 'Science',
  language_literature: 'Language & Literature',
  social_studies: 'Social Studies',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
};

const MockTestListCard: React.FC<MockTestListCardProps> = ({
  id,
  title,
  subject,
  topic,
  totalQuestions,
  timeLimitMinutes = 120,
  onStart,
}) => {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border bg-card">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {SUBJECT_LABELS[subject] || subject}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold text-foreground leading-tight">
          {title}
        </CardTitle>
        {topic && (
          <p className="text-sm text-muted-foreground">{topic}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{totalQuestions} question{totalQuestions !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{timeLimitMinutes} mins</span>
          </div>
        </div>

        <Button
          onClick={() => onStart(id)}
          className="w-full gap-2"
          size="lg"
        >
          Start Test
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default MockTestListCard;
