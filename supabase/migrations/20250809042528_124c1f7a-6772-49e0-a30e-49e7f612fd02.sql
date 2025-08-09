-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_popular BOOLEAN DEFAULT false,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, cancelled, expired
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (true);

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, features, is_popular) VALUES
('Basic', 9.99, 99.99, ARRAY['Access to Question Bank', 'Basic Analytics', 'Email Support'], false),
('Premium', 19.99, 199.99, ARRAY['Everything in Basic', 'Advanced Analytics', 'Mock Tests', 'Priority Support', 'Study Groups'], true),
('Enterprise', 39.99, 399.99, ARRAY['Everything in Premium', 'Custom Branding', 'API Access', 'Dedicated Support'], false);

-- Function to create trial subscription on user signup
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create trial subscription when user signs up
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;