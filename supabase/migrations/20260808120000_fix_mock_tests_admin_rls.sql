-- Migration: Fix Admin RLS policies comparing user_role enum to text string

-- 1. Update has_role helper function to check both user_roles and profiles tables safely with text casting
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role::text = _role::text
  );
$$;

-- 2. Fix mock_tests RLS policy
DROP POLICY IF EXISTS "Admins can manage all mock tests" ON public.mock_tests;
CREATE POLICY "Admins can manage all mock tests" ON public.mock_tests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix mock_questions RLS policy
DROP POLICY IF EXISTS "Admins can manage all mock questions" ON public.mock_questions;
CREATE POLICY "Admins can manage all mock questions" ON public.mock_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix mock_sub_questions RLS policy
DROP POLICY IF EXISTS "Admins can manage all mock sub questions" ON public.mock_sub_questions;
CREATE POLICY "Admins can manage all mock sub questions" ON public.mock_sub_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Fix subject_questions RLS policies
DROP POLICY IF EXISTS "Admins can manage all subject questions" ON public.subject_questions;
CREATE POLICY "Admins can manage all subject questions" ON public.subject_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all subject questions" ON public.subject_questions;
CREATE POLICY "Admins can view all subject questions" ON public.subject_questions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Fix legacy tables RLS policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage tests" ON public.tests;
CREATE POLICY "Admins can manage tests" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all attempts" ON public.test_attempts;
CREATE POLICY "Admins can view all attempts" ON public.test_attempts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all answers" ON public.user_answers;
CREATE POLICY "Admins can view all answers" ON public.user_answers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
