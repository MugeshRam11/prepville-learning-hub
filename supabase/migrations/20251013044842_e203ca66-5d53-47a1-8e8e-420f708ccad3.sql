-- Update the reset function to handle foreign key constraints properly
CREATE OR REPLACE FUNCTION reset_user_progress_data(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_attempts integer;
  deleted_streaks integer;
  deleted_challenges integer;
  deleted_answers integer;
BEGIN
  -- Only allow users to reset their own data or admins to reset any
  IF auth.uid() != user_uuid AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized to reset this user data';
  END IF;

  -- Delete user answers first (foreign key dependency)
  DELETE FROM user_answers 
  WHERE attempt_id IN (SELECT id FROM test_attempts WHERE user_id = user_uuid);
  GET DIAGNOSTICS deleted_answers = ROW_COUNT;

  -- Delete test attempts (affects solved questions and accuracy)
  DELETE FROM test_attempts WHERE user_id = user_uuid;
  GET DIAGNOSTICS deleted_attempts = ROW_COUNT;

  -- Delete user streaks
  DELETE FROM user_streaks WHERE user_id = user_uuid;
  GET DIAGNOSTICS deleted_streaks = ROW_COUNT;

  -- Delete daily challenges (weekly goal)
  DELETE FROM daily_challenges WHERE user_id = user_uuid;
  GET DIAGNOSTICS deleted_challenges = ROW_COUNT;

  -- Delete XP activities
  DELETE FROM xp_activities WHERE user_id = user_uuid;

  -- Reset user XP to starting values
  UPDATE user_xp 
  SET total_xp = 0, 
      current_level = 1, 
      xp_to_next_level = 100,
      updated_at = now()
  WHERE user_id = user_uuid;

  -- Reset user progress
  UPDATE user_progress
  SET knowledge_understanding = 0,
      pattern_recognition = 0,
      communication = 0,
      real_life_applications = 0,
      updated_at = now()
  WHERE user_id = user_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_attempts', deleted_attempts,
    'deleted_streaks', deleted_streaks,
    'deleted_challenges', deleted_challenges,
    'deleted_answers', deleted_answers
  );
END;
$function$;