
-- Fix 1: Update profiles.role to 'admin' for the admin user
UPDATE profiles SET role = 'admin' WHERE id = '8be897ac-17c7-4f8e-9c35-5231de91d380';

-- Fix 2: Standardize RLS policies that check profiles.role directly
-- Replace them with has_role() which checks user_roles table (the proper approach)

-- admin_settings: fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert settings" ON admin_settings;
CREATE POLICY "Admins can insert settings" ON admin_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- admin_settings: fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
CREATE POLICY "Admins can update settings" ON admin_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- admin_settings: fix SELECT policy
DROP POLICY IF EXISTS "Admins can view all settings" ON admin_settings;
CREATE POLICY "Admins can view all settings" ON admin_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- admin_exam_actions: fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert actions" ON admin_exam_actions;
CREATE POLICY "Admins can insert actions" ON admin_exam_actions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- admin_exam_actions: fix SELECT policy
DROP POLICY IF EXISTS "Admins can view actions" ON admin_exam_actions;
CREATE POLICY "Admins can view actions" ON admin_exam_actions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- mock_test_question_bank: fix ALL policy
DROP POLICY IF EXISTS "Admins can manage question bank" ON mock_test_question_bank;
CREATE POLICY "Admins can manage question bank" ON mock_test_question_bank FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- mock_test_question_bank: fix SELECT policy
DROP POLICY IF EXISTS "Admins can view question bank" ON mock_test_question_bank;
CREATE POLICY "Admins can view question bank" ON mock_test_question_bank FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- mock_test_sub_question_bank: fix ALL policy
DROP POLICY IF EXISTS "Admins can manage sub-question bank" ON mock_test_sub_question_bank;
CREATE POLICY "Admins can manage sub-question bank" ON mock_test_sub_question_bank FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- mock_test_sub_question_bank: fix SELECT policy
DROP POLICY IF EXISTS "Admins can view sub-question bank" ON mock_test_sub_question_bank;
CREATE POLICY "Admins can view sub-question bank" ON mock_test_sub_question_bank FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_knowledge_base: fix admin ALL policy
DROP POLICY IF EXISTS "Only admins can modify knowledge base" ON ai_knowledge_base;
CREATE POLICY "Only admins can modify knowledge base" ON ai_knowledge_base FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- student_struggle_topics: fix admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all struggle topics" ON student_struggle_topics;
CREATE POLICY "Admins can view all struggle topics" ON student_struggle_topics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_tutoring_evaluations: fix admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all evaluations" ON ai_tutoring_evaluations;
CREATE POLICY "Admins can view all evaluations" ON ai_tutoring_evaluations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_tutoring_messages: fix admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all tutoring messages" ON ai_tutoring_messages;
CREATE POLICY "Admins can view all tutoring messages" ON ai_tutoring_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_tutoring_sessions: fix admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all tutoring sessions" ON ai_tutoring_sessions;
CREATE POLICY "Admins can view all tutoring sessions" ON ai_tutoring_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- exam_sessions: fix admin policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON exam_sessions;
CREATE POLICY "Admins can view all sessions" ON exam_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all sessions" ON exam_sessions;
CREATE POLICY "Admins can update all sessions" ON exam_sessions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
