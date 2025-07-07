
-- First, let's make sure the user_role enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'student', 'moderator');
    END IF;
END $$;

-- Update the handle_new_user function to handle the role properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'::user_role)
  );
  RETURN new;
END;
$$;
