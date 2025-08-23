-- Fix the user_streaks table and update_user_streak function
-- First, let's add the missing unique constraint and fix the function

-- Add unique constraint for user_id and date
ALTER TABLE user_streaks ADD CONSTRAINT user_streaks_user_date_unique UNIQUE (user_id, date);

-- Drop and recreate the update_user_streak function with proper logic
DROP FUNCTION IF EXISTS update_user_streak(UUID);

CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS TABLE(
  current_streak INTEGER,
  best_streak INTEGER,
  is_new_best BOOLEAN
) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  existing_streak INTEGER := 0;
  existing_best INTEGER := 0;
  new_streak INTEGER := 0;
  new_best INTEGER := 0;
  is_new_record BOOLEAN := FALSE;
BEGIN
  -- Get the current streak data or create initial record
  SELECT COALESCE(us.current_streak, 0), COALESCE(us.best_streak, 0)
  INTO existing_streak, existing_best
  FROM user_streaks us
  WHERE us.user_id = user_uuid
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Check if user already logged activity today
  IF EXISTS (
    SELECT 1 FROM user_streaks 
    WHERE user_id = user_uuid AND date = today_date
  ) THEN
    -- Already logged today, return current values
    RETURN QUERY SELECT existing_streak, existing_best, FALSE;
    RETURN;
  END IF;

  -- Check if user had activity yesterday to continue streak
  IF EXISTS (
    SELECT 1 FROM user_streaks 
    WHERE user_id = user_uuid AND date = yesterday_date
  ) THEN
    -- Continue streak
    new_streak := existing_streak + 1;
  ELSE
    -- Start new streak
    new_streak := 1;
  END IF;

  -- Update best streak if necessary
  new_best := GREATEST(existing_best, new_streak);
  is_new_record := new_best > existing_best;

  -- Insert today's streak record
  INSERT INTO user_streaks (
    user_id, 
    date, 
    current_streak, 
    best_streak, 
    last_activity_date,
    streak_start_date,
    activity_type
  ) VALUES (
    user_uuid,
    today_date,
    new_streak,
    new_best,
    today_date,
    CASE 
      WHEN new_streak = 1 THEN today_date
      ELSE (
        SELECT streak_start_date 
        FROM user_streaks 
        WHERE user_id = user_uuid AND current_streak > 0
        ORDER BY created_at DESC 
        LIMIT 1
      )
    END,
    'manual'
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    current_streak = new_streak,
    best_streak = new_best,
    last_activity_date = today_date,
    updated_at = now();

  -- Return the results
  RETURN QUERY SELECT new_streak, new_best, is_new_record;
END;
$$ LANGUAGE plpgsql;