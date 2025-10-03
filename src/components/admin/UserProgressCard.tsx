import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProgressCardProps {
  userId: string;
}

interface SubjectPerformance {
  subject: string;
  tests_taken: number;
  avg_score: number;
  accuracy_percentage: number;
}

const UserProgressCard: React.FC<UserProgressCardProps> = ({ userId }) => {
  const [performance, setPerformance] = useState<SubjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_performance_by_subject', { user_uuid: userId });

        if (error) throw error;
        setPerformance(data || []);
      } catch (error) {
        console.error('Error fetching performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (performance.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No test data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = performance.map(p => ({
    subject: p.subject,
    score: Number(p.avg_score),
    accuracy: Number(p.accuracy_percentage)
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Performance by Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="hsl(var(--primary))" name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {performance.map((perf) => (
          <Card key={perf.subject}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{perf.subject}</h3>
                <span className="text-sm text-muted-foreground">
                  {perf.tests_taken} test{perf.tests_taken !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Score</span>
                    <span className="font-semibold">{perf.avg_score}%</span>
                  </div>
                  <Progress value={Number(perf.avg_score)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Accuracy</span>
                    <span className="font-semibold">{perf.accuracy_percentage}%</span>
                  </div>
                  <Progress value={Number(perf.accuracy_percentage)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserProgressCard;
