-- Fix function search path security issues
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_answer_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation when answer is verified
  IF TG_OP = 'UPDATE' AND OLD.is_verified = false AND NEW.is_verified = true THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation + 50
    WHERE user_id = NEW.answered_by;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_verified = true AND NEW.is_verified = false THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation - 50
    WHERE user_id = NEW.answered_by;
  END IF;
  
  -- Update reputation when upvotes change
  IF TG_OP = 'UPDATE' AND OLD.upvotes != NEW.upvotes THEN
    UPDATE public.study_groups_users 
    SET reputation = reputation + ((NEW.upvotes - OLD.upvotes) * 10)
    WHERE user_id = NEW.answered_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;