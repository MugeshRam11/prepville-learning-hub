-- Allow admins to manage tests and questions so Quick Test creation works
-- Uses existing get_current_user_role() security definer function

-- Tests: Admins can perform all operations
CREATE POLICY IF NOT EXISTS "Admins can manage all tests"
ON public.tests
FOR ALL
USING (public.get_current_user_role() = 'admin'::user_role)
WITH CHECK (public.get_current_user_role() = 'admin'::user_role);

-- Questions: Admins can perform all operations
CREATE POLICY IF NOT EXISTS "Admins can manage all questions"
ON public.questions
FOR ALL
USING (public.get_current_user_role() = 'admin'::user_role)
WITH CHECK (public.get_current_user_role() = 'admin'::user_role);
