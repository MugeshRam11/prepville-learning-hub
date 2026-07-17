import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// PURCHASE AI CREDITS
// Admin-only. Handles both a one-off manual top-up and toggling the
// recurring-monthly purchase flag. Does not process real payment —
// it records the purchase and tops up the shared wallet. Wire this to
// Zoho (or another payment processor) once one is connected.
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

    const { amountUsd, purchaseType = 'manual' } = await req.json();

    const parsedAmount = Number(amountUsd);
    if (!parsedAmount || parsedAmount <= 0) {
      return new Response(JSON.stringify({ error: 'amountUsd must be a positive number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['manual', 'recurring_monthly'].includes(purchaseType)) {
      return new Response(JSON.stringify({ error: 'purchaseType must be manual or recurring_monthly' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: purchaseError } = await admin.from('ai_credit_purchases').insert({
      amount_usd: parsedAmount,
      purchase_type: purchaseType,
      status: 'completed',
      purchased_by: user.id,
    });

    if (purchaseError) {
      throw new Error(`Failed to record purchase: ${purchaseError.message}`);
    }

    const { data: wallet, error: walletError } = await admin
      .from('ai_credit_wallet')
      .select('id, balance_usd')
      .limit(1)
      .maybeSingle();

    if (walletError || !wallet) {
      throw new Error('AI credit wallet not found');
    }

    const newBalance = Number(wallet.balance_usd) + parsedAmount;

    const { error: updateError } = await admin
      .from('ai_credit_wallet')
      .update({ balance_usd: newBalance })
      .eq('id', wallet.id);

    if (updateError) {
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, newBalanceUsd: newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[purchase-ai-credits] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
