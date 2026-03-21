
-- Add is_archived column to mock_tests for soft archive support
ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Add DELETE policy for admins on mock_tests (currently only ALL policy exists which should cover it,
-- but let's ensure admin_exam_actions also allows delete)
DROP POLICY IF EXISTS "Admins can delete actions" ON public.admin_exam_actions;
CREATE POLICY "Admins can delete actions" ON public.admin_exam_actions FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for exam_sessions
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.exam_sessions;
CREATE POLICY "Admins can delete sessions" ON public.exam_sessions FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
