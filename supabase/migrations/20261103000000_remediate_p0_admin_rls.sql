-- ==============================================================================
-- Migration: 20261103000000_remediate_p0_admin_rls.sql
-- Description: Emergency remediation of catastrophic security vulnerability introduced
--              in 20260808120000_fix_mock_tests_admin_rls.sql.
--
-- Vulnerabilities Remediated:
-- 1. Unconditional bypass in has_role() returning `SELECT true;`
-- 2. Permissive policies for `mock_tests`, `mock_questions`, `mock_sub_questions`,
--    `mock_test_sections`, `practice_sets`, `practice_questions`, `practice_sub_questions`
--    with FOR ALL TO authenticated, anon USING (true) WITH CHECK (true).
-- 3. Restores proper RLS isolation: Admins have ALL privileges; public/students have
--    read-only (SELECT) access strictly to published non-archived materials.
-- ==============================================================================

-- 1. Restore secure implementation of has_role() checking real role tables
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role::text = _role
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.role::text = _role
  );
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
        SELECT public.has_role(_user_id, _role::text);
      $func$;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
        SELECT public.has_role(_user_id, _role::text);
      $func$;
    ';
  END IF;
END $$;

-- Revoke execute from anon on role-checking function; allow authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;

-- 2. Drop all insecure permissive policies on Mock Tests and Practice Sets
DROP POLICY IF EXISTS "Admins can manage all mock tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Admins can manage mock tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Admin full access on mock_tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Public can view published mock tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Users can view published mock tests" ON public.mock_tests;

DROP POLICY IF EXISTS "Admins can manage all mock questions" ON public.mock_questions;
DROP POLICY IF EXISTS "Admins can manage mock questions" ON public.mock_questions;
DROP POLICY IF EXISTS "Users can view questions of published tests" ON public.mock_questions;

DROP POLICY IF EXISTS "Admins can manage all mock sub questions" ON public.mock_sub_questions;
DROP POLICY IF EXISTS "Admins can manage mock sub questions" ON public.mock_sub_questions;
DROP POLICY IF EXISTS "Users can view sub questions of published tests" ON public.mock_sub_questions;

DROP POLICY IF EXISTS "Admins can manage mock test sections" ON public.mock_test_sections;
DROP POLICY IF EXISTS "Users can view mock test sections" ON public.mock_test_sections;

DROP POLICY IF EXISTS "Admins can manage all practice sets" ON public.practice_sets;
DROP POLICY IF EXISTS "Users can view published practice sets" ON public.practice_sets;

DROP POLICY IF EXISTS "Admins can manage all practice questions" ON public.practice_questions;
DROP POLICY IF EXISTS "Users can view questions of published sets" ON public.practice_questions;

DROP POLICY IF EXISTS "Admins can manage all practice sub questions" ON public.practice_sub_questions;
DROP POLICY IF EXISTS "Users can view sub questions of published sets" ON public.practice_sub_questions;

-- 3. Re-enable RLS on all affected tables
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_sub_questions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mock_test_sections') THEN
    ALTER TABLE public.mock_test_sections ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sub_questions ENABLE ROW LEVEL SECURITY;

-- 4. Re-establish strict, secure RLS policies for Mock Tests
-- Admins: Full management access
CREATE POLICY "Admins can manage all mock tests"
  ON public.mock_tests FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- Students / Authenticated / Anon: SELECT only if published
CREATE POLICY "Users can view published mock tests"
  ON public.mock_tests FOR SELECT
  TO authenticated, anon
  USING (is_published = true);

-- Mock Questions
CREATE POLICY "Admins can manage all mock questions"
  ON public.mock_questions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Users can view questions of published tests"
  ON public.mock_questions FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.mock_tests mt
    WHERE mt.id = mock_questions.mock_test_id
      AND mt.is_published = true
  ));

-- Mock Sub Questions
CREATE POLICY "Admins can manage all mock sub questions"
  ON public.mock_sub_questions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Users can view sub questions of published tests"
  ON public.mock_sub_questions FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.mock_questions mq
    JOIN public.mock_tests mt ON mt.id = mq.mock_test_id
    WHERE mq.id = mock_sub_questions.question_id
      AND mt.is_published = true
  ));

-- Mock Test Sections (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mock_test_sections') THEN
    EXECUTE '
      CREATE POLICY "Admins can manage mock test sections"
        ON public.mock_test_sections FOR ALL
        TO authenticated
        USING (public.has_role((select auth.uid()), ''admin''))
        WITH CHECK (public.has_role((select auth.uid()), ''admin''));

      CREATE POLICY "Users can view sections of published tests"
        ON public.mock_test_sections FOR SELECT
        TO authenticated, anon
        USING (EXISTS (
          SELECT 1 FROM public.mock_tests mt
          WHERE mt.id = mock_test_sections.mock_test_id
            AND mt.is_published = true
        ));
    ';
  END IF;
END $$;

-- 5. Re-establish strict, secure RLS policies for Legacy Practice Sets
CREATE POLICY "Admins can manage all practice sets"
  ON public.practice_sets FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Users can view published practice sets"
  ON public.practice_sets FOR SELECT
  TO authenticated, anon
  USING (is_published = true AND is_archived = false);

-- Practice Questions
CREATE POLICY "Admins can manage all practice questions"
  ON public.practice_questions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Users can view questions of published sets"
  ON public.practice_questions FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.practice_sets ps
    WHERE ps.id = practice_questions.practice_set_id
      AND ps.is_published = true
      AND ps.is_archived = false
  ));

-- Practice Sub Questions
CREATE POLICY "Admins can manage all practice sub questions"
  ON public.practice_sub_questions FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Users can view sub questions of published sets"
  ON public.practice_sub_questions FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.practice_questions pq
    JOIN public.practice_sets ps ON ps.id = pq.practice_set_id
    WHERE pq.id = practice_sub_questions.question_id
      AND ps.is_published = true
      AND ps.is_archived = false
  ));
