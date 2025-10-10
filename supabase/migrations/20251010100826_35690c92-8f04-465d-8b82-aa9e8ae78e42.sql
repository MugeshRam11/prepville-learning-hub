-- Fix RLS policies to use user_roles table via has_role() function
-- This prevents privilege escalation attacks by ensuring consistent role checking

-- Drop and recreate study_materials policies
DROP POLICY IF EXISTS "Admins can manage all materials" ON public.study_materials;
CREATE POLICY "Admins can manage all materials" 
ON public.study_materials 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate subject_questions policies  
DROP POLICY IF EXISTS "Admins can manage all questions" ON public.subject_questions;
CREATE POLICY "Admins can manage all questions" 
ON public.subject_questions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate mock_tests policies
DROP POLICY IF EXISTS "Admins can manage all mock tests" ON public.mock_tests;
CREATE POLICY "Admins can manage all mock tests" 
ON public.mock_tests 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate mock_questions policies
DROP POLICY IF EXISTS "Admins can manage all mock questions" ON public.mock_questions;
CREATE POLICY "Admins can manage all mock questions" 
ON public.mock_questions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate mock_sub_questions policies
DROP POLICY IF EXISTS "Admins can manage all mock sub questions" ON public.mock_sub_questions;
CREATE POLICY "Admins can manage all mock sub questions" 
ON public.mock_sub_questions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate user_sessions policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));