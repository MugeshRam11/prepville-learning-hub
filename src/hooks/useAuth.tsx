import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isDemoSession, getDemoSession, clearDemoSession, DEMO_USER } from '@/lib/authService';
import { fetchUserRole, UserAppRole } from '@/lib/roleService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserAppRole | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any, role?: UserAppRole }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Create a mock User object from demo session for type compatibility
 */
const createMockDemoUser = (): User => {
  return {
    id: DEMO_USER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: DEMO_USER.email,
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: {
      full_name: DEMO_USER.name,
      first_name: 'Demo',
      last_name: 'User',
      role: DEMO_USER.role,
      is_demo: true,
    },
    app_metadata: {
      provider: 'demo',
      is_demo: true,
    },
  } as User;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserAppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setIsDemo(false);
          const dbRole = await fetchUserRole(session.user.id);
          setRole(dbRole);
          setLoading(false);

          if (event === 'SIGNED_IN' && session.user) {
            setTimeout(async () => {
              await ensureStudyGroupsUser(session.user);
            }, 0);
          }
        } else {
          if (isDemoSession()) {
            const demoSession = getDemoSession();
            if (demoSession) {
              setUser(createMockDemoUser());
              setSession(demoSession as Session);
              setRole('student');
              setIsDemo(true);
            } else {
              setUser(null);
              setSession(null);
              setRole(null);
              setIsDemo(false);
            }
          } else {
            setUser(null);
            setSession(null);
            setRole(null);
            setIsDemo(false);
          }
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setIsDemo(false);
        const dbRole = await fetchUserRole(session.user.id);
        setRole(dbRole);
      } else if (isDemoSession()) {
        const demoSession = getDemoSession();
        if (demoSession) {
          setUser(createMockDemoUser());
          setSession(demoSession as Session);
          setRole('student');
          setIsDemo(true);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureStudyGroupsUser = async (user: User) => {
    try {
      const { data: existingUser } = await supabase
        .from('study_groups_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existingUser) {
        const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
        
        await supabase
          .from('study_groups_users')
          .insert({
            user_id: user.id,
            username: username,
            role: 'student'
          });
      }
    } catch (error) {
      console.error('Error creating study groups user:', error);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username: username
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    let userRole: UserAppRole = 'student';
    if (data?.user) {
      userRole = await fetchUserRole(data.user.id);
      setRole(userRole);
    }

    return { error, role: userRole };
  };

  const signOut = async () => {
    if (isDemo) {
      clearDemoSession();
      setUser(null);
      setSession(null);
      setRole(null);
      setIsDemo(false);
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      loading,
      isDemo,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
