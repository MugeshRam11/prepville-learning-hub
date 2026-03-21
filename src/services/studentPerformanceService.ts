import { supabase } from '@/integrations/supabase/client';
import type { StudentPerformance } from './reportsPdfGenerator';

export async function fetchStudentPerformance(period: string, subjectFilter?: string): Promise<StudentPerformance[]> {
  const start = new Date();
  if (period === '7days') start.setDate(start.getDate() - 7);
  else if (period === '30days') start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 90);
  const startDate = start.toISOString();

  // Get attempts in period
  const { data: attempts } = await supabase
    .from('test_attempts')
    .select('id, user_id, score, time_taken_seconds, test_id')
    .gte('completed_at', startDate)
    .not('submission_status', 'is', null);

  if (!attempts || attempts.length === 0) return [];

  let filtered = attempts;

  // Subject filter
  if (subjectFilter && subjectFilter !== 'all') {
    const { data: tests } = await supabase
      .from('mock_tests')
      .select('id')
      .eq('subject', subjectFilter as any);
    const testIds = new Set((tests || []).map(t => t.id));
    filtered = filtered.filter(a => testIds.has(a.test_id));
  }

  if (filtered.length === 0) return [];

  // Get unique user IDs
  const userIds = [...new Set(filtered.map(a => a.user_id))];

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', userIds.slice(0, 500));

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Get evaluated scores
  const attemptIds = filtered.map(a => a.id);
  const { data: evals } = await supabase
    .from('exam_evaluations')
    .select('final_score, test_attempt_id')
    .in('test_attempt_id', attemptIds.slice(0, 500))
    .eq('evaluation_status', 'published')
    .not('final_score', 'is', null);

  const evalMap = new Map((evals || []).map(e => [e.test_attempt_id, Number(e.final_score) || 0]));

  // Aggregate per user
  const userStats: Record<string, { attempts: number; scoreSum: number; scoreCount: number; timeSum: number }> = {};

  for (const a of filtered) {
    if (!userStats[a.user_id]) {
      userStats[a.user_id] = { attempts: 0, scoreSum: 0, scoreCount: 0, timeSum: 0 };
    }
    const us = userStats[a.user_id];
    us.attempts++;
    us.timeSum += a.time_taken_seconds || 0;

    const evalScore = evalMap.get(a.id);
    if (evalScore !== undefined) {
      us.scoreSum += evalScore;
      us.scoreCount++;
    } else if (a.score != null && a.score > 0) {
      us.scoreSum += a.score;
      us.scoreCount++;
    }
  }

  return Object.entries(userStats)
    .map(([userId, s]) => {
      const p = profileMap.get(userId);
      const name = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unknown';
      return {
        name,
        email: p?.email || '—',
        attempts: s.attempts,
        avgScore: s.scoreCount > 0 ? Math.round(s.scoreSum / s.scoreCount) : 0,
        totalTimeMinutes: Math.round(s.timeSum / 60),
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}
