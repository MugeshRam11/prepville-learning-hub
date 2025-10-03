-- Create user_sessions table for tracking login/logout
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  logout_at timestamp with time zone,
  session_duration_minutes integer,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_at ON public.user_sessions(login_at DESC);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Allow users to view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions 
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow system to insert sessions
CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions 
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions (for logout)
CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions 
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create view for user progress summary
CREATE OR REPLACE VIEW public.user_progress_summary AS
SELECT 
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  COALESCE(ux.total_xp, 0) as total_xp,
  COALESCE(ux.current_level, 1) as current_level,
  COALESCE(MAX(us.best_streak), 0) as longest_streak,
  MAX(us.last_activity_date) as last_activity_date,
  COUNT(DISTINCT ta.id) as total_tests_taken,
  ROUND(AVG(CASE WHEN ta.total_questions > 0 THEN ta.score * 100.0 / ta.total_questions ELSE 0 END), 2) as avg_score_percentage,
  (SELECT login_at FROM public.user_sessions WHERE user_id = p.id ORDER BY login_at DESC LIMIT 1) as last_login,
  p.created_at
FROM public.profiles p
LEFT JOIN public.user_xp ux ON ux.user_id = p.id
LEFT JOIN public.user_streaks us ON us.user_id = p.id
LEFT JOIN public.test_attempts ta ON ta.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.role, p.is_active, ux.total_xp, ux.current_level, p.created_at;

-- Create function to get user performance by subject
CREATE OR REPLACE FUNCTION public.get_user_performance_by_subject(user_uuid uuid)
RETURNS TABLE(
  subject text,
  tests_taken bigint,
  avg_score numeric,
  total_questions bigint,
  correct_answers bigint,
  accuracy_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(t.test_type::text, 'Unknown') as subject,
    COUNT(DISTINCT ta.id) as tests_taken,
    ROUND(AVG(CASE WHEN ta.total_questions > 0 THEN ta.score * 100.0 / ta.total_questions ELSE 0 END), 2) as avg_score,
    SUM(ta.total_questions) as total_questions,
    SUM(ta.score) as correct_answers,
    ROUND(CASE WHEN SUM(ta.total_questions) > 0 THEN SUM(ta.score) * 100.0 / SUM(ta.total_questions) ELSE 0 END, 2) as accuracy_percentage
  FROM public.test_attempts ta
  LEFT JOIN public.tests t ON t.id = ta.test_id
  WHERE ta.user_id = user_uuid
  GROUP BY t.test_type;
END;
$$;

-- Create function to get user activity timeline
CREATE OR REPLACE FUNCTION public.get_user_activity_timeline(user_uuid uuid, limit_count integer DEFAULT 50)
RETURNS TABLE(
  activity_id uuid,
  activity_type text,
  activity_description text,
  activity_value integer,
  activity_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      xa.id as activity_id,
      xa.activity_type as activity_type,
      COALESCE(xa.description, xa.activity_type) as activity_description,
      xa.xp_gained as activity_value,
      xa.activity_date as activity_date
    FROM public.xp_activities xa
    WHERE xa.user_id = user_uuid
    ORDER BY xa.activity_date DESC
    LIMIT limit_count
  );
END;
$$;