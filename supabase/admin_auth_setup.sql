-- ==========================================================
-- PREPVILLE ADMIN AUTHENTICATION & JWT ROLE CONFIGURATION SQL
-- ==========================================================
-- This script sets up role-based authentication, custom JWT claims,
-- helper RLS functions, and administrative permissions in Supabase.

-- 1. Create app_role ENUM type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'teacher');
  END IF;
END $$;

-- 2. Ensure role column exists on profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 3. Create user_roles table for multi-role security (if missing)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create Role Verification Function for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check profiles role text column
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND role = _role::text
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check JWT app_metadata claim directly
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = _role::text THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 5. Trigger Function to Inject Admin Role into Supabase Auth JWT App Metadata
CREATE OR REPLACE FUNCTION public.sync_user_jwt_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Retrieve user role from profiles or default to student
  SELECT COALESCE(role, 'student') INTO v_role 
  FROM public.profiles 
  WHERE id = NEW.id;

  -- Update auth.users raw_app_meta_data with the role claim for JWT tokens
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Attach Trigger to Profiles on update or insert
DROP TRIGGER IF EXISTS tr_sync_user_jwt_admin_role ON public.profiles;
CREATE TRIGGER tr_sync_user_jwt_admin_role
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_jwt_admin_role();

-- 6. Helper Procedure to Promote User to Admin (Pass Email)
CREATE OR REPLACE FUNCTION public.make_user_admin(admin_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user ID in auth.users
  SELECT id INTO target_user_id FROM auth.users WHERE email = admin_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users', admin_email;
  END IF;

  -- Update profiles table
  UPDATE public.profiles SET role = 'admin' WHERE id = target_user_id;

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Set JWT app_metadata claim in auth.users
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  WHERE id = target_user_id;
END;
$$;

-- 7. Grant RLS Policies for Admin Access Across Core Tables
-- Allow Admins full CRUD permissions across all system tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Admin full access on %I" ON public.%I;
      CREATE POLICY "Admin full access on %I" ON public.%I
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), ''admin''::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role));
    ', t, t, t, t);
  END LOOP;
END $$;

-- 8. Automatically promote admin@prepville.com if user exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@prepville.com') THEN
    PERFORM public.make_user_admin('admin@prepville.com');
  END IF;
END $$;
