import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const secret = Deno.env.get('DIAGRAM_CLEANUP_SECRET');
  if (
    req.method !== 'POST' ||
    !secret ||
    req.headers.get('Authorization') !== 'Bearer ' + secret
  )
    return new Response(null, { status: 403 });
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: paths, error } = await db.rpc('claim_abandoned_diagrams');
  if (error) return new Response(null, { status: 503 });
  if (paths.length) {
    const removal = await db.storage.from('practice-diagrams').remove(paths);
    if (removal.error) return new Response(null, { status: 503 });
    const result = await db.rpc('finish_diagram_cleanup', { paths });
    if (result.error) return new Response(null, { status: 503 });
  }
  return Response.json({ removed: paths.length });
});
