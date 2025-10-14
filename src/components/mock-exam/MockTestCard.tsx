import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Award, Edit, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface MockTestCardProps {
  test: {
    id: string;
    title: string;
    subject: string;
    topic: string;
    total_questions: number;
    is_published?: boolean;
    created_at?: string;
  };
  onStart?: (id: string) => void;
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string, currentStatus: boolean) => void;
  isAdmin?: boolean;
}

const MockTestCard: React.FC<MockTestCardProps> = ({ 
  test, 
  onStart, 
  onEdit, 
  onView, 
  onDelete, 
  onTogglePublish,
  isAdmin = false 
}) => {
  const getSubjectColor = (subject: string) => {
    const colors = {
      'mathematics': 'bg-blue-500',
      'Mathematics': 'bg-blue-500',
      'physics': 'bg-red-500',
      'Physics': 'bg-red-500',
      'chemistry': 'bg-teal-500',
      'Chemistry': 'bg-teal-500',
      'biology': 'bg-green-500',
      'Biology': 'bg-green-500',
      'science': 'bg-emerald-500',
      'Science': 'bg-emerald-500',
    };
    return colors[subject] || 'bg-primary';
  };

  const getSubjectLabel = (subject: string) => {
    const labels = {
      'mathematics': 'MYP',
      'Mathematics': 'MYP',
      'physics': 'MYP',
      'Physics': 'MYP',
      'chemistry': 'MYP',
      'Chemistry': 'MYP',
      'biology': 'MYP',
      'Biology': 'MYP',
      'science': 'MYP',
      'Science': 'MYP',
    };
    return labels[subject] || 'MYP';
  };

  const formatSubjectName = (subject: string) => {
    const formatted = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
    return `MYP ${formatted}`;
  };

  // Extract topics from title or use default
  const topics = ['Topic 1', 'Topic 2', 'Topic 3'];

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-border/50 bg-card rounded-2xl">
      <CardContent className="p-6 space-y-4">
        {/* Header with badge and dot */}
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="text-xs font-medium bg-muted/50">
            {getSubjectLabel(test.subject)}
          </Badge>
          <div className={`w-3 h-3 rounded-full ${getSubjectColor(test.subject)}`} />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground leading-tight">
            {formatSubjectName(test.subject)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {test.topic}
          </p>
        </div>

        {/* Topic badges */}
        <div className="flex flex-wrap gap-2">
          {test.topic && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-background">
              {test.topic}
            </Badge>
          )}
          {isAdmin && test.is_published !== undefined && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-background">
              {test.is_published ? 'Published' : 'Draft'}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
          <span className="font-medium">{test.total_questions || 0} Questions</span>
          <span className="font-medium">0 Videos</span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {!isAdmin && onStart && (
            <Button 
              onClick={() => onStart(test.id)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200"
            >
              Start Learning
            </Button>
          )}
          
          {isAdmin && (
            <div className="flex gap-2">
              <Button 
                onClick={() => onView?.(test.id)}
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button 
                onClick={() => onEdit?.(test.id)}
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button 
                onClick={() => onDelete?.(test.id)}
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MockTestCard;
