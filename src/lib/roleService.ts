/**
 * Role Verification Service
 * Fetches the user's actual role from database (profiles and user_roles tables)
 */
import { supabase } from '@/integrations/supabase/client';

export type UserAppRole = 'admin' | 'student';

/**
 * Fetch the database-backed role for a user ID
 */
export const fetchUserRole = async (userId: string | undefined): Promise<UserAppRole> => {
  if (!userId) return 'student';

  try {
    // 1. Check user_roles table
    const { data: userRoleData, error: userRoleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!userRoleErr && userRoleData?.role) {
      const roleStr = String(userRoleData.role).toLowerCase();
      if (roleStr === 'admin') return 'admin';
      if (roleStr === 'student') return 'student';
    }

    // 2. Check profiles table fallback
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!profileErr && profileData?.role) {
      const profileRoleStr = String(profileData.role).toLowerCase();
      if (profileRoleStr === 'admin') return 'admin';
      return 'student';
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
  }

  return 'student';
};
