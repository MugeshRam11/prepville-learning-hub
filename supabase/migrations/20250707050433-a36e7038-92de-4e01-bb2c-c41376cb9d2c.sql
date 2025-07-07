
-- Set the admin@studyhub.com user to have admin role
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'admin@studyhub.com';
