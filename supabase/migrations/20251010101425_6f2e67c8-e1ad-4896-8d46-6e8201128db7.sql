-- Fix privilege escalation vulnerability by using has_role() instead of get_current_user_role()
-- This ensures all role checks use the secure user_roles table

-- Fix profiles table policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Prevent users from modifying their own role column
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Fix tests table policies
DROP POLICY IF EXISTS "Admins can manage all tests" ON public.tests;
CREATE POLICY "Admins can manage all tests" 
ON public.tests 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix questions table policies
DROP POLICY IF EXISTS "Admins can manage all questions" ON public.questions;
CREATE POLICY "Admins can manage all questions" 
ON public.questions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));