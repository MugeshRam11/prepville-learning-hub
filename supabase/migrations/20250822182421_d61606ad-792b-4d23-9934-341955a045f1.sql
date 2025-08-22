-- Create user_xp table to track user experience points and levels
CREATE TABLE public.user_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create xp_activities table to track XP-earning activities
CREATE TABLE public.xp_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'streak_maintain', 'question_correct', 'quiz_complete', etc.
  xp_earned INTEGER NOT NULL,
  activity_data JSONB, -- Additional data about the activity
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for user_xp
CREATE POLICY "Users can view their own XP data" 
ON public.user_xp 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP data" 
ON public.user_xp 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP data" 
ON public.user_xp 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for xp_activities
CREATE POLICY "Users can view their own XP activities" 
ON public.xp_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP activities" 
ON public.xp_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Each level requires: Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450, etc.
  -- Formula: XP needed for level n = (n-1) * 100 + (n-1) * (n-2) * 25
  IF xp < 100 THEN RETURN 1;
  ELSIF xp < 250 THEN RETURN 2;
  ELSIF xp < 450 THEN RETURN 3;
  ELSIF xp < 700 THEN RETURN 4;
  ELSIF xp < 1000 THEN RETURN 5;
  ELSIF xp < 1350 THEN RETURN 6;
  ELSIF xp < 1750 THEN RETURN 7;
  ELSIF xp < 2200 THEN RETURN 8;
  ELSIF xp < 2700 THEN RETURN 9;
  ELSIF xp < 3250 THEN RETURN 10;
  ELSE RETURN 10 + ((xp - 3250) / 500)::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to add XP to user
CREATE OR REPLACE FUNCTION public.add_user_xp(
  p_user_id UUID,
  p_activity_type TEXT,
  p_xp_amount INTEGER,
  p_activity_data JSONB DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_total_xp INTEGER;
  calculated_level INTEGER;
  is_level_up BOOLEAN;
BEGIN
  -- Get current XP and level, or create if doesn't exist
  SELECT total_xp, current_level INTO current_xp, current_level
  FROM public.user_xp 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    current_xp := 0;
    current_level := 1;
    INSERT INTO public.user_xp (user_id, total_xp, current_level)
    VALUES (p_user_id, 0, 1);
  END IF;
  
  -- Calculate new XP and level
  new_total_xp := current_xp + p_xp_amount;
  calculated_level := public.calculate_level_from_xp(new_total_xp);
  is_level_up := calculated_level > current_level;
  
  -- Update user XP
  UPDATE public.user_xp 
  SET total_xp = new_total_xp, 
      current_level = calculated_level,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the activity
  INSERT INTO public.xp_activities (user_id, activity_type, xp_earned, activity_data)
  VALUES (p_user_id, p_activity_type, p_xp_amount, p_activity_data);
  
  RETURN QUERY SELECT new_total_xp, calculated_level, is_level_up;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user level info
CREATE OR REPLACE FUNCTION public.get_user_level_info(p_user_id UUID)
RETURNS TABLE(
  total_xp INTEGER,
  current_level INTEGER,
  xp_for_current_level INTEGER,
  xp_for_next_level INTEGER,
  xp_progress INTEGER,
  level_benefits JSONB
) AS $$
DECLARE
  user_xp INTEGER;
  user_level INTEGER;
  current_level_xp INTEGER;
  next_level_xp INTEGER;
  benefits JSONB;
BEGIN
  -- Get user XP data
  SELECT u.total_xp, u.current_level INTO user_xp, user_level
  FROM public.user_xp u
  WHERE u.user_id = p_user_id;
  
  IF NOT FOUND THEN
    user_xp := 0;
    user_level := 1;
  END IF;
  
  -- Calculate XP thresholds
  IF user_level = 1 THEN current_level_xp := 0;
  ELSIF user_level = 2 THEN current_level_xp := 100;
  ELSIF user_level = 3 THEN current_level_xp := 250;
  ELSIF user_level = 4 THEN current_level_xp := 450;
  ELSIF user_level = 5 THEN current_level_xp := 700;
  ELSIF user_level = 6 THEN current_level_xp := 1000;
  ELSIF user_level = 7 THEN current_level_xp := 1350;
  ELSIF user_level = 8 THEN current_level_xp := 1750;
  ELSIF user_level = 9 THEN current_level_xp := 2200;
  ELSIF user_level = 10 THEN current_level_xp := 2700;
  ELSE current_level_xp := 3250 + ((user_level - 11) * 500);
  END IF;
  
  IF user_level = 1 THEN next_level_xp := 100;
  ELSIF user_level = 2 THEN next_level_xp := 250;
  ELSIF user_level = 3 THEN next_level_xp := 450;
  ELSIF user_level = 4 THEN next_level_xp := 700;
  ELSIF user_level = 5 THEN next_level_xp := 1000;
  ELSIF user_level = 6 THEN next_level_xp := 1350;
  ELSIF user_level = 7 THEN next_level_xp := 1750;
  ELSIF user_level = 8 THEN next_level_xp := 2200;
  ELSIF user_level = 9 THEN next_level_xp := 2700;
  ELSIF user_level = 10 THEN next_level_xp := 3250;
  ELSE next_level_xp := 3250 + ((user_level - 10) * 500);
  END IF;
  
  -- Define level benefits
  benefits := jsonb_build_object(
    'quiz_attempts', CASE 
      WHEN user_level >= 10 THEN 'unlimited'
      WHEN user_level >= 7 THEN '50 per day'
      WHEN user_level >= 5 THEN '30 per day'
      WHEN user_level >= 3 THEN '20 per day'
      ELSE '10 per day'
    END,
    'mock_exams', CASE 
      WHEN user_level >= 8 THEN 'unlimited'
      WHEN user_level >= 5 THEN '10 per week'
      WHEN user_level >= 3 THEN '5 per week'
      ELSE '2 per week'
    END,
    'study_groups', CASE 
      WHEN user_level >= 6 THEN 'create unlimited groups'
      WHEN user_level >= 4 THEN 'create 3 groups'
      WHEN user_level >= 2 THEN 'create 1 group'
      ELSE 'join groups only'
    END,
    'ai_tutor', CASE 
      WHEN user_level >= 9 THEN 'unlimited questions'
      WHEN user_level >= 6 THEN '100 questions per day'
      WHEN user_level >= 4 THEN '50 questions per day'
      WHEN user_level >= 2 THEN '20 questions per day'
      ELSE '5 questions per day'
    END,
    'progress_analytics', CASE 
      WHEN user_level >= 7 THEN 'advanced analytics + predictions'
      WHEN user_level >= 4 THEN 'detailed analytics'
      WHEN user_level >= 2 THEN 'basic analytics'
      ELSE 'limited view'
    END
  );
  
  RETURN QUERY SELECT 
    user_xp,
    user_level,
    current_level_xp,
    next_level_xp,
    user_xp - current_level_xp,
    benefits;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_user_xp_user_id ON public.user_xp(user_id);
CREATE INDEX idx_xp_activities_user_id ON public.xp_activities(user_id);
CREATE INDEX idx_xp_activities_created_at ON public.xp_activities(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_xp_updated_at
BEFORE UPDATE ON public.user_xp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();