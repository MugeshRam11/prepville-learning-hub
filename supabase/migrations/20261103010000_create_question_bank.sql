-- ==============================================================================
-- Migration: 20261103010000_create_question_bank.sql
-- Description: Creates the canonical Question Bank architecture for PrepVille,
--              supporting independent questions, subquestions, isolated protected
--              answer keys, and personalized practice sessions (up to 50 questions).
-- ==============================================================================

-- 1. Create Question Bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme TEXT NOT NULL DEFAULT 'MYP' CHECK (programme IN ('MYP', 'DP')),
  subject TEXT NOT NULL DEFAULT 'mathematics' CHECK (subject = 'mathematics'),
  myp_year TEXT NOT NULL DEFAULT 'Year 4' CHECK (myp_year IN ('Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5')),
  strand TEXT NOT NULL DEFAULT 'Algebra' CHECK (strand IN ('Number', 'Algebra', 'Geometry and Trigonometry', 'Statistics and Probability')),
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_type TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN ('single', 'multi_part')),
  command_term TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_latex TEXT,
  image_url TEXT,
  marks INTEGER NOT NULL DEFAULT 1 CHECK (marks > 0),
  answer_type TEXT NOT NULL DEFAULT 'text_equation' CHECK (answer_type IN ('text_equation', 'short_answer', 'multiple_choice', 'working_box')),
  answer_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'review_pending', 'approved', 'rejected')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create Question Subquestions table (for multi-part questions)
CREATE TABLE IF NOT EXISTS public.question_subquestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'a',
  marks INTEGER NOT NULL DEFAULT 1 CHECK (marks > 0),
  answer_type TEXT NOT NULL DEFAULT 'text_equation' CHECK (answer_type IN ('text_equation', 'short_answer', 'multiple_choice', 'working_box')),
  answer_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  command_term TEXT,
  sub_question_text TEXT NOT NULL DEFAULT '',
  sub_question_latex TEXT,
  sub_question_image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create Isolated Question Answer Keys table
-- CRITICAL SECURITY: Answer keys, solutions, and marking rubrics are completely isolated
-- from public read access so students cannot inspect solutions prior to submission.
CREATE TABLE IF NOT EXISTS public.question_answer_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
  subquestion_id UUID REFERENCES public.question_subquestions(id) ON DELETE CASCADE,
  answer_key TEXT NOT NULL DEFAULT '',
  solution TEXT,
  marking_rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT chk_answer_key_parent CHECK (
    (question_id IS NOT NULL AND subquestion_id IS NULL) OR
    (question_id IS NULL AND subquestion_id IS NOT NULL)
  ),
  CONSTRAINT uq_question_answer_key_qid UNIQUE (question_id),
  CONSTRAINT uq_question_answer_key_subid UNIQUE (subquestion_id)
);

-- 4. Create Practice Sessions table (dynamic student practice up to 50 questions)
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Personalized Practice Session',
  programme TEXT NOT NULL DEFAULT 'MYP',
  subject TEXT NOT NULL DEFAULT 'mathematics',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_questions INTEGER NOT NULL CHECK (total_questions > 0 AND total_questions <= 50),
  completed_questions INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  score NUMERIC(5,2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create Practice Session Questions table
CREATE TABLE IF NOT EXISTS public.practice_session_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  student_answer TEXT,
  is_correct BOOLEAN DEFAULT NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  attempt_status TEXT NOT NULL DEFAULT 'unattempted' CHECK (attempt_status IN ('unattempted', 'draft', 'submitted', 'evaluated')),
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_session_question UNIQUE (session_id, question_id)
);

-- 6. Indexes for High-Performance Filtering and Pagination
CREATE INDEX IF NOT EXISTS idx_qb_scope ON public.question_bank (programme, subject, is_published, review_status);
CREATE INDEX IF NOT EXISTS idx_qb_filters ON public.question_bank (myp_year, strand, topic, difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_created_by ON public.question_bank (created_by);

CREATE INDEX IF NOT EXISTS idx_qsub_qid ON public.question_subquestions (question_id, order_index);

CREATE INDEX IF NOT EXISTS idx_qak_qid ON public.question_answer_keys (question_id);
CREATE INDEX IF NOT EXISTS idx_qak_subid ON public.question_answer_keys (subquestion_id);

CREATE INDEX IF NOT EXISTS idx_ps_user ON public.practice_sessions (user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_psq_session ON public.practice_session_questions (session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_psq_question ON public.practice_session_questions (question_id);

-- 7. Triggers for updated_at
CREATE TRIGGER update_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_question_subquestions_updated_at
  BEFORE UPDATE ON public.question_subquestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_question_answer_keys_updated_at
  BEFORE UPDATE ON public.question_answer_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_session_questions_updated_at
  BEFORE UPDATE ON public.practice_session_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable Row-Level Security
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_subquestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_session_questions ENABLE ROW LEVEL SECURITY;

-- 9. Row-Level Security Policies

-- question_bank Policies
CREATE POLICY "Admins have full access to question bank"
  ON public.question_bank FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Students and public can view published questions"
  ON public.question_bank FOR SELECT
  TO authenticated, anon
  USING (is_published = true AND review_status = 'approved');

-- question_subquestions Policies
CREATE POLICY "Admins have full access to question subquestions"
  ON public.question_subquestions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Students and public can view published subquestions"
  ON public.question_subquestions FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.question_bank qb
    WHERE qb.id = question_subquestions.question_id
      AND qb.is_published = true
      AND qb.review_status = 'approved'
  ));

-- question_answer_keys Policies
-- SECURITY GUARANTEE: Only Admins can select or modify answer keys directly.
CREATE POLICY "Admins have full access to question answer keys"
  ON public.question_answer_keys FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- practice_sessions Policies
CREATE POLICY "Students manage their own practice sessions"
  ON public.practice_sessions FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all practice sessions"
  ON public.practice_sessions FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- practice_session_questions Policies
CREATE POLICY "Students manage questions in their own sessions"
  ON public.practice_session_questions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    WHERE ps.id = practice_session_questions.session_id
      AND ps.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    WHERE ps.id = practice_session_questions.session_id
      AND ps.user_id = (select auth.uid())
  ));

CREATE POLICY "Admins can view all practice session questions"
  ON public.practice_session_questions FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- 10. Secure RPC Function: Reveal Solution After Verified Submission
-- Prevents pre-submission answer leakage by verifying attempt_status
CREATE OR REPLACE FUNCTION public.get_practice_question_solution(p_session_question_id uuid)
RETURNS TABLE (
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
BEGIN
  -- Authenticate caller
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

  IF v_status NOT IN ('submitted', 'evaluated') AND NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Solution cannot be accessed before question submission' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT qak.answer_key, qak.solution, qak.marking_rubric
  FROM public.question_answer_keys qak
  WHERE qak.question_id = v_question_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_practice_question_solution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_practice_question_solution(uuid) TO authenticated;
