-- Create AI Tutoring Sessions table
CREATE TABLE IF NOT EXISTS public.ai_tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  subject TEXT NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT,
  student_answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  hints_used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  session_duration_seconds INTEGER,
  difficulty_level TEXT,
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create AI Tutoring Messages table
CREATE TABLE IF NOT EXISTS public.ai_tutoring_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_tutoring_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'hint', 'evaluation', 'encouragement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create AI Tutoring Evaluations table
CREATE TABLE IF NOT EXISTS public.ai_tutoring_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_tutoring_sessions(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  student_answer TEXT NOT NULL,
  evaluation_result TEXT NOT NULL CHECK (evaluation_result IN ('correct', 'partially_correct', 'incorrect')),
  feedback TEXT NOT NULL,
  hint_provided TEXT,
  similarity_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Student Struggle Topics table (for adaptive learning)
CREATE TABLE IF NOT EXISTS public.student_struggle_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  struggle_count INTEGER DEFAULT 1,
  last_struggled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, subject, topic, difficulty_level)
);

-- Enable RLS
ALTER TABLE public.ai_tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutoring_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutoring_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_struggle_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_tutoring_sessions
CREATE POLICY "Users can view their own tutoring sessions"
  ON public.ai_tutoring_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tutoring sessions"
  ON public.ai_tutoring_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutoring sessions"
  ON public.ai_tutoring_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_tutoring_messages
CREATE POLICY "Users can view messages from their sessions"
  ON public.ai_tutoring_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutoring_sessions
      WHERE id = ai_tutoring_messages.session_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their sessions"
  ON public.ai_tutoring_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_tutoring_sessions
      WHERE id = ai_tutoring_messages.session_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for ai_tutoring_evaluations
CREATE POLICY "Users can view their own evaluations"
  ON public.ai_tutoring_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutoring_sessions
      WHERE id = ai_tutoring_evaluations.session_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own evaluations"
  ON public.ai_tutoring_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_tutoring_sessions
      WHERE id = ai_tutoring_evaluations.session_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for student_struggle_topics
CREATE POLICY "Users can view their own struggle topics"
  ON public.student_struggle_topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own struggle topics"
  ON public.student_struggle_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own struggle topics"
  ON public.student_struggle_topics FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all tutoring data
CREATE POLICY "Admins can view all tutoring sessions"
  ON public.ai_tutoring_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all tutoring messages"
  ON public.ai_tutoring_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all evaluations"
  ON public.ai_tutoring_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all struggle topics"
  ON public.student_struggle_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_tutoring_sessions_user_id ON public.ai_tutoring_sessions(user_id);
CREATE INDEX idx_tutoring_sessions_question_id ON public.ai_tutoring_sessions(question_id);
CREATE INDEX idx_tutoring_sessions_created_at ON public.ai_tutoring_sessions(created_at);
CREATE INDEX idx_tutoring_messages_session_id ON public.ai_tutoring_messages(session_id);
CREATE INDEX idx_tutoring_evaluations_session_id ON public.ai_tutoring_evaluations(session_id);
CREATE INDEX idx_struggle_topics_user_id ON public.student_struggle_topics(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_tutoring_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tutoring_sessions_updated_at
  BEFORE UPDATE ON public.ai_tutoring_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tutoring_sessions_updated_at();