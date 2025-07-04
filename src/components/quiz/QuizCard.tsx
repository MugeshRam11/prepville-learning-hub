
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen } from 'lucide-react';

interface QuizCardProps {
  test: {
    id: string;
    title: string;
    subject: string;
    topic: string;
    questions: number;
    timeMinutes: number;
    difficulty: string;
  };
  onStartTest: (testId: string) => void;
}

const QuizCard = ({ test, onStartTest }: QuizCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="text-xs">
            {test.subject}
          </Badge>
          <Badge className={`text-xs ${getDifficultyColor(test.difficulty)}`}>
            {test.difficulty}
          </Badge>
        </div>
        <CardTitle className="text-lg">{test.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{test.topic}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-1" />
              {test.questions} Questions
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {test.timeMinutes} mins
            </div>
          </div>
          <Button 
            className="w-full"
            onClick={() => onStartTest(test.id)}
          >
            Start Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizCard;
