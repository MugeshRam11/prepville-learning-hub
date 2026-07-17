import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// GET PLATFORM USAGE
// Powers the admin Billing section: real-time AI credit balance +
// spend this cycle, real Supabase storage usage, current plan, and
// payment method. Admin-only.
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is a real, authenticated user.
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify admin role explicitly (has_role takes the user id as a param,
    // so this works correctly even under the service-role connection).
    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Plan ----
    const { data: plan, error: planError } = await admin
      .from('platform_plan')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      console.error('[get-platform-usage] plan error:', planError.message);
    }

    // ---- AI credit wallet ----
    const { data: wallet, error: walletError } = await admin
      .from('ai_credit_wallet')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (walletError) {
      console.error('[get-platform-usage] wallet error:', walletError.message);
    }

    // ---- AI spend this billing cycle ----
    const cycleStart = plan?.billing_cycle_start
      ? new Date(plan.billing_cycle_start).toISOString()
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: usageRows, error: usageError } = await admin
      .from('ai_usage_log')
      .select('cost_usd, function_name, created_at')
      .gte('created_at', cycleStart);

    if (usageError) {
      console.error('[get-platform-usage] usage error:', usageError.message);
    }

    const aiSpendThisCycle = (usageRows || []).reduce((sum, row) => sum + Number(row.cost_usd || 0), 0);
    const spendByFunction: Record<string, number> = {};
    for (const row of usageRows || []) {
      spendByFunction[row.function_name] = (spendByFunction[row.function_name] || 0) + Number(row.cost_usd || 0);
    }

    // ---- Real storage usage across all buckets ----
    const { data: storageRows, error: storageError } = await admin.rpc('get_storage_usage');
    if (storageError) {
      console.error('[get-platform-usage] storage error:', storageError.message);
    }

    const storageUsedBytes = (storageRows || []).reduce((sum: number, row: any) => sum + Number(row.total_bytes || 0), 0);
    const storageLimitBytes = Number(plan?.storage_limit_gb || 100) * 1024 * 1024 * 1024;

    // ---- Recent invoices (for the download list) ----
    const { data: invoices, error: invoicesError } = await admin
      .from('platform_invoices')
      .select('*')
      .order('billing_month', { ascending: false })
      .limit(24);

    if (invoicesError) {
      console.error('[get-platform-usage] invoices error:', invoicesError.message);
    }

    return new Response(
      JSON.stringify({
        plan: plan
          ? {
              name: plan.plan_name,
              monthlyAmount: Number(plan.monthly_amount),
              currency: plan.currency,
              status: plan.status,
              billingCycleStart: plan.billing_cycle_start,
              paymentMethodLabel: plan.payment_method_label,
              paymentMethodType: plan.payment_method_type,
            }
          : null,
        aiCredit: wallet
          ? {
              balanceUsd: Number(wallet.balance_usd),
              monthlyAllowanceUsd: Number(wallet.monthly_allowance_usd),
              lowBalanceThresholdUsd: Number(wallet.low_balance_threshold_usd),
              lastRefillAt: wallet.last_refill_at,
              spendThisCycleUsd: Number(aiSpendThisCycle.toFixed(4)),
              spendByFunction,
              recurringTopupEnabled: Boolean(wallet.recurring_topup_enabled),
              recurringTopupAmountUsd: Number(wallet.recurring_topup_amount_usd),
            }
          : null,
        storage: {
          usedBytes: storageUsedBytes,
          limitBytes: storageLimitBytes,
          byBucket: storageRows || [],
        },
        invoices: invoices || [],
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[get-platform-usage] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
