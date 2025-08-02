-- Fix infinite recursion in group_members RLS policies
-- The current policy references group_members within itself, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;

-- Create a new policy that doesn't cause recursion
-- Members can view group membership if they are authenticated
CREATE POLICY "Authenticated users can view group memberships" 
ON public.group_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Alternative: If we want more restrictive access, we can check if user is member of any group
-- But we need to avoid the circular reference by using a different approach
-- CREATE POLICY "Users can view memberships of groups they belong to" 
-- ON public.group_members 
-- FOR SELECT 
-- USING (
--   auth.uid() IN (
--     SELECT user_id FROM group_members gm2 
--     WHERE gm2.group_id = group_members.group_id 
--     AND gm2.is_active = true
--   )
-- );