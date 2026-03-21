import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { TopicPerformance, SubjectDistribution, ScoreDistribution } from '@/services/reportsService';

const COLORS = ['hsl(211,100%,50%)', 'hsl(343,100%,65%)', 'hsl(48,100%,50%)', 'hsl(160,60%,45%)', 'hsl(270,60%,55%)'];

interface Props {
  topicPerformance: TopicPerformance[];
  subjectDistribution: SubjectDistribution[];
  scoreDistribution: ScoreDistribution[];
  loading: boolean;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
    {message}
  </div>
);

const ReportCharts: React.FC<Props> = ({ topicPerformance, subjectDistribution, scoreDistribution, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border border-border">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Topic Performance (Avg Score)</CardTitle>
        </CardHeader>
        <CardContent>
          {topicPerformance.length === 0 ? <EmptyState message="No topic data available" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="topic" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="averageScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Subject Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectDistribution.length === 0 ? <EmptyState message="No subject data available" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {subjectDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {scoreDistribution.every(s => s.count === 0) ? <EmptyState message="No score data available" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Most Attempted Topics</CardTitle>
        </CardHeader>
        <CardContent>
          {topicPerformance.length === 0 ? <EmptyState message="No topic data available" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[...topicPerformance].sort((a, b) => b.attempts - a.attempts).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="topic" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="attempts" fill="hsl(48,100%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportCharts;
