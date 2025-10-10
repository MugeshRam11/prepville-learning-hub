-- Create user_progress table to track overall performance criteria
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_understanding INTEGER DEFAULT 0 CHECK (knowledge_understanding >= 0 AND knowledge_understanding <= 100),
  pattern_recognition INTEGER DEFAULT 0 CHECK (pattern_recognition >= 0 AND pattern_recognition <= 100),
  communication INTEGER DEFAULT 0 CHECK (communication >= 0 AND communication <= 100),
  real_life_applications INTEGER DEFAULT 0 CHECK (real_life_applications >= 0 AND real_life_applications <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create topic_progress table
CREATE TABLE IF NOT EXISTS public.topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_name)
);

-- Create daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL,
  target_count INTEGER DEFAULT 5,
  current_count INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 50,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_name TEXT NOT NULL,
  achievement_icon TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_name)
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for topic_progress
CREATE POLICY "Users can view their own topic progress"
  ON public.topic_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic progress"
  ON public.topic_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topic progress"
  ON public.topic_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for daily_challenges
CREATE POLICY "Users can view their own challenges"
  ON public.daily_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
  ON public.daily_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON public.daily_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();

CREATE TRIGGER update_topic_progress_updated_at
  BEFORE UPDATE ON public.topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();

CREATE TRIGGER update_daily_challenges_updated_at
  BEFORE UPDATE ON public.daily_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();

-- Enable realtime for all tables
ALTER TABLE public.user_progress REPLICA IDENTITY FULL;
ALTER TABLE public.topic_progress REPLICA IDENTITY FULL;
ALTER TABLE public.daily_challenges REPLICA IDENTITY FULL;
ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;