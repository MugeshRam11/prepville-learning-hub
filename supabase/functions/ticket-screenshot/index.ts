import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateDiagram } from '../_shared/diagram.ts';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  const reply = (status: number, message: string) =>
    Response.json({ message }, { status, headers });
  if (req.method !== 'POST') return reply(405, 'POST required');
  try {
    const url = Deno.env.get('SUPABASE_URL')!,
      auth = req.headers.get('Authorization') ?? '';
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return reply(401, 'Sign in required');
    const form = await req.formData(),
      file = form.get('file');
    if (!(file instanceof File)) return reply(400, 'Screenshot required');
    await validateDiagram(file);
    const { data: path, error } = await client.rpc(
      'reserve_support_attachment',
      { ticket: form.get('ticket'), mime: file.type, size_bytes: file.size },
    );
    if (error)
      return reply(403, 'Ticket unavailable or attachment limit reached');
    const service = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const uploaded = await service.storage
      .from('support-files')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      await service
        .from('support_ticket_attachments')
        .delete()
        .eq('path', path)
        .eq('uploaded_by', user.id);
      return reply(503, 'Upload failed. Please retry.');
    }
    return Response.json({ path }, { status: 201, headers });
  } catch {
    return reply(400, 'Choose a JPEG, PNG or WebP up to 5 MB');
  }
});
