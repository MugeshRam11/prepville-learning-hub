import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const loginTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    const recordLogin = async () => {
      try {
        // Record login session
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            login_at: new Date().toISOString(),
            user_agent: navigator.userAgent
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error recording login:', error);
          return;
        }

        if (data) {
          sessionIdRef.current = data.id;
          loginTimeRef.current = new Date();
        }
      } catch (error) {
        console.error('Failed to record login:', error);
      }
    };

    const recordLogout = async () => {
      if (!sessionIdRef.current || !loginTimeRef.current) return;

      try {
        const logoutTime = new Date();
        const durationMinutes = Math.round(
          (logoutTime.getTime() - loginTimeRef.current.getTime()) / 60000
        );

        await supabase
          .from('user_sessions')
          .update({
            logout_at: logoutTime.toISOString(),
            session_duration_minutes: durationMinutes
          })
          .eq('id', sessionIdRef.current);
      } catch (error) {
        console.error('Failed to record logout:', error);
      }
    };

    // Record login when user is authenticated
    recordLogin();

    // Record logout on page unload
    const handleBeforeUnload = () => {
      recordLogout();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      recordLogout();
    };
  }, [user]);

  return null;
};
