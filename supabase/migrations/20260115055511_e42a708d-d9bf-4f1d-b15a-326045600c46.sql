-- Give all existing users lifetime pro access
-- First, ensure all existing users have a subscription record with lifetime access

-- Insert or update subscription for all existing users in profiles table
INSERT INTO public.user_subscriptions (user_id, status, subscription_start_date, subscription_end_date, trial_start_date, trial_end_date)
SELECT 
  p.id,
  'active',
  now(),
  '2099-12-31'::timestamp with time zone, -- Lifetime (far future date)
  null,
  null
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Update existing subscription records to lifetime pro
UPDATE public.user_subscriptions
SET 
  status = 'active',
  subscription_end_date = '2099-12-31'::timestamp with time zone,
  trial_end_date = null,
  updated_at = now()
WHERE user_id IN (SELECT id FROM public.profiles)
  AND (status != 'active' OR subscription_end_date < '2099-01-01'::timestamp with time zone OR subscription_end_date IS NULL);