-- =====================================================
-- SECURITY FIX: Drop and recreate policies safely
-- =====================================================

-- PROFILES: Drop ALL existing SELECT policies first
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- PROFILES: Create secure policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- AI KNOWLEDGE BASE: Drop and recreate
DROP POLICY IF EXISTS "Anyone can view knowledge base" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "Public can view knowledge base" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "ai_knowledge_base is publicly readable" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can view knowledge base" ON public.ai_knowledge_base;

CREATE POLICY "Authenticated users can view knowledge base" 
ON public.ai_knowledge_base 
FOR SELECT 
TO authenticated
USING (true);

-- STUDY MATERIALS: Drop and recreate
DROP POLICY IF EXISTS "Anyone can view published materials" ON public.study_materials;
DROP POLICY IF EXISTS "Public can view published study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Authenticated can view published materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins can view all materials" ON public.study_materials;

CREATE POLICY "Authenticated can view published materials" 
ON public.study_materials 
FOR SELECT 
TO authenticated
USING (is_published = true);

CREATE POLICY "Admins can view all materials" 
ON public.study_materials 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- STUDY GROUPS: Drop and recreate
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.study_groups;
DROP POLICY IF EXISTS "Public groups are viewable by anyone" ON public.study_groups;
DROP POLICY IF EXISTS "Authenticated can view public groups" ON public.study_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.study_groups;

CREATE POLICY "Authenticated can view public groups" 
ON public.study_groups 
FOR SELECT 
TO authenticated
USING (is_public = true AND is_active = true);

CREATE POLICY "Members can view their groups" 
ON public.study_groups 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
  )
);

-- Secure function for user progress (views can't have RLS)
DROP FUNCTION IF EXISTS public.get_my_progress_summary();

CREATE OR REPLACE FUNCTION public.get_my_progress_summary()
RETURNS TABLE (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  total_xp bigint,
  current_level integer,
  total_tests_taken bigint,
  avg_score_percentage numeric,
  longest_streak integer,
  last_login timestamptz,
  last_activity_date date,
  created_at timestamptz,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role::text,
    total_xp,
    current_level,
    total_tests_taken,
    avg_score_percentage,
    longest_streak,
    last_login,
    last_activity_date,
    created_at,
    is_active
  FROM public.user_progress_summary
  WHERE user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin');
$$;