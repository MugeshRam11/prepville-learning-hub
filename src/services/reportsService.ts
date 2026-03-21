import { supabase } from '@/integrations/supabase/client';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface OverviewStats {
  totalAttempts: number;
  averageScore: number;
  activeUsers: number;
  averageTimeMinutes: number;
}

export interface TopicPerformance {
  topic: string;
  averageScore: number;
  attempts: number;
}

export interface SubjectDistribution {
  name: string;
  value: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
}

function getDateRange(period: string): DateRange {
  const endDate = new Date().toISOString();
  const start = new Date();
  if (period === '7days') start.setDate(start.getDate() - 7);
  else if (period === '30days') start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 90);
  return { startDate: start.toISOString(), endDate };
}

export async function fetchOverviewStats(period: string, subjectFilter?: string): Promise<OverviewStats> {
  const { startDate } = getDateRange(period);

  let query = supabase
    .from('test_attempts')
    .select('id, user_id, score, time_taken_seconds, test_id, submission_status')
    .gte('completed_at', startDate)
    .not('submission_status', 'is', null);

  const { data: attempts, error } = await query;
  if (error) throw error;

  let filtered = attempts || [];

  // If subject filter, get test IDs for that subject
  if (subjectFilter && subjectFilter !== 'all') {
    const { data: tests } = await supabase
      .from('mock_tests')
      .select('id')
      .eq('subject', subjectFilter);
    const testIds = new Set((tests || []).map(t => t.id));
    filtered = filtered.filter(a => testIds.has(a.test_id));
  }

  const totalAttempts = filtered.length;
  const activeUsers = new Set(filtered.map(a => a.user_id)).size;

  // Try to use evaluated scores first
  const attemptIds = filtered.map(a => a.id);
  let averageScore = 0;

  if (attemptIds.length > 0) {
    const { data: evals } = await supabase
      .from('exam_evaluations')
      .select('final_score, test_attempt_id')
      .in('test_attempt_id', attemptIds.slice(0, 500))
      .eq('evaluation_status', 'published')
      .not('final_score', 'is', null);

    if (evals && evals.length > 0) {
      const sum = evals.reduce((s, e) => s + (Number(e.final_score) || 0), 0);
      averageScore = Math.round(sum / evals.length);
    } else {
      // Fallback to test_attempts.score
      const scored = filtered.filter(a => a.score != null && a.score > 0);
      if (scored.length > 0) {
        const sum = scored.reduce((s, a) => s + a.score, 0);
        averageScore = Math.round(sum / scored.length);
      }
    }
  }

  const withTime = filtered.filter(a => a.time_taken_seconds && a.time_taken_seconds > 0);
  const averageTimeMinutes = withTime.length > 0
    ? Math.round(withTime.reduce((s, a) => s + (a.time_taken_seconds || 0), 0) / withTime.length / 60)
    : 0;

  return { totalAttempts, averageScore, activeUsers, averageTimeMinutes };
}

export async function fetchTopicPerformance(period: string, subjectFilter?: string): Promise<TopicPerformance[]> {
  const { startDate } = getDateRange(period);

  const { data: attempts } = await supabase
    .from('test_attempts')
    .select('id, test_id, score')
    .gte('completed_at', startDate);

  if (!attempts || attempts.length === 0) return [];

  const testIds = [...new Set(attempts.map(a => a.test_id))];

  let testsQuery = supabase.from('mock_tests').select('id, topic').in('id', testIds.slice(0, 200));
  if (subjectFilter && subjectFilter !== 'all') {
    testsQuery = testsQuery.eq('subject', subjectFilter);
  }
  const { data: tests } = await testsQuery;
  if (!tests) return [];

  const testTopicMap = new Map(tests.map(t => [t.id, t.topic]));
  const filteredTestIds = new Set(tests.map(t => t.id));

  const topicStats: Record<string, { sum: number; count: number }> = {};

  for (const a of attempts) {
    if (!filteredTestIds.has(a.test_id)) continue;
    const topic = testTopicMap.get(a.test_id) || 'Unknown';
    if (!topicStats[topic]) topicStats[topic] = { sum: 0, count: 0 };
    topicStats[topic].sum += a.score || 0;
    topicStats[topic].count += 1;
  }

  return Object.entries(topicStats)
    .map(([topic, s]) => ({
      topic,
      averageScore: s.count > 0 ? Math.round(s.sum / s.count) : 0,
      attempts: s.count,
    }))
    .sort((a, b) => b.attempts - a.attempts);
}

export async function fetchSubjectDistribution(period: string): Promise<SubjectDistribution[]> {
  const { startDate } = getDateRange(period);

  const { data: attempts } = await supabase
    .from('test_attempts')
    .select('test_id')
    .gte('completed_at', startDate);

  if (!attempts || attempts.length === 0) return [];

  const testIds = [...new Set(attempts.map(a => a.test_id))];
  const { data: tests } = await supabase
    .from('mock_tests')
    .select('id, subject')
    .in('id', testIds.slice(0, 200));

  if (!tests) return [];

  const testSubjectMap = new Map(tests.map(t => [t.id, t.subject]));
  const subjectCounts: Record<string, number> = {};

  for (const a of attempts) {
    const subject = testSubjectMap.get(a.test_id) || 'unknown';
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  }

  return Object.entries(subjectCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));
}

export async function fetchScoreDistribution(period: string, subjectFilter?: string): Promise<ScoreDistribution[]> {
  const { startDate } = getDateRange(period);

  let query = supabase
    .from('test_attempts')
    .select('score, test_id')
    .gte('completed_at', startDate)
    .not('score', 'is', null);

  const { data: attempts } = await query;
  if (!attempts) return [];

  let filtered = attempts;
  if (subjectFilter && subjectFilter !== 'all') {
    const { data: tests } = await supabase.from('mock_tests').select('id').eq('subject', subjectFilter);
    const testIds = new Set((tests || []).map(t => t.id));
    filtered = filtered.filter(a => testIds.has(a.test_id));
  }

  const ranges: Record<string, number> = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const a of filtered) {
    const s = a.score;
    if (s <= 20) ranges['0-20']++;
    else if (s <= 40) ranges['21-40']++;
    else if (s <= 60) ranges['41-60']++;
    else if (s <= 80) ranges['61-80']++;
    else ranges['81-100']++;
  }

  return Object.entries(ranges).map(([range, count]) => ({ range, count }));
}
