import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReportOverviewCards from './reports/ReportOverviewCards';
import ReportCharts from './reports/ReportCharts';
import ReportFilters from './reports/ReportFilters';
import {
  fetchOverviewStats,
  fetchTopicPerformance,
  fetchSubjectDistribution,
  fetchScoreDistribution,
  type OverviewStats,
  type TopicPerformance,
  type SubjectDistribution,
  type ScoreDistribution,
} from '@/services/reportsService';
import { fetchStudentPerformance } from '@/services/studentPerformanceService';
import { generateReportPDF, type StudentPerformance } from '@/services/reportsPdfGenerator';

const ProgressReports = () => {
  const [period, setPeriod] = useState('7days');
  const [subject, setSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [topicPerf, setTopicPerf] = useState<TopicPerformance[]>([]);
  const [subjectDist, setSubjectDist] = useState<SubjectDistribution[]>([]);
  const [scoreDist, setScoreDist] = useState<ScoreDistribution[]>([]);
  const [students, setStudents] = useState<StudentPerformance[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const subFilter = subject !== 'all' ? subject : undefined;
      const [s, tp, sd, sc, st] = await Promise.all([
        fetchOverviewStats(period, subFilter),
        fetchTopicPerformance(period, subFilter),
        fetchSubjectDistribution(period),
        fetchScoreDistribution(period, subFilter),
        fetchStudentPerformance(period, subFilter),
      ]);
      setStats(s);
      setTopicPerf(tp);
      setSubjectDist(sd);
      setScoreDist(sc);
      setStudents(st);
    } catch (err) {
      console.error('Report fetch error:', err);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [period, subject]);

  useEffect(() => {
    loadData();

    // Real-time subscription to automatically refresh progress reports
    const channel = supabase
      .channel('progress-reports-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_attempts' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_evaluations' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const exportPDF = () => {
    toast.info('Generating PDF report...');
    try {
      generateReportPDF({
        period,
        subject,
        stats,
        topicPerformance: topicPerf,
        subjectDistribution: subjectDist,
        scoreDistribution: scoreDist,
        students,
      });
      toast.success('PDF report downloaded successfully');
    } catch {
      toast.error('PDF export failed');
    }
  };

  const periodLabel = period === '7days' ? 'Last 7 Days' : period === '30days' ? 'Last 30 Days' : 'Last 90 Days';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress Reports & Analytics</h1>
          <p className="text-muted-foreground">Data-driven insights into student performance and engagement</p>
        </div>
        <ReportFilters
          period={period}
          onPeriodChange={setPeriod}
          subject={subject}
          onSubjectChange={setSubject}
          onExportPDF={exportPDF}
          onRefresh={loadData}
          loading={loading}
        />
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          📊 {periodLabel} {subject !== 'all' && `• ${subject.replace(/\b\w/g, c => c.toUpperCase())}`}
        </div>

        <ReportOverviewCards stats={stats} loading={loading} />
        <ReportCharts
          topicPerformance={topicPerf}
          subjectDistribution={subjectDist}
          scoreDistribution={scoreDist}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ProgressReports;
