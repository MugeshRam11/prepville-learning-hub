import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Star, Trophy, Zap, Award } from 'lucide-react';

interface ActivityTimelineProps {
  userId: string;
}

interface Activity {
  activity_id: string;
  activity_type: string;
  activity_description: string;
  activity_value: number;
  activity_date: string;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_activity_timeline', { 
            user_uuid: userId,
            limit_count: 50 
          });

        if (error) throw error;
        setActivities(data || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [userId]);

  const getActivityIcon = (type: string) => {
    if (type.includes('quiz') || type.includes('test')) return <Trophy className="h-4 w-4" />;
    if (type.includes('streak')) return <Zap className="h-4 w-4" />;
    if (type.includes('milestone')) return <Award className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No activity history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <Card key={activity.activity_id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{activity.activity_description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.activity_date), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    +{activity.activity_value} XP
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActivityTimeline;
