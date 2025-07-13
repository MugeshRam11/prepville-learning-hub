
-- First, let's check if a profile exists for the current admin user
-- If not, we'll insert one with admin role
INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@studyhub.com'),
  'admin@studyhub.com',
  'Admin',
  'User',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = 'admin@studyhub.com';
