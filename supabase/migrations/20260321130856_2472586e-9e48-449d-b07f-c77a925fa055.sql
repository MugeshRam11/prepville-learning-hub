
-- Fix overly permissive RLS policy on otp_verifications
DROP POLICY IF EXISTS "Service role full access to OTPs" ON public.otp_verifications;

-- Allow authenticated users to insert their own OTPs  
CREATE POLICY "Users can insert own OTPs" ON public.otp_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own OTPs
CREATE POLICY "Users can read own OTPs" ON public.otp_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Drop the overly broad ALL policy and replace with specific ones
DROP POLICY IF EXISTS "Users can manage their own OTPs" ON public.otp_verifications;

CREATE POLICY "Users can update own OTPs" ON public.otp_verifications
  FOR UPDATE USING (auth.uid() = user_id);
