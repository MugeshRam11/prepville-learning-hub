/**
 * Supabase Admin Client Export
 * 
 * SECURITY NOTICE:
 * The Supabase Service Role Key must NEVER be bundled into client-side code.
 * All client-side administrative operations execute using the authenticated user's session
 * via the standard Supabase client, subject to Row Level Security (RLS) policies.
 * Privileged bypass operations (user deletion, role escalation) must execute strictly
 * server-side within Supabase Edge Functions with proper admin authorization checks.
 */
import { supabase } from '@/integrations/supabase/client';

export const supabaseAdmin = supabase;
export default supabaseAdmin;
