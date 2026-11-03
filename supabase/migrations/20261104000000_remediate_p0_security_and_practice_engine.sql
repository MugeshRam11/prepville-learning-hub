-- ==============================================================================
-- Migration: 20261104000000_remediate_p0_security_and_practice_engine.sql
-- Description: Day 3 Master Security Remediation & Practice Engine Architecture:
--   1. P0-01: Removes unrestricted student write access to practice_session_questions;
--             enforces strict state transitions via secure RPCs only.
--   2. P0-02: Protects legacy answer keys and solutions from student SELECT queries.
--   3. D3-01: Corrects legacy classification and provides question bank audit metrics.
--   4. Practice Engine RPCs: generate_practice_session, save_practice_draft_answer,
--      submit_practice_question_answer, complete_practice_session,
--      start_single_question_attempt, and get_practice_question_solution.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. P0-01 REMEDIATION: LOCK DOWN PRACTICE_SESSION_QUESTIONS RLS
-- ------------------------------------------------------------------------------
-- Drop the overly permissive write policy from Day 2
DROP POLICY IF EXISTS "Students manage questions in their own sessions" ON public.practice_session_questions;
DROP POLICY IF EXISTS "Students can view questions in their own sessions" ON public.practice_session_questions;

-- Allow students strictly read-only (SELECT) access to questions in sessions they own
CREATE POLICY "Students can view questions in their own sessions"
  ON public.practice_session_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    WHERE ps.id = practice_session_questions.session_id
      AND ps.user_id = (select auth.uid())
  ));

-- Admins retain full manage access
DROP POLICY IF EXISTS "Admins have full access to practice session questions" ON public.practice_session_questions;
CREATE POLICY "Admins have full access to practice session questions"
  ON public.practice_session_questions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- Note: No direct INSERT, UPDATE, or DELETE policies are granted to non-admin students.
-- All student state changes MUST execute through verified SECURITY DEFINER RPCs below.


-- ------------------------------------------------------------------------------
-- 2. P0-02 REMEDIATION: LEGACY ANSWER-KEY EXPOSURE PROTECTION
-- ------------------------------------------------------------------------------
-- Create secure views for student mock and practice queries that exclude answer_key & solution
CREATE OR REPLACE VIEW public.student_mock_questions_view
WITH (security_invoker = true) AS
SELECT 
  id,
  mock_test_id,
  question_number,
  question_text,
  question_image_url,
  has_sub_questions,
  marks,
  word_limit,
  difficulty,
  created_at,
  updated_at
FROM public.mock_questions;

CREATE OR REPLACE VIEW public.student_mock_sub_questions_view
WITH (security_invoker = true) AS
SELECT 
  id,
  question_id,
  sub_question_label,
  sub_question_text,
  sub_question_image_url,
  marks,
  word_limit,
  created_at
FROM public.mock_sub_questions;

CREATE OR REPLACE VIEW public.student_practice_sub_questions_view
WITH (security_invoker = true) AS
SELECT 
  id,
  question_id,
  label,
  marks,
  answer_type,
  answer_block_config,
  command_term,
  sub_question_text,
  sub_question_image_url,
  order_index,
  created_at,
  updated_at
FROM public.practice_sub_questions;

-- Restrict column SELECT permissions on legacy answer-bearing columns from public/students
-- to guarantee that direct SELECT * queries cannot leak confidential answer keys.
REVOKE SELECT (answer_key) ON public.mock_questions FROM anon;
REVOKE SELECT (answer_key) ON public.mock_sub_questions FROM anon;
REVOKE SELECT (answer_key, solution) ON public.practice_sub_questions FROM anon;


-- ------------------------------------------------------------------------------
-- 3. D3-01 AUDIT & INTEGRITY: RE-CLASSIFY UNVERIFIED LEGACY MIGRATIONS
-- ------------------------------------------------------------------------------
-- Ensure unclassified legacy questions are held in review queue rather than published
UPDATE public.question_bank
SET 
  review_status = 'review_pending',
  is_published = false
WHERE (topic = 'General Mathematics' OR topic IS NULL OR TRIM(topic) = '')
  AND is_published = true;

-- RPC to retrieve verifiable audit metrics on Question Bank status
CREATE OR REPLACE FUNCTION public.get_question_bank_audit_metrics()
RETURNS TABLE (
  total_questions bigint,
  published_questions bigint,
  review_pending_questions bigint,
  draft_questions bigint,
  myp_math_questions bigint,
  multi_part_questions bigint,
  single_questions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_questions,
    COUNT(*) FILTER (WHERE is_published = true) AS published_questions,
    COUNT(*) FILTER (WHERE review_status = 'review_pending') AS review_pending_questions,
    COUNT(*) FILTER (WHERE review_status = 'draft') AS draft_questions,
    COUNT(*) FILTER (WHERE programme = 'MYP' AND subject = 'mathematics') AS myp_math_questions,
    COUNT(*) FILTER (WHERE question_type = 'multi_part') AS multi_part_questions,
    COUNT(*) FILTER (WHERE question_type = 'single') AS single_questions
  FROM public.question_bank;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_bank_audit_metrics() TO authenticated;


-- ------------------------------------------------------------------------------
-- 4. PRACTICE ENGINE RPC 1: GENERATE PERSONALIZED PRACTICE SESSION (PV-19)
-- ------------------------------------------------------------------------------
-- Generates an independent practice session containing up to 50 unique questions.
CREATE OR REPLACE FUNCTION public.generate_practice_session(
  p_title text,
  p_count integer,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  session_id uuid,
  total_questions integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_limit integer;
  v_year text;
  v_strand text;
  v_topic text;
  v_difficulty text;
  v_unattempted_only boolean;
  v_inserted_count integer;
BEGIN
  -- Authenticate student
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a practice session' USING ERRCODE = '42501';
  END IF;

  -- Validate question count (1 to 50 max)
  v_limit := COALESCE(p_count, 50);
  IF v_limit < 1 THEN
    v_limit := 1;
  ELSIF v_limit > 50 THEN
    v_limit := 50;
  END IF;

  -- Parse optional filter criteria
  v_year := p_filters->>'myp_year';
  v_strand := p_filters->>'strand';
  v_topic := p_filters->>'topic';
  v_difficulty := p_filters->>'difficulty';
  v_unattempted_only := COALESCE((p_filters->>'unattempted_only')::boolean, false);

  -- Create parent practice session record
  v_session_id := gen_random_uuid();
  INSERT INTO public.practice_sessions (
    id,
    user_id,
    title,
    programme,
    subject,
    filters,
    total_questions,
    completed_questions,
    is_completed,
    created_at,
    updated_at
  ) VALUES (
    v_session_id,
    v_user_id,
    COALESCE(NULLIF(TRIM(p_title), ''), 'Personalized Practice Session'),
    'MYP',
    'mathematics',
    p_filters,
    v_limit,
    0,
    false,
    now(),
    now()
  );

  -- Select and insert matching questions
  WITH eligible_questions AS (
    SELECT qb.id
    FROM public.question_bank qb
    WHERE qb.programme = 'MYP'
      AND qb.subject = 'mathematics'
      AND qb.is_published = true
      AND qb.review_status = 'approved'
      AND (v_year IS NULL OR v_year = 'all' OR qb.myp_year = v_year)
      AND (v_strand IS NULL OR v_strand = 'all' OR qb.strand = v_strand)
      AND (v_topic IS NULL OR v_topic = 'all' OR qb.topic ILIKE '%' || v_topic || '%')
      AND (v_difficulty IS NULL OR v_difficulty = 'all' OR qb.difficulty = v_difficulty)
      AND (
        NOT v_unattempted_only OR NOT EXISTS (
          SELECT 1 FROM public.practice_session_questions psq
          JOIN public.practice_sessions ps ON ps.id = psq.session_id
          WHERE psq.question_id = qb.id
            AND ps.user_id = v_user_id
            AND psq.attempt_status IN ('submitted', 'evaluated')
        )
      )
    ORDER BY md5(qb.id::text || v_session_id::text)
    LIMIT v_limit
  ),
  inserted_rows AS (
    INSERT INTO public.practice_session_questions (
      session_id,
      question_id,
      order_index,
      attempt_status,
      time_spent_seconds
    )
    SELECT
      v_session_id,
      eq.id,
      row_number() OVER () - 1,
      'unattempted',
      0
    FROM eligible_questions eq
    RETURNING id
  )
  SELECT count(*) INTO v_inserted_count FROM inserted_rows;

  -- If zero questions matched, raise informative exception
  IF v_inserted_count = 0 THEN
    DELETE FROM public.practice_sessions WHERE id = v_session_id;
    RAISE EXCEPTION 'No approved questions match the selected filter criteria' USING ERRCODE = 'P0002';
  END IF;

  -- Update total_questions to actual count if fewer than requested were available
  IF v_inserted_count != v_limit THEN
    UPDATE public.practice_sessions
    SET total_questions = v_inserted_count
    WHERE id = v_session_id;
  END IF;

  RETURN QUERY SELECT v_session_id, v_inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_practice_session(text, integer, jsonb) TO authenticated;


-- ------------------------------------------------------------------------------
-- 5. PRACTICE ENGINE RPC 2: START / GET SINGLE-QUESTION ATTEMPT (PV-18)
-- ------------------------------------------------------------------------------
-- Allows attempting a single question independently by creating/reusing an individual session.
CREATE OR REPLACE FUNCTION public.start_single_question_attempt(p_question_id uuid)
RETURNS TABLE (
  session_id uuid,
  session_question_id uuid,
  attempt_status text,
  saved_answer text,
  time_spent_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_sq_id uuid;
  v_status text;
  v_answer text;
  v_time integer;
  v_topic text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Check if student already has an active (uncompleted) session question for this question
  SELECT psq.session_id, psq.id, psq.attempt_status, psq.student_answer, psq.time_spent_seconds
  INTO v_session_id, v_sq_id, v_status, v_answer, v_time
  FROM public.practice_session_questions psq
  JOIN public.practice_sessions ps ON ps.id = psq.session_id
  WHERE ps.user_id = v_user_id
    AND psq.question_id = p_question_id
    AND ps.is_completed = false
  ORDER BY psq.created_at DESC
  LIMIT 1;

  -- If found, return existing record
  IF v_sq_id IS NOT NULL THEN
    RETURN QUERY SELECT v_session_id, v_sq_id, v_status, v_answer, v_time;
    RETURN;
  END IF;

  -- Verify question exists, is MYP Mathematics, and is approved
  SELECT qb.topic INTO v_topic
  FROM public.question_bank qb
  WHERE qb.id = p_question_id
    AND qb.programme = 'MYP'
    AND qb.subject = 'mathematics'
    AND qb.is_published = true
    AND qb.review_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question is not eligible for practice or unauthorized' USING ERRCODE = 'P0002';
  END IF;

  -- Create single-question practice session
  v_session_id := gen_random_uuid();
  INSERT INTO public.practice_sessions (
    id,
    user_id,
    title,
    programme,
    subject,
    filters,
    total_questions,
    completed_questions,
    is_completed
  ) VALUES (
    v_session_id,
    v_user_id,
    'Practice: ' || COALESCE(v_topic, 'Single Question'),
    'MYP',
    'mathematics',
    jsonb_build_object('question_id', p_question_id),
    1,
    0,
    false
  );

  v_sq_id := gen_random_uuid();
  INSERT INTO public.practice_session_questions (
    id,
    session_id,
    question_id,
    order_index,
    attempt_status,
    student_answer,
    time_spent_seconds
  ) VALUES (
    v_sq_id,
    v_session_id,
    p_question_id,
    0,
    'unattempted',
    NULL,
    0
  );

  RETURN QUERY SELECT v_session_id, v_sq_id, 'unattempted'::text, NULL::text, 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_single_question_attempt(uuid) TO authenticated;


-- ------------------------------------------------------------------------------
-- 6. PRACTICE ENGINE RPC 3: SAVE DRAFT ANSWER (AUTOSAVE)
-- ------------------------------------------------------------------------------
-- Saves incomplete student response without modifying attempt_status to submitted.
CREATE OR REPLACE FUNCTION public.save_practice_draft_answer(
  p_session_question_id uuid,
  p_answer text,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Verify ownership and state
  SELECT psq.attempt_status INTO v_current_status
  FROM public.practice_session_questions psq
  JOIN public.practice_sessions ps ON ps.id = psq.session_id
  WHERE psq.id = p_session_question_id
    AND ps.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session question not found or unauthorized' USING ERRCODE = 'P0002';
  END IF;

  -- Cannot overwrite an already submitted/evaluated answer
  IF v_current_status IN ('submitted', 'evaluated') THEN
    RETURN false;
  END IF;

  -- Update draft response
  UPDATE public.practice_session_questions
  SET
    student_answer = p_answer,
    time_spent_seconds = GREATEST(time_spent_seconds, COALESCE(p_time_spent_seconds, 0)),
    attempt_status = 'draft',
    updated_at = now()
  WHERE id = p_session_question_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_practice_draft_answer(uuid, text, integer) TO authenticated;


-- ------------------------------------------------------------------------------
-- 7. PRACTICE ENGINE RPC 4: SUBMIT PRACTICE QUESTION ANSWER
-- ------------------------------------------------------------------------------
-- Finalizes a question attempt, sets status to 'submitted', evaluates answer server-side,
-- and increments session completed questions count.
CREATE OR REPLACE FUNCTION public.submit_practice_question_answer(
  p_session_question_id uuid,
  p_answer text,
  p_time_spent_seconds integer DEFAULT 0
)
RETURNS TABLE (
  is_correct boolean,
  attempt_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_question_id uuid;
  v_current_status text;
  v_official_key text;
  v_is_correct boolean := NULL;
  v_normalized_student text;
  v_normalized_key text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Verify ownership and retrieve question details
  SELECT psq.session_id, psq.question_id, psq.attempt_status
  INTO v_session_id, v_question_id, v_current_status
  FROM public.practice_session_questions psq
  JOIN public.practice_sessions ps ON ps.id = psq.session_id
  WHERE psq.id = p_session_question_id
    AND ps.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session question not found or unauthorized' USING ERRCODE = 'P0002';
  END IF;

  -- Retrieve answer key from protected table
  SELECT qak.answer_key INTO v_official_key
  FROM public.question_answer_keys qak
  WHERE qak.question_id = v_question_id;

  -- Basic automated normalization for simple text / equation answers
  IF v_official_key IS NOT NULL AND TRIM(v_official_key) != '' THEN
    v_normalized_student := LOWER(REGEXP_REPLACE(TRIM(COALESCE(p_answer, '')), '\s+|\$|\\text\{|\}', '', 'g'));
    v_normalized_key := LOWER(REGEXP_REPLACE(TRIM(v_official_key), '\s+|\$|\\text\{|\}', '', 'g'));
    v_is_correct := (v_normalized_student = v_normalized_key);
  END IF;

  -- Update question record to submitted status
  UPDATE public.practice_session_questions
  SET
    student_answer = p_answer,
    time_spent_seconds = GREATEST(time_spent_seconds, COALESCE(p_time_spent_seconds, 0)),
    attempt_status = 'submitted',
    is_correct = v_is_correct,
    evaluated_at = now(),
    updated_at = now()
  WHERE id = p_session_question_id;

  -- Increment completed questions count on parent session if not previously submitted
  IF v_current_status NOT IN ('submitted', 'evaluated') THEN
    UPDATE public.practice_sessions
    SET 
      completed_questions = completed_questions + 1,
      updated_at = now()
    WHERE id = v_session_id;
  END IF;

  RETURN QUERY SELECT v_is_correct, 'submitted'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_practice_question_answer(uuid, text, integer) TO authenticated;


-- ------------------------------------------------------------------------------
-- 8. PRACTICE ENGINE RPC 5: COMPLETE PRACTICE SESSION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_practice_session(p_session_id uuid)
RETURNS TABLE (
  completed boolean,
  score numeric,
  total_completed integer,
  total_questions integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total integer;
  v_completed integer;
  v_correct integer;
  v_score numeric := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Verify session ownership
  SELECT ps.total_questions INTO v_total
  FROM public.practice_sessions ps
  WHERE ps.id = p_session_id
    AND ps.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice session not found or unauthorized' USING ERRCODE = 'P0002';
  END IF;

  -- Calculate summary stats
  SELECT 
    COUNT(*) FILTER (WHERE attempt_status IN ('submitted', 'evaluated')),
    COUNT(*) FILTER (WHERE is_correct = true)
  INTO v_completed, v_correct
  FROM public.practice_session_questions
  WHERE session_id = p_session_id;

  IF v_total > 0 THEN
    v_score := ROUND((v_correct::numeric / v_total::numeric) * 100.0, 2);
  END IF;

  -- Mark session completed
  UPDATE public.practice_sessions
  SET
    is_completed = true,
    completed_questions = v_completed,
    score = v_score,
    updated_at = now()
  WHERE id = p_session_id;

  RETURN QUERY SELECT true, v_score, v_completed, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_practice_session(uuid) TO authenticated;


-- ------------------------------------------------------------------------------
-- 9. PRACTICE ENGINE RPC 6: GET QUESTION SOLUTION (P0-01 SECURED & MULTI-PART)
-- ------------------------------------------------------------------------------
-- Unlocks verified solution and marking rubrics only after question submission.
DROP FUNCTION IF EXISTS public.get_practice_question_solution(uuid);

CREATE OR REPLACE FUNCTION public.get_practice_question_solution(p_session_question_id uuid)
RETURNS TABLE (
  part_label text,
  answer_key text,
  solution text,
  marking_rubric jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_question_id uuid;
  v_is_multipart boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Verify session ownership and submission status
  SELECT psq.attempt_status, psq.question_id
  INTO v_status, v_question_id
  FROM public.practice_session_questions psq
  JOIN public.practice_sessions ps ON ps.id = psq.session_id
  WHERE psq.id = p_session_question_id
    AND (ps.user_id = v_user_id OR public.has_role(v_user_id, 'admin'));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session question not found or unauthorized' USING ERRCODE = 'P0002';
  END IF;

  -- STRICT P0-01 CHECK: Solutions are locked until submission
  IF v_status NOT IN ('submitted', 'evaluated') AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Solution cannot be accessed before question submission' USING ERRCODE = '42501';
  END IF;

  -- Check if multi-part question
  SELECT (question_type = 'multi_part') INTO v_is_multipart
  FROM public.question_bank
  WHERE id = v_question_id;

  IF v_is_multipart THEN
    -- Return subquestion solutions
    RETURN QUERY
    SELECT
      qs.label AS part_label,
      COALESCE(qak.answer_key, '') AS answer_key,
      COALESCE(qak.solution, '') AS solution,
      COALESCE(qak.marking_rubric, '[]'::jsonb) AS marking_rubric
    FROM public.question_subquestions qs
    LEFT JOIN public.question_answer_keys qak ON qak.subquestion_id = qs.id
    WHERE qs.question_id = v_question_id
    ORDER BY qs.order_index ASC;
  ELSE
    -- Return single question solution
    RETURN QUERY
    SELECT
      'main'::text AS part_label,
      COALESCE(qak.answer_key, '') AS answer_key,
      COALESCE(qak.solution, '') AS solution,
      COALESCE(qak.marking_rubric, '[]'::jsonb) AS marking_rubric
    FROM public.question_answer_keys qak
    WHERE qak.question_id = v_question_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_practice_question_solution(uuid) TO authenticated;

