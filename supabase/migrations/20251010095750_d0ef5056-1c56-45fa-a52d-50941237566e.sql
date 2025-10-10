-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (BEFORE policies that use it)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Now create policies that use the function
-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop the existing user_progress_summary view
DROP VIEW IF EXISTS public.user_progress_summary;

-- Create secured view with security_invoker
CREATE OR REPLACE VIEW public.user_progress_summary 
WITH (security_invoker = true) AS
SELECT 
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  p.created_at,
  COALESCE(ux.total_xp, 0) as total_xp,
  COALESCE(ux.current_level, 1) as current_level,
  COALESCE(
    (SELECT MAX(best_streak) FROM public.user_streaks WHERE user_id = p.id),
    0
  ) as longest_streak,
  COALESCE(
    (SELECT MAX(last_activity_date) FROM public.user_streaks WHERE user_id = p.id),
    NULL
  ) as last_activity_date,
  COALESCE(
    (SELECT COUNT(*) FROM public.test_attempts WHERE user_id = p.id),
    0
  ) as total_tests_taken,
  COALESCE(
    (SELECT ROUND(AVG(CASE WHEN total_questions > 0 THEN score * 100.0 / total_questions ELSE 0 END), 2)
     FROM public.test_attempts WHERE user_id = p.id),
    0
  ) as avg_score_percentage,
  COALESCE(
    (SELECT MAX(login_at) FROM public.user_sessions WHERE user_id = p.id),
    NULL
  ) as last_login
FROM public.profiles p
LEFT JOIN public.user_xp ux ON ux.user_id = p.id;

-- Update profiles policy to include admin check using has_role
DROP POLICY IF EXISTS "Users can view own progress summary" ON public.profiles;
CREATE POLICY "Users can view own progress or admins view all"
ON public.profiles
FOR SELECT
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));