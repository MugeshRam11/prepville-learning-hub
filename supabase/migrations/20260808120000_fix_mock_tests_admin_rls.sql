-- Migration: Fix Admin RLS policies & register type equality operators for user_role and app_role

-- 1. Create equality operator functions for user_role <-> text
CREATE OR REPLACE FUNCTION public.user_role_eq_text(public.user_role, text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT $1::text = $2;
$$;

CREATE OR REPLACE FUNCTION public.text_eq_user_role(text, public.user_role)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT $1 = $2::text;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_operator 
    WHERE oprname = '=' 
    AND oprleft = 'public.user_role'::regtype 
    AND oprright = 'text'::regtype
  ) THEN
    CREATE OPERATOR = (
      LEFTARG = public.user_role,
      RIGHTARG = text,
      PROCEDURE = public.user_role_eq_text,
      COMMUTATOR = =
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_operator 
    WHERE oprname = '=' 
    AND oprleft = 'text'::regtype 
    AND oprright = 'public.user_role'::regtype
  ) THEN
    CREATE OPERATOR = (
      LEFTARG = text,
      RIGHTARG = public.user_role,
      PROCEDURE = public.text_eq_user_role,
      COMMUTATOR = =
    );
  END IF;
END $$;

-- 2. Create equality operator functions for app_role <-> text
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.app_role_eq_text(public.app_role, text)
      RETURNS boolean LANGUAGE sql IMMUTABLE AS $f$ SELECT $1::text = $2; $f$;
      
      CREATE OR REPLACE FUNCTION public.text_eq_app_role(text, public.app_role)
      RETURNS boolean LANGUAGE sql IMMUTABLE AS $f$ SELECT $1 = $2::text; $f$;
    ';

    IF NOT EXISTS (
      SELECT 1 FROM pg_operator 
      WHERE oprname = '=' 
      AND oprleft = 'public.app_role'::regtype 
      AND oprright = 'text'::regtype
    ) THEN
      EXECUTE '
        CREATE OPERATOR = (
          LEFTARG = public.app_role,
          RIGHTARG = text,
          PROCEDURE = public.app_role_eq_text,
          COMMUTATOR = =
        );
      ';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_operator 
      WHERE oprname = '=' 
      AND oprleft = 'text'::regtype 
      AND oprright = 'public.app_role'::regtype
    ) THEN
      EXECUTE '
        CREATE OPERATOR = (
          LEFTARG = text,
          RIGHTARG = public.app_role,
          PROCEDURE = public.text_eq_app_role,
          COMMUTATOR = =
        );
      ';
    END IF;
  END IF;
END $$;

-- 3. Create equality operator functions for user_role <-> app_role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.user_role_eq_app_role(public.user_role, public.app_role)
      RETURNS boolean LANGUAGE sql IMMUTABLE AS $f$ SELECT $1::text = $2::text; $f$;
      
      CREATE OR REPLACE FUNCTION public.app_role_eq_user_role(public.app_role, public.user_role)
      RETURNS boolean LANGUAGE sql IMMUTABLE AS $f$ SELECT $1::text = $2::text; $f$;
    ';

    IF NOT EXISTS (
      SELECT 1 FROM pg_operator 
      WHERE oprname = '=' 
      AND oprleft = 'public.user_role'::regtype 
      AND oprright = 'public.app_role'::regtype
    ) THEN
      EXECUTE '
        CREATE OPERATOR = (
          LEFTARG = public.user_role,
          RIGHTARG = public.app_role,
          PROCEDURE = public.user_role_eq_app_role,
          COMMUTATOR = =
        );
      ';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_operator 
      WHERE oprname = '=' 
      AND oprleft = 'public.app_role'::regtype 
      AND oprright = 'public.user_role'::regtype
    ) THEN
      EXECUTE '
        CREATE OPERATOR = (
          LEFTARG = text,
          RIGHTARG = public.app_role,
          PROCEDURE = public.app_role_eq_user_role,
          COMMUTATOR = =
        );
      ';
    END IF;
  END IF;
END $$;

-- 4. Helper function get_current_user_role returning text safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. Robust has_role helper function accepting text, app_role, or user_role with text casting
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role::text = _role
  );
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
        SELECT public.has_role(_user_id, _role::text);
      $func$;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
        SELECT public.has_role(_user_id, _role::text);
      $func$;
    ';
  END IF;
END $$;

-- 6. Fix mock_tests RLS policies
DROP POLICY IF EXISTS "Admins can manage all mock tests" ON public.mock_tests;
DROP POLICY IF EXISTS "Admins can manage mock tests" ON public.mock_tests;
CREATE POLICY "Admins can manage all mock tests" ON public.mock_tests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Fix mock_questions RLS policies
DROP POLICY IF EXISTS "Admins can manage all mock questions" ON public.mock_questions;
DROP POLICY IF EXISTS "Admins can manage mock questions" ON public.mock_questions;
CREATE POLICY "Admins can manage all mock questions" ON public.mock_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Fix mock_sub_questions RLS policies
DROP POLICY IF EXISTS "Admins can manage all mock sub questions" ON public.mock_sub_questions;
DROP POLICY IF EXISTS "Admins can manage mock sub questions" ON public.mock_sub_questions;
CREATE POLICY "Admins can manage all mock sub questions" ON public.mock_sub_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Fix mock_test_sections RLS policies
DROP POLICY IF EXISTS "Admins can manage mock test sections" ON public.mock_test_sections;
CREATE POLICY "Admins can manage mock test sections" ON public.mock_test_sections
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. Fix practice_sets RLS policies
DROP POLICY IF EXISTS "Admins can manage all practice sets" ON public.practice_sets;
CREATE POLICY "Admins can manage all practice sets" ON public.practice_sets
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. Fix practice_questions RLS policies
DROP POLICY IF EXISTS "Admins can manage all practice questions" ON public.practice_questions;
CREATE POLICY "Admins can manage all practice questions" ON public.practice_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. Fix practice_sub_questions RLS policies
DROP POLICY IF EXISTS "Admins can manage all practice sub questions" ON public.practice_sub_questions;
CREATE POLICY "Admins can manage all practice sub questions" ON public.practice_sub_questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
