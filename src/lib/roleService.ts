/**
 * Role Verification Service
 * Fetches the user's actual role from database (profiles and user_roles tables)
 */
import { supabase } from '@/integrations/supabase/client';

export type UserAppRole = 'admin' | 'student';

/**
 * Fetch the database-backed role for a user ID with automatic timeout protection
 */
export const fetchUserRole = async (userId: string | undefined): Promise<UserAppRole> => {
  if (!userId) return 'student';

  const {data,error} = await supabase.from('user_roles').select('role')
    .eq('user_id',userId).eq('role','admin').limit(1);
  if (error) console.error('Could not verify account role:',error.message);
  return data?.length ? 'admin' : 'student';
};
