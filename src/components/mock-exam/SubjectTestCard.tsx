import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock } from 'lucide-react';

interface SubjectTestCardProps {
  subject: string;
  subjectKey: string;
  totalQuestions: number;
  totalTests: number;
  onStart: (subjectKey: string) => void;
}

const SubjectTestCard: React.FC<SubjectTestCardProps> = ({ 
  subject,
  subjectKey, 
  totalQuestions,
  totalTests,
  onStart
}) => {
  const getDifficultyBadge = (subjectKey: string) => {
    const difficulties = {
      'mathematics': { label: 'Easy', color: 'bg-green-100 text-green-700 hover:bg-green-100' },
      'physics': { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      'chemistry': { label: 'Hard', color: 'bg-red-100 text-red-700 hover:bg-red-100' },
      'biology': { label: 'Easy', color: 'bg-green-100 text-green-700 hover:bg-green-100' },
      'science': { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      'language_literature': { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      'social_studies': { label: 'Easy', color: 'bg-green-100 text-green-700 hover:bg-green-100' },
    };
    return difficulties[subjectKey] || { label: 'Medium', color: 'bg-gray-100 text-gray-700 hover:bg-gray-100' };
  };

  const getEstimatedTime = (totalQuestions: number) => {
    // Estimate 1 minute per question
    return Math.ceil(totalQuestions / totalTests) || 5;
  };

  const difficulty = getDifficultyBadge(subjectKey);

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-200 bg-white">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium text-gray-600">{subject}</div>
          <Badge className={`${difficulty.color} font-medium px-3 py-1`}>
            {difficulty.label}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">
          {totalTests > 1 ? `${subject} Topics` : `${subject} Basics`}
        </CardTitle>
        <p className="text-sm text-gray-600">
          {subject === 'Mathematics' ? 'Algebra' : subject}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{getEstimatedTime(totalQuestions)} mins</span>
          </div>
        </div>

        {/* Start Button */}
        <Button 
          onClick={() => onStart(subjectKey)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm"
          size="lg"
        >
          Start Test
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubjectTestCard;
