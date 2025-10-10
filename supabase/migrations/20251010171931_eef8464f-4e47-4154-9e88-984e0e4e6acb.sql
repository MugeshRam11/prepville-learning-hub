-- Create user question progress table
CREATE TABLE IF NOT EXISTS public.user_question_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  is_solved BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  user_answer TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  solved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.user_question_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own question progress"
  ON public.user_question_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question progress"
  ON public.user_question_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question progress"
  ON public.user_question_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_user_question_progress_user_id ON public.user_question_progress(user_id);
CREATE INDEX idx_user_question_progress_question_id ON public.user_question_progress(question_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_question_progress;