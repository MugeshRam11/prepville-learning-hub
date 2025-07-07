
-- Add the missing role column back to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'student'::user_role;

-- Update the existing profiles to have the student role by default if they don't have one
UPDATE public.profiles SET role = 'student'::user_role WHERE role IS NULL;

-- Make the role column NOT NULL since it should always have a value
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
