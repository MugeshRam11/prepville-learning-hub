
-- Add new onboarding fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_phone text,
ADD COLUMN IF NOT EXISTS institution_name text,
ADD COLUMN IF NOT EXISTS parent_name text,
ADD COLUMN IF NOT EXISTS parent_phone text,
ADD COLUMN IF NOT EXISTS parent_email text,
ADD COLUMN IF NOT EXISTS signup_method text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS student_email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  otp_code text NOT NULL,
  otp_type text NOT NULL CHECK (otp_type IN ('student_email', 'parent_email')),
  is_verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own OTPs" ON public.otp_verifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to OTPs" ON public.otp_verifications
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-generate student_id function
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
  new_student_id text;
BEGIN
  IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN student_id ~ '^TPV[0-9]+$' 
        THEN CAST(SUBSTRING(student_id FROM 4) AS integer) 
        ELSE 0 END
    ), 0) + 1 INTO next_num FROM public.profiles;
    NEW.student_id := 'TPV' || LPAD(next_num::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_student_id ON public.profiles;
CREATE TRIGGER trigger_generate_student_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_student_id();
