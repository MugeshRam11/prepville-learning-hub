import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Users, Award, Clock } from 'lucide-react';

interface TopicStats {
  total: number;
  sum: number;
  attempts: number;
}

interface TopicPerformance {
  topic: string;
  averageScore: number;
  attempts: number;
}

interface TestTypeDistribution {
  name: string;
  value: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

const ProgressReports = () => {
  const [reportData, setReportData] = useState({
    topicPerformance: [] as TopicPerformance[],
    userProgress: [] as any[],
    testTypeDistribution: [] as TestTypeDistribution[],
    scoreDistribution: [] as ScoreDistribution[]
  });
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      const days = selectedPeriod === '7days' ? 7 : selectedPeriod === '30days' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch test attempts with related data
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select(`
          *,
          mock_tests (title, subject, topic),
          profiles (first_name, last_name, email)
        `)
        .gte('completed_at', startDate.toISOString());

      // Process topic performance
      const topicStats: Record<string, TopicStats> = {};
      attempts?.forEach(attempt => {
        const topicName = attempt.tests?.topics?.name || 'Unknown';
        if (!topicStats[topicName]) {
          topicStats[topicName] = { total: 0, sum: 0, attempts: 0 };
        }
        topicStats[topicName].sum += attempt.score;
        topicStats[topicName].attempts += 1;
        topicStats[topicName].total = topicStats[topicName].sum / topicStats[topicName].attempts;
      });

      const topicPerformance = Object.entries(topicStats).map(([topic, stats]) => ({
        topic,
        averageScore: Math.round(stats.total),
        attempts: stats.attempts
      }));

      // Process test type distribution
      const testTypeStats: Record<string, number> = {};
      attempts?.forEach(attempt => {
        const testType = attempt.tests?.test_type || 'unknown';
        testTypeStats[testType] = (testTypeStats[testType] || 0) + 1;
      });

      const testTypeDistribution = Object.entries(testTypeStats).map(([type, count]) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value: count
      }));

      // Process score distribution
      const scoreRanges: Record<string, number> = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      attempts?.forEach(attempt => {
        const score = attempt.score;
        if (score <= 20) scoreRanges['0-20']++;
        else if (score <= 40) scoreRanges['21-40']++;
        else if (score <= 60) scoreRanges['41-60']++;
        else if (score <= 80) scoreRanges['61-80']++;
        else scoreRanges['81-100']++;
      });

      const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
        range,
        count
      }));

      setReportData({
        topicPerformance,
        testTypeDistribution,
        scoreDistribution,
        userProgress: attempts || []
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    // This would implement PDF export functionality
    console.log('Exporting to PDF...');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="flex justify-center p-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress Reports & Analytics</h1>
          <p className="text-gray-600">Detailed insights into user performance and engagement</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.userProgress.length}</div>
            <p className="text-xs text-muted-foreground">Test attempts in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(reportData.userProgress.reduce((sum, attempt) => sum + attempt.score, 0) / reportData.userProgress.length) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(reportData.userProgress.map(attempt => attempt.user_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique test takers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(reportData.userProgress.reduce((sum, attempt) => sum + (attempt.time_taken_seconds || 0), 0) / reportData.userProgress.length / 60) || 0}m
            </div>
            <p className="text-xs text-muted-foreground">Per test attempt</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Topic Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.topicPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="averageScore" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.testTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reportData.testTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Attempted Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.topicPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attempts" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressReports;
