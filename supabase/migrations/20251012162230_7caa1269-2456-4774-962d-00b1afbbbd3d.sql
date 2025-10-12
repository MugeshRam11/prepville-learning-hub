-- Fix RLS policies for subject_questions to use profiles.role directly
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all questions" ON public.subject_questions;
DROP POLICY IF EXISTS "Anyone can view published questions" ON public.subject_questions;

-- Create new policies that check profiles.role directly
CREATE POLICY "Admins can manage all subject questions"
ON public.subject_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Anyone can view published subject questions"
ON public.subject_questions
FOR SELECT
TO authenticated
USING (is_published = true);

-- Also allow admins to view unpublished questions
CREATE POLICY "Admins can view all subject questions"
ON public.subject_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);