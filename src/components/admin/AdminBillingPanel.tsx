import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Wallet, Database as DatabaseIcon, CreditCard, Receipt, Download } from 'lucide-react';
import adSavvyLogo from '@/assets/AdSavvy logo(png).png';
import { generateInvoicePdf } from '@/services/invoicePdfGenerator';

interface PlatformUsageResponse {
  plan: {
    name: string;
    monthlyAmount: number;
    currency: string;
    status: string;
    billingCycleStart: string;
    paymentMethodLabel: string;
    paymentMethodType: string;
  } | null;
  aiCredit: {
    balanceUsd: number;
    monthlyAllowanceUsd: number;
    lowBalanceThresholdUsd: number;
    lastRefillAt: string;
    spendThisCycleUsd: number;
    spendByFunction: Record<string, number>;
    recurringTopupEnabled: boolean;
    recurringTopupAmountUsd: number;
  } | null;
  storage: {
    usedBytes: number;
    limitBytes: number;
    byBucket: { bucket_id: string; total_bytes: number; object_count: number }[];
  };
  invoices: any[];
  generatedAt: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

const AdminBillingPanel = () => {
  const [data, setData] = useState<PlatformUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyAmount, setBuyAmount] = useState('0');
  const [buyOpen, setBuyOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentLabel, setPaymentLabel] = useState('');
  const [paymentType, setPaymentType] = useState('manual');
  const [savingPayment, setSavingPayment] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const fetchUsage = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-platform-usage');
      if (error) throw error;
      setData(result as PlatformUsageResponse);
      if (result?.plan) {
        setPaymentLabel(result.plan.paymentMethodLabel);
        setPaymentType(result.plan.paymentMethodType);
      }
    } catch (err: any) {
      console.error('[AdminBilling] Failed to load usage:', err);
      if (isManualRefresh) toast.error('Failed to refresh billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();

    // Poll as a safety net every 20s
    const interval = setInterval(() => fetchUsage(), 20000);

    // Live push updates the moment an AI call logs cost or the wallet changes
    const channel = supabase
      .channel('admin-billing-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_usage_log' }, () => fetchUsage())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_credit_wallet' }, () => fetchUsage())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchUsage]);

  const handleBuyCredits = async () => {
    const amount = Number(buyAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setBuying(true);
    try {
      const { error } = await supabase.functions.invoke('purchase-ai-credits', {
        body: { amountUsd: amount, purchaseType: 'manual' },
      });
      if (error) throw error;
      toast.success(`Added $${amount.toFixed(2)} in AI credits`);
      setBuyOpen(false);
      fetchUsage();
    } catch (err: any) {
      toast.error(err.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const handleToggleRecurring = async (checked: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('ai_credit_wallet')
        .update({ recurring_topup_enabled: checked })
        .not('id', 'is', null);
      if (error) throw error;
      toast.success(checked ? 'Recurring monthly top-up enabled' : 'Recurring monthly top-up disabled');
      fetchUsage();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update setting');
    }
  };

  const handleSavePaymentMethod = async () => {
    setSavingPayment(true);
    try {
      const { error } = await (supabase as any)
        .from('platform_plan')
        .update({ payment_method_label: paymentLabel, payment_method_type: paymentType })
        .not('id', 'is', null);
      if (error) throw error;
      toast.success('Payment method updated');
      setPaymentOpen(false);
      fetchUsage();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment method');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!data?.plan) return;
    setGeneratingInvoice(true);
    try {
      const now = new Date();
      const billingMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const overage = Math.max(0, (data.aiCredit?.spendThisCycleUsd || 0) - (data.aiCredit?.monthlyAllowanceUsd || 0));
      const total = data.plan.monthlyAmount + overage;
      const invoiceNumber = `ADSV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const { data: inserted, error } = await (supabase as any)
        .from('platform_invoices')
        .insert({
          invoice_number: invoiceNumber,
          billing_month: billingMonth,
          plan_amount: data.plan.monthlyAmount,
          ai_overage_amount: overage,
          total_amount: total,
          status: 'pending',
          due_at: new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Invoice generated');
      generateInvoicePdf(inserted, data.plan.name);
      fetchUsage();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading billing data…
      </div>
    );
  }

  const aiCredit = data?.aiCredit;
  const storage = data?.storage;
  const plan = data?.plan;

  const aiPct = aiCredit
    ? Math.min(100, Math.max(0, (aiCredit.balanceUsd / (aiCredit.monthlyAllowanceUsd || 1)) * 100))
    : 0;
  const storagePct = storage
    ? Math.min(100, Math.max(0, (storage.usedBytes / (storage.limitBytes || 1)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <img src={adSavvyLogo} alt="AdSavvy" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
            <p className="text-sm text-muted-foreground">
              Live infrastructure &amp; AI usage — powered by AdSavvy
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchUsage(true)} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-[hsl(var(--adsavvy-blue))]" />
              Current Plan
            </CardTitle>
            <CardDescription>Your AdSavvy managed plan for this deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                ${plan?.monthlyAmount.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </span>
              <Badge variant={plan?.status === 'active' ? 'default' : 'secondary'}>{plan?.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{plan?.name}</p>
            <p className="text-xs text-muted-foreground">
              Cycle started {plan?.billingCycleStart ? new Date(plan.billingCycleStart).toLocaleDateString() : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-[hsl(var(--adsavvy-pink))]" />
              Payment Method
            </CardTitle>
            <CardDescription>How this plan is paid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{plan?.paymentMethodLabel}</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {plan?.paymentMethodType?.replace('_', ' ')}
              </Badge>
            </div>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Update payment method</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Payment Method</DialogTitle>
                  <DialogDescription>This is stored on the plan record — no card data is processed here.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={paymentLabel} onChange={(e) => setPaymentLabel(e.target.value)} placeholder="e.g. Bank Transfer — HDFC ****1234" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual / Offline</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="zoho">Zoho Billing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSavePaymentMethod} disabled={savingPayment}>
                    {savingPayment ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* AI Credit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-[hsl(var(--adsavvy-blue))]" />
              AI Credit
            </CardTitle>
            <CardDescription>Real-time balance from live AI usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">${aiCredit?.balanceUsd.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">of ${aiCredit?.monthlyAllowanceUsd.toFixed(2)} / mo</span>
            </div>
            <Progress value={aiPct} />
            <p className="text-xs text-muted-foreground">
              Spent this cycle: ${aiCredit?.spendThisCycleUsd.toFixed(2)}
            </p>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={!!aiCredit?.recurringTopupEnabled} onCheckedChange={handleToggleRecurring} disabled />
                <span className="text-sm">Auto-buy ${aiCredit?.recurringTopupAmountUsd.toFixed(2)}/mo</span>
              </div>
              <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Buy credits</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buy AI Credits</DialogTitle>
                    <DialogDescription>Manually top up the shared AI credit balance.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label>Amount (USD)</Label>
                    <Input type="number" min="1" step="1" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleBuyCredits} disabled={buying}>
                      {buying ? 'Processing…' : `Add $${Number(buyAmount || 0).toFixed(2)}`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DatabaseIcon className="w-5 h-5 text-[hsl(var(--adsavvy-pink))]" />
              Storage
            </CardTitle>
            <CardDescription>Real Supabase storage usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{formatBytes(storage?.usedBytes || 0)}</span>
              <span className="text-sm text-muted-foreground">of {formatBytes(storage?.limitBytes || 0)}</span>
            </div>
            <Progress value={storagePct} />
            {storage?.byBucket && storage.byBucket.length > 0 && (
              <div className="pt-2 border-t space-y-1">
                {storage.byBucket.map((b) => (
                  <div key={b.bucket_id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{b.bucket_id}</span>
                    <span>{formatBytes(b.total_bytes)} · {b.object_count} files</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing history / download bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Billing History</CardTitle>
            <CardDescription>Generated monthly invoices</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleGenerateInvoice} disabled={generatingInvoice}>
            {generatingInvoice ? 'Generating…' : "Generate this month's invoice"}
          </Button>
        </CardHeader>
        <CardContent>
          {(!data?.invoices || data.invoices.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No invoices generated yet.</p>
          ) : (
            <div className="space-y-2">
              {data.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · ${Number(inv.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{inv.status}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateInvoicePdf(inv, plan?.name || 'AdSavvy Managed Plan')}
                    >
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Last updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : '—'} · auto-refreshes live
      </p>
    </div>
  );
};

export default AdminBillingPanel;
