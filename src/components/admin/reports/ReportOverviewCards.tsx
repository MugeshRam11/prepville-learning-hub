import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Award, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { OverviewStats } from '@/services/reportsService';

interface Props {
  stats: OverviewStats | null;
  loading: boolean;
}

const cards = [
  { key: 'totalAttempts' as const, label: 'Total Attempts', sub: 'Test attempts in period', icon: TrendingUp, format: (v: number) => String(v) },
  { key: 'averageScore' as const, label: 'Average Score', sub: 'Across evaluated tests', icon: Award, format: (v: number) => `${v}%` },
  { key: 'activeUsers' as const, label: 'Active Users', sub: 'Unique test takers', icon: Users, format: (v: number) => String(v) },
  { key: 'averageTimeMinutes' as const, label: 'Avg Time', sub: 'Per test attempt', icon: Clock, format: (v: number) => `${v}m` },
];

const ReportOverviewCards: React.FC<Props> = ({ stats, loading }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {cards.map(c => (
      <Card key={c.key} className="border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">{c.label}</CardTitle>
          <c.icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold text-card-foreground">
                {stats ? c.format(stats[c.key]) : '—'}
              </div>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </>
          )}
        </CardContent>
      </Card>
    ))}
  </div>
);

export default ReportOverviewCards;
