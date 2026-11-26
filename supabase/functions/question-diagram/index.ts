import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateDiagram } from '../_shared/diagram.ts';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  const reply = (status: number, body: object) =>
    Response.json(body, { status, headers });
  if (req.method !== 'POST') return reply(405, { error: 'POST required' });
  const url = Deno.env.get('SUPABASE_URL')!;
  const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return reply(401, { error: 'Sign in required' });
  const { data: admin } = await client.rpc('support_staff');
  if (admin !== true) return reply(403, { error: 'Staff access required' });
  try {
    const form = await req.formData(),
      file = form.get('file');
    if (!(file instanceof File)) return reply(400, { error: 'Image required' });
    const extension = await validateDiagram(file);
    const bucket = 'practice-diagrams';
    const service = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const bank = form.get('bank') === 'true';
    const path = (bank ? 'bank/' : '') + crypto.randomUUID() + '.' + extension;
    if (bank) {
      const registered = await service.rpc('register_bank_upload', { path });
      if (registered.error)
        return reply(503, { error: 'Could not stage diagram' });
    }
    const { error } = await service.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return reply(503, { error: 'Upload failed. Please retry.' });
    return reply(201, { ref: '/practice-diagrams/' + path });
  } catch {
    return reply(400, {
      error: 'Invalid image. Choose a JPEG, PNG or WebP up to 5 MB.',
    });
  }
});
