-- Create a function to backfill streaks for a user between two dates
CREATE OR REPLACE FUNCTION public.backfill_user_streak(
  user_uuid uuid,
  start_date date,
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(processed_days integer, final_streak integer, final_best integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d date;
  prev_streak integer := 0;
  prev_best integer := 0;
  prev_streak_start date := NULL;
  last_record_date date := NULL;
  processed integer := 0;
BEGIN
  IF start_date IS NULL THEN
    RAISE EXCEPTION 'start_date is required';
  END IF;

  IF end_date IS NULL THEN
    end_date := CURRENT_DATE;
  END IF;

  IF start_date > end_date THEN
    RAISE EXCEPTION 'start_date cannot be after end_date';
  END IF;

  -- Load the latest record before the start_date for continuity
  SELECT us.current_streak, us.best_streak, us.streak_start_date, us.date
  INTO prev_streak, prev_best, prev_streak_start, last_record_date
  FROM user_streaks us
  WHERE us.user_id = user_uuid AND us.date < start_date
  ORDER BY us.date DESC
  LIMIT 1;

  IF last_record_date IS NULL THEN
    prev_streak := 0;
    prev_best := 0;
    prev_streak_start := start_date;
    last_record_date := start_date - INTERVAL '1 day';
  END IF;

  d := start_date;
  WHILE d <= end_date LOOP
    IF last_record_date = d - INTERVAL '1 day' THEN
      prev_streak := prev_streak + 1;
    ELSE
      prev_streak := 1;
      prev_streak_start := d;
    END IF;

    prev_best := GREATEST(prev_best, prev_streak);

    INSERT INTO user_streaks (
      user_id, date, current_streak, best_streak, last_activity_date, streak_start_date, activity_type
    ) VALUES (
      user_uuid, d, prev_streak, prev_best, d, prev_streak_start, 'backfill'
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      best_streak = GREATEST(user_streaks.best_streak, EXCLUDED.best_streak),
      last_activity_date = EXCLUDED.last_activity_date,
      streak_start_date = CASE 
        WHEN EXCLUDED.current_streak = 1 THEN EXCLUDED.streak_start_date
        ELSE COALESCE(user_streaks.streak_start_date, EXCLUDED.streak_start_date)
      END,
      updated_at = now();

    last_record_date := d;
    processed := processed + 1;
    d := d + INTERVAL '1 day';
  END LOOP;

  RETURN QUERY SELECT processed, prev_streak, prev_best;
END;
$$;