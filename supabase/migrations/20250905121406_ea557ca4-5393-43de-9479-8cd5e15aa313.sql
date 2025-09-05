-- Grant one-month Pro plan to specified user and ensure Pro plan exists
DO $$
DECLARE
  v_user_id uuid;
  v_plan_id uuid;
BEGIN
  -- 1) Find the user by email
  SELECT id INTO v_user_id
  FROM auth.users 
  WHERE email = 'mugeshram396@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found for email %', 'mugeshram396@gmail.com';
    RETURN;
  END IF;

  -- 2) Ensure a "Pro" subscription plan exists
  SELECT id INTO v_plan_id 
  FROM public.subscription_plans 
  WHERE lower(name) = 'pro' 
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (
      name, price_monthly, price_yearly, is_popular, features, stripe_price_id_monthly, stripe_price_id_yearly
    ) VALUES (
      'Pro', 19.99, 199.99, true, ARRAY['All premium features', 'Priority support', 'Advanced analytics'], NULL, NULL
    ) RETURNING id INTO v_plan_id;
  END IF;

  -- 3) Grant a 1-month Pro subscription starting now
  IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = v_user_id) THEN
    UPDATE public.user_subscriptions
    SET 
      plan_id = v_plan_id,
      status = 'active',
      subscription_start_date = now(),
      subscription_end_date = now() + INTERVAL '1 month',
      updated_at = now()
    WHERE user_id = v_user_id;
  ELSE
    INSERT INTO public.user_subscriptions (
      user_id, plan_id, status, trial_start_date, trial_end_date, 
      subscription_start_date, subscription_end_date, stripe_customer_id, stripe_subscription_id
    ) VALUES (
      v_user_id, v_plan_id, 'active', NULL, NULL, now(), now() + INTERVAL '1 month', NULL, NULL
    );
  END IF;
END $$;