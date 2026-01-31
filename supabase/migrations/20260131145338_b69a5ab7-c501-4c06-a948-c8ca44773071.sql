-- ================================================
-- UNIFIED EXAM FRAMEWORK - Database Schema
-- Additive only, no breaking changes
-- ================================================

-- Exam type enum for unified model
DO $$ BEGIN
  CREATE TYPE exam_type AS ENUM ('MOCK', 'PUZZLE', 'CHALLENGE', 'INTERACTIVE_DEMO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Exam state enum for real-time sync
DO $$ BEGIN
  CREATE TYPE exam_state AS ENUM ('LIVE', 'PAUSED', 'SUBMITTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add unified exam columns to mock_tests (additive)
ALTER TABLE public.mock_tests 
ADD COLUMN IF NOT EXISTS exam_type exam_type DEFAULT 'MOCK',
ADD COLUMN IF NOT EXISTS exam_state exam_state DEFAULT 'LIVE',
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN DEFAULT false;

-- Create exam_sessions table for real-time sync
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  active_session_id TEXT NOT NULL,
  exam_state exam_state DEFAULT 'LIVE',
  current_question_id TEXT,
  current_sub_question_id TEXT,
  time_remaining_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT false,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, user_id)
);

-- Create admin_exam_actions table for audit logging
CREATE TABLE IF NOT EXISTS public.admin_exam_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'PAUSE', 'RESUME', 'FORCE_SUBMIT', 'EXTEND_TIME', 'CANCEL', 'LOCK', 'UNLOCK'
  target_user_id UUID, -- NULL = affects all students
  action_data JSONB, -- e.g., { "extension_minutes": 15 }
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_exam_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.exam_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin access for exam_sessions (read all, update all)
CREATE POLICY "Admins can view all sessions"
  ON public.exam_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update all sessions"
  ON public.exam_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for admin_exam_actions
CREATE POLICY "Admins can insert actions"
  ON public.admin_exam_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can view actions"
  ON public.admin_exam_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Enable realtime for exam_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_exam_actions;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_exam_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_synced_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for exam_sessions
DROP TRIGGER IF EXISTS update_exam_session_timestamp ON public.exam_sessions;
CREATE TRIGGER update_exam_session_timestamp
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exam_session_timestamp();