-- Fix the update_user_streak function to resolve column ambiguity
CREATE OR REPLACE FUNCTION public.update_user_streak(user_uuid uuid)
 RETURNS TABLE(current_streak integer, best_streak integer, is_new_best boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  last_activity DATE;
  calculated_streak INTEGER := 0;
  current_best_streak INTEGER := 0;
  is_new_record BOOLEAN := false;
  streak_start DATE;
BEGIN
  -- Get current user data (use qualified column names to avoid ambiguity)
  SELECT us.last_activity_date, us.best_streak, us.streak_start_date 
  INTO last_activity, current_best_streak, streak_start
  FROM user_streaks us
  WHERE us.user_id = user_uuid 
  ORDER BY us.created_at DESC 
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
    SELECT us.current_streak INTO calculated_streak 
    FROM user_streaks us
    WHERE us.user_id = user_uuid 
    ORDER BY us.created_at DESC 
    LIMIT 1;
  ELSIF last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    SELECT us.current_streak + 1 INTO calculated_streak 
    FROM user_streaks us
    WHERE us.user_id = user_uuid 
    ORDER BY us.created_at DESC 
    LIMIT 1;
  ELSE
    -- Streak broken, reset to 1
    calculated_streak := 1;
    streak_start := CURRENT_DATE;
  END IF;
  
  -- Check if new best
  IF calculated_streak > current_best_streak THEN
    current_best_streak := calculated_streak;
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
    current_best_streak, 
    CURRENT_DATE, 
    streak_start,
    'daily_activity'
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    current_streak = calculated_streak,
    best_streak = current_best_streak,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN QUERY SELECT calculated_streak, current_best_streak, is_new_record;
END;
$function$