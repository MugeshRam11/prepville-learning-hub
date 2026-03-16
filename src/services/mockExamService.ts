/**
 * Mock Exam Service Layer
 * 
 * Provides typed functions for the full exam workflow:
 * - Admin: create/publish tests
 * - Student: select/start/autosave/submit
 * - Evaluation: save/publish results
 * - Results: fetch student results
 * 
 * Uses direct Supabase client for CRUD, edge functions for workflow orchestration.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PublishedMockTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  time_limit_minutes: number | null;
  total_questions: number;
  is_published: boolean;
  created_at: string;
}

export interface AttemptAnswer {
  question_id?: string;
  sub_question_id?: string;
  answer_type: string;
  answer_payload: Record<string, any>;
  is_answered: boolean;
}

export interface EvaluationItem {
  question_id?: string;
  sub_question_id?: string;
  marks_awarded: number;
  feedback?: string;
  suggestions?: string;
  ai_suggestions?: Record<string, any>;
}

export interface SaveEvaluationPayload {
  attempt_id: string;
  evaluation_mode: "manual" | "ai" | "hybrid";
  final_score?: number;
  final_feedback?: string;
  question_evaluations?: any[];
  items?: EvaluationItem[];
}

// ─── Student: Test Selection ────────────────────────────────────────────────

export async function getPublishedMockTests(): Promise<PublishedMockTest[]> {
  const { data, error } = await supabase
    .from("mock_tests")
    .select("id, title, subject, topic, time_limit_minutes, total_questions, is_published, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMockTestWithQuestions(testId: string) {
  const [testResult, questionsResult, sectionsResult] = await Promise.all([
    supabase.from("mock_tests").select("*").eq("id", testId).single(),
    supabase
      .from("mock_questions")
      .select("*, mock_sub_questions(*)")
      .eq("mock_test_id", testId)
      .order("question_number"),
    supabase
      .from("mock_test_sections")
      .select("*")
      .eq("mock_test_id", testId)
      .order("section_order"),
  ]);

  if (testResult.error) throw testResult.error;

  return {
    test: testResult.data,
    questions: questionsResult.data || [],
    sections: sectionsResult.data || [],
  };
}

// ─── Student: Attempt Lifecycle ─────────────────────────────────────────────

export async function startAttempt(testId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("test_attempts")
    .insert({
      test_id: testId,
      user_id: user.id,
      total_questions: 0,
      submission_status: "submitted",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function autosaveAnswers(
  attemptId: string,
  answers: Record<string, any>
) {
  const { error } = await supabase
    .from("test_attempts")
    .update({
      answers,
    })
    .eq("id", attemptId);

  if (error) throw error;
}

export async function submitMockTest(
  attemptId: string,
  completedTimeSeconds: number
) {
  const { data, error } = await supabase.functions.invoke("submit-mock-test", {
    body: {
      attempt_id: attemptId,
      completed_time_seconds: completedTimeSeconds,
    },
  });

  if (error) throw error;
  return data;
}

// ─── Student: Results ───────────────────────────────────────────────────────

export async function getStudentAttempts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("test_attempts")
    .select(`
      id,
      test_id,
      submission_status,
      completed_at,
      time_taken_seconds,
      score,
      total_questions,
      mock_tests:test_id (title, subject, topic)
    `)
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStudentResult(attemptId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [attemptResult, evaluationResult, itemsResult] = await Promise.all([
    supabase
      .from("test_attempts")
      .select("*, mock_tests:test_id (title, subject, topic)")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("exam_evaluations")
      .select("*")
      .eq("test_attempt_id", attemptId)
      .eq("student_id", user.id)
      .maybeSingle(),
    supabase
      .from("evaluation_items")
      .select("*")
      .eq("attempt_id", attemptId),
  ]);

  if (attemptResult.error) throw attemptResult.error;

  return {
    attempt: attemptResult.data,
    evaluation: evaluationResult.data,
    items: itemsResult.data || [],
  };
}

// ─── Admin: Evaluation Dashboard ────────────────────────────────────────────

export async function getEvaluationDashboard() {
  const { data, error } = await supabase
    .from("test_attempts")
    .select(`
      id,
      test_id,
      user_id,
      submission_status,
      completed_at,
      time_taken_seconds,
      score,
      total_questions,
      mock_tests:test_id (title, subject, topic),
      profiles:user_id (first_name, last_name, email),
      exam_evaluations!test_attempt_id (
        id,
        evaluation_status,
        evaluation_mode,
        final_score,
        evaluated_at,
        finalized_at
      )
    `)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAttemptForEvaluation(attemptId: string) {
  const [attemptResult, answersResult, evaluationResult, itemsResult] =
    await Promise.all([
      supabase
        .from("test_attempts")
        .select(`
          *,
          mock_tests:test_id (
            *,
            mock_questions (*, mock_sub_questions (*)),
            mock_test_sections (*)
          ),
          profiles:user_id (first_name, last_name, email)
        `)
        .eq("id", attemptId)
        .single(),
      supabase
        .from("user_answers")
        .select("*")
        .eq("attempt_id", attemptId),
      supabase
        .from("exam_evaluations")
        .select("*")
        .eq("test_attempt_id", attemptId)
        .maybeSingle(),
      supabase
        .from("evaluation_items")
        .select("*")
        .eq("attempt_id", attemptId),
    ]);

  if (attemptResult.error) throw attemptResult.error;

  return {
    attempt: attemptResult.data,
    answers: answersResult.data || [],
    evaluation: evaluationResult.data,
    items: itemsResult.data || [],
  };
}

// ─── Admin: Save & Publish Evaluation ───────────────────────────────────────

export async function saveAdminEvaluation(payload: SaveEvaluationPayload) {
  const { data, error } = await supabase.functions.invoke(
    "save-admin-evaluation",
    { body: payload }
  );

  if (error) throw error;
  return data;
}

export async function publishEvaluation(attemptId: string) {
  const { data, error } = await supabase.functions.invoke(
    "publish-evaluation",
    { body: { attempt_id: attemptId } }
  );

  if (error) throw error;
  return data;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function getUnreadNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "evaluating"
  | "ai_evaluated"
  | "manual_review"
  | "published";

export type EvaluationStatus =
  | "pending_review"
  | "ai_evaluated"
  | "pending_review"
  | "finalized";

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_progress: "In Progress",
    submitted: "Submitted",
    evaluating: "Evaluating...",
    ai_evaluated: "AI Evaluated",
    manual_review: "Under Review",
    published: "Published",
    pending_review: "Pending Review",
    finalized: "Finalized",
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-800",
    submitted: "bg-yellow-100 text-yellow-800",
    evaluating: "bg-orange-100 text-orange-800",
    ai_evaluated: "bg-purple-100 text-purple-800",
    manual_review: "bg-indigo-100 text-indigo-800",
    published: "bg-green-100 text-green-800",
    pending_review: "bg-yellow-100 text-yellow-800",
    finalized: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}
