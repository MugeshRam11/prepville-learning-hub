-- Add recurring monthly AI-credit top-up preference to the wallet.
-- The actual monthly charge/execution is a follow-up (cron job or Zoho
-- recurring subscription) — this stores the admin's preference and the
-- amount so the Billing UI can reflect and toggle it today.
ALTER TABLE public.ai_credit_wallet
  ADD COLUMN IF NOT EXISTS recurring_topup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_topup_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 15.00;
