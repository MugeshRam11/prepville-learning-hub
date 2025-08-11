-- Restrict public read access on study_groups_users to only the current user and users who share a group with them
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view all study group users" ON public.study_groups_users;

-- Create scoped visibility policy
CREATE POLICY "Users can view themselves and shared group users"
ON public.study_groups_users
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm1
    JOIN public.group_members gm2 
      ON gm2.group_id = gm1.group_id 
     AND gm2.is_active = true 
     AND gm2.user_id = study_groups_users.user_id
    WHERE gm1.user_id = auth.uid()
      AND gm1.is_active = true
  )
);
