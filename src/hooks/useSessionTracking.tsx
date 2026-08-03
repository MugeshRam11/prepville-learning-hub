import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const loginTimeRef = useRef<Date | null>(null);
  const isTableAvailableRef = useRef<boolean>(true);

  useEffect(() => {
    if (!user || !isTableAvailableRef.current) return;

    const recordLogin = async () => {
      try {
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            login_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
          })
          .select('id')
          .single();

        if (error) {
          // If table does not exist (404/PGRST204), mark as unavailable to prevent further queries
          if (error.code === 'PGRST204' || error.message?.includes('404') || error.code === '42P01') {
            isTableAvailableRef.current = false;
            return;
          }
          return;
        }

        if (data) {
          sessionIdRef.current = data.id;
          loginTimeRef.current = new Date();
        }
      } catch (error) {
        isTableAvailableRef.current = false;
      }
    };

    const recordLogout = async () => {
      if (!sessionIdRef.current || !loginTimeRef.current || !isTableAvailableRef.current) return;

      try {
        const logoutTime = new Date();
        const durationMinutes = Math.round(
          (logoutTime.getTime() - loginTimeRef.current.getTime()) / 60000
        );

        await supabase
          .from('user_sessions')
          .update({
            logout_at: logoutTime.toISOString(),
            session_duration_minutes: durationMinutes,
          })
          .eq('id', sessionIdRef.current);
      } catch (error) {
        // Silent catch
      }
    };

    recordLogin();

    const handleBeforeUnload = () => {
      recordLogout();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      recordLogout();
    };
  }, [user]);

  return null;
};

export default useSessionTracking;
