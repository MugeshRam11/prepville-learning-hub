import { Webhook } from 'npm:svix@1.76.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!secret) return new Response(null, { status: 503 });
  try {
    const event = new Webhook(secret).verify(
      await req.text(),
      Object.fromEntries(req.headers),
    ) as { type: string; created_at: string; data: { email_id: string } };
    if (
      ![
        'email.delivered',
        'email.bounced',
        'email.complained',
        'email.failed',
        'email.suppressed',
      ].includes(event.type)
    )
      return new Response(null, { status: 204 });
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await db.rpc('record_mail_event', {
      provider: event.data.email_id,
      event_name: event.type,
      event_at: event.created_at,
    });
    return new Response(null, { status: error ? 503 : 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
});
