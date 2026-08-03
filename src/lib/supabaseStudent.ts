/**
 * Supabase Student Client Export
 * Re-exports the unified single Supabase instance to eliminate GoTrueClient duplication.
 */
import { supabase } from '@/integrations/supabase/client';

export const supabaseStudent = supabase;
export default supabaseStudent;
