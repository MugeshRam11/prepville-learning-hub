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
      'mathematics': 'from-blue-500 to-blue-600',
      'Mathematics': 'from-blue-500 to-blue-600',
      'physics': 'from-purple-500 to-purple-600',
      'Physics': 'from-purple-500 to-purple-600',
      'chemistry': 'from-green-500 to-green-600',
      'Chemistry': 'from-green-500 to-green-600',
      'biology': 'from-emerald-500 to-emerald-600',
      'Biology': 'from-emerald-500 to-emerald-600',
      'science': 'from-teal-500 to-teal-600',
      'Science': 'from-teal-500 to-teal-600',
    };
    return colors[subject] || 'from-primary to-primary/80';
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-border bg-card">
      {/* Gradient Header */}
      <div className={`h-2 bg-gradient-to-r ${getSubjectColor(test.subject)}`} />
      
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {test.title}
            </CardTitle>
            <CardDescription className="text-sm">{test.topic}</CardDescription>
          </div>
          {isAdmin && test.is_published !== undefined && (
            <Badge variant={test.is_published ? "default" : "secondary"} className="shrink-0">
              {test.is_published ? 'Published' : 'Draft'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Test Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-medium">{test.total_questions || 0} Questions</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="w-4 h-4 text-primary" />
            <span className="font-medium capitalize">{test.subject}</span>
          </div>
        </div>

        {isAdmin && test.created_at && (
          <div className="text-xs text-muted-foreground">
            Created {format(new Date(test.created_at), 'MMM dd, yyyy')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!isAdmin && onStart && (
            <Button 
              onClick={() => onStart(test.id)}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <FileText className="w-4 h-4 mr-2" />
              Start Test
            </Button>
          )}
          
          {isAdmin && (
            <>
              <Button 
                onClick={() => onView?.(test.id)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button 
                onClick={() => onEdit?.(test.id)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button 
                onClick={() => onDelete?.(test.id)}
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MockTestCard;
