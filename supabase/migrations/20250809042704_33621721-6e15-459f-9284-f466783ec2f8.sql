-- Fix function search path security warnings with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.create_trial_subscription() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_subscription_status(UUID);

-- Recreate function with proper search_path
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();

-- Function to check subscription status
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid UUID)
RETURNS TABLE (
  status TEXT,
  is_trial_active BOOLEAN,
  is_subscription_active BOOLEAN,
  days_left INTEGER,
  plan_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.status,
    CASE 
      WHEN us.status = 'trial' AND us.trial_end_date > now() THEN true
      ELSE false
    END as is_trial_active,
    CASE 
      WHEN us.status = 'active' AND us.subscription_end_date > now() THEN true
      ELSE false
    END as is_subscription_active,
    CASE 
      WHEN us.status = 'trial' AND us.trial_end_date > now() THEN 
        EXTRACT(DAY FROM us.trial_end_date - now())::INTEGER
      WHEN us.status = 'active' AND us.subscription_end_date > now() THEN 
        EXTRACT(DAY FROM us.subscription_end_date - now())::INTEGER
      ELSE 0
    END as days_left,
    COALESCE(sp.name, 'Trial') as plan_name
  FROM public.user_subscriptions us
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid;
END;
$$;