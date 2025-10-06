-- Grant lifetime subscription to mugeshram396@gmail.com
UPDATE public.user_subscriptions 
SET status = 'active',
    subscription_start_date = now(),
    subscription_end_date = now() + interval '100 years',
    updated_at = now()
WHERE user_id = '8be897ac-17c7-4f8e-9c35-5231de91d380';