-- ============================================
-- AdSavvy Platform Billing Schema
-- Tracks the operational plan (Supabase + Vercel + AI),
-- AI credit wallet, per-call AI usage/cost, credit
-- purchases, and generated monthly invoices/bills.
-- Admin-only visibility (has_role(auth.uid(), 'admin'::app_role)).
-- ============================================

-- Auto-update-timestamp helper already exists in most Lovable/Supabase
-- projects as public.update_updated_at_column(); reuse if present,
-- otherwise create it.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 1. platform_plan — the AdSavvy managed plan for this deployment
-- ============================================
CREATE TABLE public.platform_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL DEFAULT 'AdSavvy Managed Plan',
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 75.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  payment_method_label TEXT NOT NULL DEFAULT 'Not set',
  payment_method_type TEXT NOT NULL DEFAULT 'manual', -- manual | card | bank_transfer | zoho
  storage_limit_gb NUMERIC(10,2) NOT NULL DEFAULT 100, -- Supabase Pro included storage
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform plan"
ON public.platform_plan FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform plan"
ON public.platform_plan FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform plan"
ON public.platform_plan FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_plan_updated_at
BEFORE UPDATE ON public.platform_plan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. ai_credit_wallet — running AI credit balance (single wallet per deployment)
-- ============================================
CREATE TABLE public.ai_credit_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_usd NUMERIC(10,4) NOT NULL DEFAULT 15.00,
  monthly_allowance_usd NUMERIC(10,4) NOT NULL DEFAULT 15.00,
  low_balance_threshold_usd NUMERIC(10,4) NOT NULL DEFAULT 2.00,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credit_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai credit wallet"
ON public.ai_credit_wallet FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ai credit wallet"
ON public.ai_credit_wallet FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ai_credit_wallet_updated_at
BEFORE UPDATE ON public.ai_credit_wallet
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. ai_usage_log — real per-call AI cost tracking (written by edge functions via service role)
-- ============================================
CREATE TABLE public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai usage log"
ON public.ai_usage_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_usage_log_created_at ON public.ai_usage_log (created_at DESC);
CREATE INDEX idx_ai_usage_log_function_name ON public.ai_usage_log (function_name);

-- ============================================
-- 4. ai_credit_purchases — manual top-ups + recurring monthly purchases
-- ============================================
CREATE TABLE public.ai_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_usd NUMERIC(10,2) NOT NULL,
  purchase_type TEXT NOT NULL DEFAULT 'manual', -- manual | recurring_monthly
  status TEXT NOT NULL DEFAULT 'completed', -- completed | pending | failed
  purchased_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai credit purchases"
ON public.ai_credit_purchases FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert ai credit purchases"
ON public.ai_credit_purchases FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 5. platform_invoices — generated monthly bills (downloadable, optionally synced to Zoho)
-- ============================================
CREATE TABLE public.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  billing_month DATE NOT NULL, -- first day of the billed month
  plan_amount NUMERIC(10,2) NOT NULL,
  ai_overage_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | overdue
  zoho_invoice_id TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform invoices"
ON public.platform_invoices FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform invoices"
ON public.platform_invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform invoices"
ON public.platform_invoices FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_platform_invoices_billing_month ON public.platform_invoices (billing_month DESC);

-- ============================================
-- Seed initial rows (single-tenant deployment)
-- ============================================
INSERT INTO public.platform_plan (plan_name, monthly_amount, currency, payment_method_label, payment_method_type, storage_limit_gb, status)
VALUES ('AdSavvy Managed Plan', 75.00, 'USD', 'Not set — add a payment method', 'manual', 100, 'active');

INSERT INTO public.ai_credit_wallet (balance_usd, monthly_allowance_usd, low_balance_threshold_usd)
VALUES (15.00, 15.00, 2.00);
