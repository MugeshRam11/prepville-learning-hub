import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface TopicProgress {
  id: string;
  topic_name: string;
  completed_tasks: number;
  total_tasks: number;
  difficulty: string;
  last_activity_at: string | null;
}

const TopicProgressCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topic_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('topic_name');

      if (!error && data) {
        setTopics(data);
      }
      setLoading(false);
    };

    fetchTopics();

    // Set up real-time subscription
    const channel = supabase
      .channel('topic-progress-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topic_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTopics(prev => 
              prev.map(t => t.id === payload.new.id 
                ? { ...payload.new as TopicProgress } 
                : t
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setTopics(prev => [...prev, payload.new as TopicProgress]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const formatLastActivity = (timestamp: string | null) => {
    if (!timestamp) return 'Not started';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[hsl(var(--adsavvy-blue))]" />
            Topic Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BookOpen className="w-6 h-6 text-[hsl(var(--adsavvy-blue))]" />
          Topic Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topics.map((topic) => {
            const progress = getProgressPercentage(topic.completed_tasks, topic.total_tasks);
            const isCompleted = topic.completed_tasks >= topic.total_tasks;

            return (
              <div 
                key={topic.id} 
                className="p-4 rounded-xl border border-gray-200 hover:border-[hsl(var(--adsavvy-blue))]/30 transition-all hover:shadow-md animate-fade-in bg-gradient-to-br from-white to-gray-50/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{topic.topic_name}</h3>
                      <span className="text-sm font-bold text-[hsl(var(--adsavvy-blue))]">
                        {topic.completed_tasks}/{topic.total_tasks}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      {formatLastActivity(topic.last_activity_at)}
                    </div>
                  </div>
                  <Badge className={getDifficultyColor(topic.difficulty)}>
                    {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                  </Badge>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-[hsl(var(--adsavvy-blue))]">{progress}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-2.5 transition-all duration-500 ease-out" 
                  />
                </div>

                <Button 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] hover:shadow-lg transition-all hover:scale-[1.02]"
                  disabled={isCompleted}
                  onClick={() => navigate('/quick-practice', { state: { selectedTopic: topic.topic_name } })}
                >
                  {isCompleted ? '✓ Completed' : 'Continue Learning →'}
                </Button>
              </div>
            );
          })}
        </div>

        <Button 
          variant="outline" 
          className="w-full mt-4 border-[hsl(var(--adsavvy-blue))]/30 text-[hsl(var(--adsavvy-blue))] hover:bg-[hsl(var(--adsavvy-blue))]/10"
          onClick={() => navigate('/subjects')}
        >
          View All Topics
        </Button>
      </CardContent>
    </Card>
  );
};

export default TopicProgressCard;
