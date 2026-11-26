import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export function guardianHandler(verify: boolean) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
  };
  return async (req: Request) => {
    const reply = (status: number, message: string) =>
      Response.json({ message }, { status, headers });
    if (req.method === 'OPTIONS') return new Response(null, { headers });
    if (req.method !== 'POST') return reply(405, 'POST required');
    try {
      const client = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const {
        data: { user },
      } = await client.auth.getUser(
        (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, ''),
      );
      if (!user) return reply(401, 'Sign in required');
      const secret = Deno.env.get('GUARDIAN_OTP_SECRET'),
        sender = Deno.env.get('VERIFIED_MAIL_FROM'),
        apiKey = Deno.env.get('RESEND_API_KEY');
      if (!secret || (!verify && (!sender || !apiKey)))
        return reply(503, 'Guardian verification is unavailable');
      const code = verify
        ? String((await req.json()).code)
        : String(
            crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
          ).padStart(6, '0');
      if (!/^\d{6}$/.test(code)) return reply(400, 'Enter six digits');
      const encode = new TextEncoder(),
        key = await crypto.subtle.importKey(
          'raw',
          encode.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.sign(
            'HMAC',
            key,
            encode.encode(user.id + '|' + code),
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      const { data: email, error } = await client.rpc('guardian_challenge', {
        p_user: user.id,
        p_digest: digest,
        p_verify: verify,
      });
      if (error || !email)
        return reply(400, 'Check consent, code and resend interval');
      if (!verify) {
        const sent = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: sender,
            to: [email],
            subject: 'PrepVille guardian verification',
            text:
              'Your verification code is ' +
              code +
              '. It expires in 10 minutes.',
          }),
        });
        if (!sent.ok)
          return reply(502, 'Delivery failed. Retry after one minute.');
      }
      return reply(200, verify ? 'Guardian email verified' : 'Code sent');
    } catch {
      return reply(503, 'Verification unavailable');
    }
  };
}
