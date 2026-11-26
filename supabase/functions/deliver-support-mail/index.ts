import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const secret = Deno.env.get('SUPPORT_WORKER_SECRET'),
    from = Deno.env.get('VERIFIED_MAIL_FROM'),
    key = Deno.env.get('RESEND_API_KEY');
  if (
    req.method !== 'POST' ||
    !secret ||
    req.headers.get('Authorization') !== 'Bearer ' + secret
  )
    return new Response(null, { status: 403 });
  const staff = Deno.env.get('ADMIN_ORIGIN'),
    student = Deno.env.get('STUDENT_ORIGIN');
  if (
    !from ||
    !key ||
    !staff?.startsWith('https://') ||
    !student?.startsWith('https://')
  )
    return new Response(null, { status: 503 });
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data, error } = await db.rpc('claim_support_mail');
  if (error) return new Response(null, { status: 503 });
  for (const j of data) {
    let delivery = null,
      failure = null;
    try {
      if (!j.recipient || /@example\.(invalid|test)$/i.test(j.recipient))
        throw Error('Mailbox unavailable');
      const link = new URL(
        j.audience === 'welcome' ? '/dashboard' : '/support',
        j.audience === 'owner' ? staff : student,
      );
      if (j.ticket_id) link.searchParams.set('ticket', j.ticket_id);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          'Idempotency-Key': j.job_id,
        },
        body: JSON.stringify({
          from,
          to: [j.recipient],
          subject:
            j.audience === 'welcome'
              ? 'Welcome to PrepVille'
              : 'PrepVille support update',
          text:
            (j.audience === 'welcome'
              ? 'Open your learning dashboard: '
              : 'Sign in to view your support ticket: ') + link.href,
        }),
      });
      if (!response.ok) throw Error('Provider HTTP ' + response.status);
      delivery = (await response.json()).id;
    } catch (e) {
      failure = e instanceof Error ? e.message : 'Delivery failed';
    }
    const result = await db.rpc('finish_support_mail', {
      job: j.job_id,
      delivery,
      failure,
    });
    if (result.error) return new Response(null, { status: 503 });
  }
  return Response.json({ processed: data.length });
});
