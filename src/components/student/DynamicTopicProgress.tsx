import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { TopicProgress } from '@/hooks/useProgressTracking';
import { formatDistanceToNow } from 'date-fns';

interface DynamicTopicProgressProps {
  topics: TopicProgress[];
  loading: boolean;
  onContinueLearning: (topicName: string) => void;
}

const DynamicTopicProgress: React.FC<DynamicTopicProgressProps> = ({ 
  topics, 
  loading, 
  onContinueLearning 
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-[hsl(var(--adsavvy-yellow))]/30 text-yellow-700 border-yellow-200';
      case 'hard':
        return 'bg-[hsl(var(--adsavvy-pink))]/20 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md border-gray-100 animate-pulse">
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border rounded-xl">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <BookOpen className="w-6 h-6 text-[hsl(var(--adsavvy-blue))]" />
          Topic Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topics.map((topic, index) => {
          const progressPercentage = (topic.completed_tasks / topic.total_tasks) * 100;
          
          return (
            <div
              key={topic.id}
              className="p-5 border border-gray-200 rounded-xl hover:shadow-lg transition-all hover:scale-[1.02] bg-white animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">{topic.topic_name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getDifficultyColor(topic.difficulty)}`}>
                      {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                    </Badge>
                    {topic.last_activity_at && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(topic.last_activity_at), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-[hsl(var(--adsavvy-blue))]">
                  {topic.completed_tasks}/{topic.total_tasks}
                </span>
              </div>

              <Progress 
                value={progressPercentage} 
                className="h-3 mb-4 bg-gray-100" 
              />

              {progressPercentage === 0 && (
                <p className="text-xs text-gray-500 mb-3 italic">No progress yet - Start learning now!</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onContinueLearning(topic.topic_name)}
                  className="flex-1 bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] hover:opacity-90 transition-all shadow-md rounded-lg font-semibold group"
                  disabled={topic.completed_tasks === topic.total_tasks}
                >
                  {topic.completed_tasks === topic.total_tasks ? (
                    'Completed! 🎉'
                  ) : (
                    <>
                      Continue Learning
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DynamicTopicProgress;
