-- ============================================
-- Real storage usage aggregation for the admin Billing section.
-- Sums storage.objects sizes per bucket. storage.objects is protected
-- by its own RLS, so this SECURITY DEFINER function is restricted to
-- service_role only — the get-platform-usage edge function verifies
-- the caller is an admin (via has_role) before ever invoking it.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_storage_usage()
RETURNS TABLE(bucket_id text, total_bytes bigint, object_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    o.bucket_id,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0) AS total_bytes,
    COUNT(*) AS object_count
  FROM storage.objects o
  GROUP BY o.bucket_id;
$$;

REVOKE ALL ON FUNCTION public.get_storage_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_usage() TO service_role;
