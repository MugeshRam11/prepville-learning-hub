-- Fix the add_user_xp function with ambiguous column reference
CREATE OR REPLACE FUNCTION public.add_user_xp(
  user_uuid uuid, 
  xp_amount integer, 
  activity_type text, 
  activity_description text DEFAULT NULL::text, 
  activity_data jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(new_total_xp integer, new_level integer, level_up boolean, xp_to_next integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_total_xp INTEGER := 0;
  previous_level INTEGER := 1;
  new_total INTEGER;
  calculated_level INTEGER;
  calculated_xp_to_next INTEGER;
  level_increased BOOLEAN := FALSE;
BEGIN
  -- Get current XP data or create if doesn't exist
  SELECT ux.total_xp, ux.current_level INTO current_total_xp, previous_level
  FROM user_xp ux
  WHERE ux.user_id = user_uuid;
  
  IF NOT FOUND THEN
    -- Create new XP record
    INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level)
    VALUES (user_uuid, 0, 1, 100);
    current_total_xp := 0;
    previous_level := 1;
  END IF;
  
  -- Calculate new total XP
  new_total := current_total_xp + xp_amount;
  
  -- Calculate new level using the helper function
  SELECT level, xp_for_next_level INTO calculated_level, calculated_xp_to_next
  FROM calculate_level_from_xp(new_total);
  
  -- Check if level increased
  IF calculated_level > previous_level THEN
    level_increased := TRUE;
  END IF;
  
  -- Update user XP with explicit table prefixes
  UPDATE user_xp 
  SET 
    total_xp = new_total,
    current_level = calculated_level,
    xp_to_next_level = calculated_xp_to_next,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Record XP activity
  INSERT INTO xp_activities (user_id, activity_type, xp_gained, description, activity_data)
  VALUES (user_uuid, activity_type, xp_amount, activity_description, activity_data);
  
  -- Return results
  RETURN QUERY SELECT 
    new_total,
    calculated_level,
    level_increased,
    calculated_xp_to_next;
END;
$function$;

-- Fix other functions with missing search_path
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(level integer, xp_for_current_level integer, xp_for_next_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_level INTEGER := 1;
  xp_needed INTEGER := 100; -- Base XP for level 2
  cumulative_xp INTEGER := 0;
BEGIN
  -- Calculate level based on exponential XP requirements
  WHILE cumulative_xp + xp_needed <= total_xp LOOP
    cumulative_xp := cumulative_xp + xp_needed;
    current_level := current_level + 1;
    xp_needed := ROUND(xp_needed * 1.3); -- 30% increase each level
  END LOOP;
  
  RETURN QUERY SELECT 
    current_level,
    total_xp - cumulative_xp, -- XP progress in current level
    xp_needed - (total_xp - cumulative_xp); -- XP needed for next level
END;
$function$;

-- Fix check_streak_milestones function
CREATE OR REPLACE FUNCTION public.check_streak_milestones(user_uuid uuid, streak_days integer)
RETURNS TABLE(milestone integer, reward_xp integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      SELECT 1 FROM streak_milestones sm
      WHERE sm.user_id = user_uuid AND sm.milestone_days = target
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
$function$;

-- Fix get_user_level_info function
CREATE OR REPLACE FUNCTION public.get_user_level_info(user_uuid uuid)
RETURNS TABLE(total_xp integer, current_level integer, xp_to_next_level integer, level_title text, level_benefits text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_total_xp INTEGER := 0;
  user_level INTEGER := 1;
  user_xp_to_next INTEGER := 100;
  title TEXT;
  benefits TEXT[];
BEGIN
  -- Get user XP data
  SELECT ux.total_xp, ux.current_level, ux.xp_to_next_level
  INTO user_total_xp, user_level, user_xp_to_next
  FROM user_xp ux
  WHERE ux.user_id = user_uuid;
  
  IF NOT FOUND THEN
    user_total_xp := 0;
    user_level := 1;
    user_xp_to_next := 100;
  END IF;
  
  -- Determine level title and benefits
  CASE 
    WHEN user_level >= 50 THEN 
      title := 'Grandmaster Scholar';
      benefits := ARRAY['Unlimited practice tests', 'Priority support', 'Advanced analytics', 'Exclusive content', 'Mentor program access'];
    WHEN user_level >= 40 THEN 
      title := 'Elite Student';
      benefits := ARRAY['Advanced practice tests', 'Detailed analytics', 'Study group creation', 'Priority features'];
    WHEN user_level >= 30 THEN 
      title := 'Master Learner';
      benefits := ARRAY['Extended test history', 'Advanced filters', 'Custom study plans', 'Group admin privileges'];
    WHEN user_level >= 20 THEN 
      title := 'Expert Student';
      benefits := ARRAY['Extended practice sessions', 'Detailed progress reports', 'Study group moderation'];
    WHEN user_level >= 15 THEN 
      title := 'Advanced Scholar';
      benefits := ARRAY['Bonus practice questions', 'Advanced streak rewards', 'Study group features'];
    WHEN user_level >= 10 THEN 
      title := 'Dedicated Learner';
      benefits := ARRAY['Extended streak tracking', 'Bonus XP multiplier', 'Achievement badges'];
    WHEN user_level >= 7 THEN 
      title := 'Math Explorer';
      benefits := ARRAY['Weekly challenges', 'Progress insights', 'Community features'];
    WHEN user_level >= 5 THEN 
      title := 'Rising Star';
      benefits := ARRAY['Streak bonuses', 'Performance analytics', 'Social features'];
    WHEN user_level >= 3 THEN 
      title := 'Promising Student';
      benefits := ARRAY['Basic analytics', 'Streak tracking', 'Community access'];
    ELSE 
      title := 'New Explorer';
      benefits := ARRAY['Basic features', 'Getting started bonus'];
  END CASE;
  
  RETURN QUERY SELECT 
    user_total_xp,
    user_level,
    user_xp_to_next,
    title,
    benefits;
END;
$function$;