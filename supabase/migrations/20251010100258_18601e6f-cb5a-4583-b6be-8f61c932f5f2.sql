-- Fix function search_path security issue
-- Add SET search_path to functions that are missing it

-- Update update_mock_test_question_count trigger function
CREATE OR REPLACE FUNCTION public.update_mock_test_question_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.mock_tests 
    SET total_questions = (
      SELECT COUNT(*) FROM public.mock_questions 
      WHERE mock_test_id = NEW.mock_test_id
    )
    WHERE id = NEW.mock_test_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mock_tests 
    SET total_questions = (
      SELECT COUNT(*) FROM public.mock_questions 
      WHERE mock_test_id = OLD.mock_test_id
    )
    WHERE id = OLD.mock_test_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Update handle_new_user trigger function  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    CASE 
      WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
      WHEN new.raw_user_meta_data->>'role' = 'moderator' THEN 'moderator'::user_role
      ELSE 'student'::user_role
    END
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$function$;

-- Update update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update update_group_member_count function
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE public.study_groups 
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE public.study_groups 
      SET member_count = member_count - 1
      WHERE id = NEW.group_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE public.study_groups 
      SET member_count = member_count + 1
      WHERE id = NEW.group_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE public.study_groups 
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update update_answer_count function
CREATE OR REPLACE FUNCTION public.update_answer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_questions 
    SET answer_count = answer_count + 1
    WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_questions 
    SET answer_count = answer_count - 1
    WHERE id = OLD.question_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update update_user_reputation function
CREATE OR REPLACE FUNCTION public.update_user_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_verified = false AND NEW.is_verified = true THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation + 50
    WHERE user_id = NEW.answered_by;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_verified = true AND NEW.is_verified = false THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation - 50
    WHERE user_id = NEW.answered_by;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.upvotes != NEW.upvotes THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation + ((NEW.upvotes - OLD.upvotes) * 10)
    WHERE user_id = NEW.answered_by;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update create_trial_subscription function
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_subscriptions (
    user_id,
    status,
    trial_start_date,
    trial_end_date
  ) VALUES (
    NEW.id,
    'trial',
    now(),
    now() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$function$;