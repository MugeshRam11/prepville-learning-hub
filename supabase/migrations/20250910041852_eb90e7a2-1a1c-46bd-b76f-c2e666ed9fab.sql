-- Add admin RLS policies for tests and questions (no IF NOT EXISTS)

-- Tests: Admins can perform all operations
CREATE POLICY "Admins can manage all tests"
ON public.tests
FOR ALL
USING (public.get_current_user_role() = 'admin'::user_role)
WITH CHECK (public.get_current_user_role() = 'admin'::user_role);

-- Questions: Admins can perform all operations
CREATE POLICY "Admins can manage all questions"
ON public.questions
FOR ALL
USING (public.get_current_user_role() = 'admin'::user_role)
WITH CHECK (public.get_current_user_role() = 'admin'::user_role);
