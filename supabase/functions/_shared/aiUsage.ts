import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// ============================================
// MODEL PRICING (USD per 1,000,000 tokens)
// Source: provider pricing pages, checked 2026-07-01.
// Update this table whenever a provider changes pricing —
// it directly drives the AI credit balance shown in the
// admin Billing section.
// ============================================
export const MODEL_PRICING: Record<string, { in: number; out: number; note?: string }> = {
  'gpt-4o': { in: 2.5, out: 10.0 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'claude-3-5-sonnet-20241022': { in: 3.0, out: 15.0 },
  'gemini-2.5-flash': { in: 0.3, out: 2.5 },
  'google/gemini-2.5-flash': { in: 0.3, out: 2.5 },
  'gemini-2.0-flash-001': { in: 0.1, out: 0.4, note: 'estimated — confirm against current Google pricing' },
  'gemini-2.5-flash-image-preview': {
    in: 0.3,
    out: 2.5,
    note: 'text portion only; per-image output cost is billed separately by the provider and not yet reflected here',
  },
};

const DEFAULT_PRICING = { in: 1.0, out: 3.0, note: 'unrecognized model — using a conservative fallback rate' };

export function getPricingForModel(model: string) {
  return MODEL_PRICING[model] || DEFAULT_PRICING;
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = getPricingForModel(model);
  return (promptTokens / 1_000_000) * pricing.in + (completionTokens / 1_000_000) * pricing.out;
}

/**
 * Pulls token counts out of an OpenAI-compatible chat completion response
 * (OpenAI, and gateways that mirror the OpenAI response shape such as the
 * Lovable AI gateway). Returns zeros if the provider didn't include usage.
 */
export function extractUsage(apiResponseJson: any): { promptTokens: number; completionTokens: number } {
  const usage = apiResponseJson?.usage || {};
  return {
    promptTokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0,
    completionTokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0,
  };
}

export interface LogAiUsageParams {
  functionName: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  userId?: string | null;
  supabaseUrl?: string;
  serviceRoleKey?: string;
}

/**
 * Logs one AI call's real cost into ai_usage_log and deducts it from the
 * shared ai_credit_wallet balance. This never throws — a billing hiccup
 * must never break the actual AI response returned to a student, so all
 * errors are caught and logged instead.
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  const { functionName, model, promptTokens = 0, completionTokens = 0, userId = null } = params;

  try {
    const SUPABASE_URL = params.supabaseUrl || Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = params.serviceRoleKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.warn('[aiUsage] Missing Supabase service role config — skipping usage log');
      return;
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const costUsd = estimateCostUsd(model, promptTokens, completionTokens);

    const { error: logError } = await supabase.from('ai_usage_log').insert({
      function_name: functionName,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost_usd: costUsd,
      user_id: userId,
    });
    if (logError) {
      console.error('[aiUsage] Failed to insert usage log:', logError.message);
    }

    // Single shared wallet per deployment — deduct real cost from it.
    const { data: wallet, error: walletError } = await supabase
      .from('ai_credit_wallet')
      .select('id, balance_usd')
      .limit(1)
      .maybeSingle();

    if (walletError) {
      console.error('[aiUsage] Failed to read wallet:', walletError.message);
      return;
    }

    if (wallet) {
      const newBalance = Math.max(0, Number(wallet.balance_usd) - costUsd);
      const { error: updateError } = await supabase
        .from('ai_credit_wallet')
        .update({ balance_usd: newBalance })
        .eq('id', wallet.id);
      if (updateError) {
        console.error('[aiUsage] Failed to update wallet balance:', updateError.message);
      }
    }
  } catch (err) {
    console.error('[aiUsage] Unexpected error logging AI usage:', err);
  }
}
