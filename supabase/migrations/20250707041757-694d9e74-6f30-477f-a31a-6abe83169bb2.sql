
-- Insert admin user directly into the profiles table
-- Note: This assumes the user will sign up through the normal auth flow first
-- or we can create the auth user and profile together

-- First, let's check if we need to create the auth user entry
-- For now, let's just ensure the profile exists with admin role
INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
VALUES (
  -- Using a fixed UUID for the admin user - this should match what Supabase Auth creates
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@studyhub.com',
  'Admin',
  'User',
  'admin'::user_role,
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::user_role,
  email = 'admin@studyhub.com',
  is_active = true;

-- Alternative approach: Update any existing user with this email to be admin
UPDATE public.profiles 
SET role = 'admin'::user_role, is_active = true 
WHERE email = 'admin@studyhub.com';
