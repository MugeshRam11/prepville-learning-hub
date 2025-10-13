import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Award } from 'lucide-react';

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
  const getSubjectColor = (subjectKey: string) => {
    const colors = {
      'mathematics': 'from-blue-500 to-blue-600',
      'physics': 'from-purple-500 to-purple-600',
      'chemistry': 'from-green-500 to-green-600',
      'biology': 'from-emerald-500 to-emerald-600',
      'science': 'from-teal-500 to-teal-600',
      'language_literature': 'from-orange-500 to-orange-600',
      'social_studies': 'from-pink-500 to-pink-600',
    };
    return colors[subjectKey] || 'from-primary to-primary/80';
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-border bg-card">
      {/* Gradient Header */}
      <div className={`h-3 bg-gradient-to-r ${getSubjectColor(subjectKey)}`} />
      
      <CardHeader className="space-y-3 pb-4">
        <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
          {subject}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${getSubjectColor(subjectKey)}`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalQuestions}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${getSubjectColor(subjectKey)}`}>
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTests}</div>
              <div className="text-xs text-muted-foreground">Topics</div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button 
          onClick={() => onStart(subjectKey)}
          className={`w-full bg-gradient-to-r ${getSubjectColor(subjectKey)} hover:opacity-90 text-white shadow-lg`}
          size="lg"
        >
          <FileText className="w-5 h-5 mr-2" />
          Start Test
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubjectTestCard;
