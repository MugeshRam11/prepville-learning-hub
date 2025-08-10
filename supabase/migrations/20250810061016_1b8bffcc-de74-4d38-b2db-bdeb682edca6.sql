-- Enhance user_streaks table and add new streak_milestones table
ALTER TABLE user_streaks 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS streak_start_date DATE DEFAULT CURRENT_DATE;

-- Create streak_milestones table for tracking rewards
CREATE TABLE IF NOT EXISTS public.streak_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_days INTEGER NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reward_xp INTEGER DEFAULT 0,
  reward_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on streak_milestones
ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies for streak_milestones
CREATE POLICY "Users can view their own milestones" 
ON public.streak_milestones 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones" 
ON public.streak_milestones 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to calculate and update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(user_uuid UUID)
RETURNS TABLE(current_streak INTEGER, best_streak INTEGER, is_new_best BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_activity DATE;
  calculated_streak INTEGER := 0;
  current_best INTEGER := 0;
  is_new_record BOOLEAN := false;
  streak_start DATE;
BEGIN
  -- Get current user data
  SELECT last_activity_date, best_streak, streak_start_date 
  INTO last_activity, current_best, streak_start
  FROM user_streaks 
  WHERE user_id = user_uuid 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- If no record exists, create one
  IF last_activity IS NULL THEN
    INSERT INTO user_streaks (user_id, current_streak, best_streak, last_activity_date, streak_start_date)
    VALUES (user_uuid, 1, 1, CURRENT_DATE, CURRENT_DATE);
    RETURN QUERY SELECT 1, 1, true;
    RETURN;
  END IF;
  
  -- Calculate streak based on activity
  IF last_activity = CURRENT_DATE THEN
    -- Same day, keep current streak
    SELECT current_streak INTO calculated_streak 
    FROM user_streaks 
    WHERE user_id = user_uuid 
    ORDER BY created_at DESC 
    LIMIT 1;
  ELSIF last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    SELECT current_streak + 1 INTO calculated_streak 
    FROM user_streaks 
    WHERE user_id = user_uuid 
    ORDER BY created_at DESC 
    LIMIT 1;
  ELSE
    -- Streak broken, reset to 1
    calculated_streak := 1;
    streak_start := CURRENT_DATE;
  END IF;
  
  -- Check if new best
  IF calculated_streak > current_best THEN
    current_best := calculated_streak;
    is_new_record := true;
  END IF;
  
  -- Update or insert streak record
  INSERT INTO user_streaks (
    user_id, 
    current_streak, 
    best_streak, 
    last_activity_date, 
    streak_start_date,
    activity_type
  ) VALUES (
    user_uuid, 
    calculated_streak, 
    current_best, 
    CURRENT_DATE, 
    streak_start,
    'daily_activity'
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    current_streak = calculated_streak,
    best_streak = current_best,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN QUERY SELECT calculated_streak, current_best, is_new_record;
END;
$$;

-- Create function to check milestone achievements
CREATE OR REPLACE FUNCTION public.check_streak_milestones(user_uuid UUID, streak_days INTEGER)
RETURNS TABLE(milestone INTEGER, reward_xp INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  milestone_targets INTEGER[] := ARRAY[7, 14, 21, 30, 60, 100, 365];
  target INTEGER;
  xp_reward INTEGER;
  reward_msg TEXT;
BEGIN
  FOREACH target IN ARRAY milestone_targets
  LOOP
    -- Check if user hit this milestone and hasn't received reward yet
    IF streak_days >= target AND NOT EXISTS (
      SELECT 1 FROM streak_milestones 
      WHERE user_id = user_uuid AND milestone_days = target
    ) THEN
      -- Calculate XP reward
      xp_reward := target * 10;
      
      -- Create reward message
      CASE target
        WHEN 7 THEN reward_msg := '🔥 Week Warrior! 7 days strong!';
        WHEN 14 THEN reward_msg := '⚡ Two Week Champion!';
        WHEN 21 THEN reward_msg := '🎯 Three Week Master!';
        WHEN 30 THEN reward_msg := '🏆 Monthly Legend!';
        WHEN 60 THEN reward_msg := '💎 Diamond Streaker!';
        WHEN 100 THEN reward_msg := '👑 Century Club Member!';
        WHEN 365 THEN reward_msg := '🌟 Year-Long Dedication!';
        ELSE reward_msg := '🎉 Milestone Achieved!';
      END CASE;
      
      -- Insert milestone achievement
      INSERT INTO streak_milestones (user_id, milestone_days, reward_xp, reward_message)
      VALUES (user_uuid, target, xp_reward, reward_msg);
      
      RETURN QUERY SELECT target, xp_reward, reward_msg;
    END IF;
  END LOOP;
END;
$$;