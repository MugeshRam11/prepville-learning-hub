-- Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin can view and manage all settings
CREATE POLICY "Admins can view all settings"
  ON public.admin_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings"
  ON public.admin_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON public.admin_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, setting_type, description) VALUES
  ('site_name', '"The Prep Ville"', 'general', 'Platform name'),
  ('site_description', '"Comprehensive EdTech platform for MYP and IBDP students"', 'general', 'Platform description'),
  ('allow_registration', 'true', 'general', 'Allow new user registration'),
  ('default_language', '"en"', 'general', 'Default platform language'),
  ('require_email_verification', 'true', 'security', 'Require email verification for new users'),
  ('maintenance_mode', 'false', 'security', 'Enable maintenance mode'),
  ('auto_approve_users', 'false', 'users', 'Auto-approve new user registrations'),
  ('max_concurrent_sessions', '3', 'users', 'Maximum concurrent sessions per user'),
  ('session_timeout', '30', 'users', 'Session timeout in minutes'),
  ('max_test_duration', '120', 'tests', 'Maximum test duration in minutes'),
  ('default_test_questions', '10', 'tests', 'Default number of questions per test'),
  ('passing_score', '70', 'tests', 'Passing score percentage'),
  ('max_attempts', '3', 'tests', 'Maximum test attempts allowed'),
  ('email_notifications', 'true', 'notifications', 'Enable email notifications'),
  ('sms_notifications', 'false', 'notifications', 'Enable SMS notifications'),
  ('weekly_reports', 'true', 'notifications', 'Enable weekly progress reports'),
  ('admin_email', '"admin@prepville.com"', 'notifications', 'Administrator email address'),
  ('theme', '"light"', 'appearance', 'Platform theme'),
  ('primary_color', '"#0EA5E9"', 'appearance', 'Primary brand color'),
  ('secondary_color', '"#8B5CF6"', 'appearance', 'Secondary brand color')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to get all settings
CREATE OR REPLACE FUNCTION public.get_admin_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_json JSONB := '{}';
BEGIN
  SELECT jsonb_object_agg(setting_key, setting_value)
  INTO settings_json
  FROM public.admin_settings;
  
  RETURN settings_json;
END;
$$;

-- Function to update a setting
CREATE OR REPLACE FUNCTION public.update_admin_setting(
  p_setting_key TEXT,
  p_setting_value JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_settings
  SET setting_value = p_setting_value,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE setting_key = p_setting_key;
  
  RETURN FOUND;
END;
$$;

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_statistics()
RETURNS TABLE(
  total_users BIGINT,
  active_tests BIGINT,
  total_questions BIGINT,
  storage_used NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.tests WHERE is_published = true) as active_tests,
    (SELECT COUNT(*) FROM public.questions) as total_questions,
    45.2 as storage_used; -- Placeholder for storage calculation
END;
$$;