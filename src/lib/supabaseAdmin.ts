/**
 * Supabase Admin Client Export
 * Provides admin access with Service Role Key for Admin operations (Password updates, Auth Admin).
 * Uses a separate storageKey to avoid "Multiple GoTrueClient instances" browser warning.
 */
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mvmciqmszakciijfdyos.supabase.co';
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'sb-admin-service-role',
      },
    })
  : supabase;

export default supabaseAdmin;

