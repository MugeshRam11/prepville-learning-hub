import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isDemoSession, getDemoSession, clearDemoSession, DEMO_USER } from '@/lib/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If we have a real Supabase session, use it
        if (session) {
          setSession(session);
          setUser(session.user);
          setIsDemo(false);
          setLoading(false);

          // Create study groups user profile if user signs up
          if (event === 'SIGNED_IN' && session.user) {
            setTimeout(async () => {
              await ensureStudyGroupsUser(session.user);
            }, 0);
          }
        } else {
          // No Supabase session - check for demo session
          if (isDemoSession()) {
            const demoSession = getDemoSession();
            if (demoSession) {
              setUser(createMockDemoUser());
              setSession(demoSession as Session);
              setIsDemo(true);
            } else {
              setUser(null);
              setSession(null);
              setIsDemo(false);
            }
          } else {
            setUser(null);
            setSession(null);
            setIsDemo(false);
          }
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsDemo(false);
      } else if (isDemoSession()) {
        // Fallback to demo session if no Supabase session
        const demoSession = getDemoSession();
        if (demoSession) {
          setUser(createMockDemoUser());
          setSession(demoSession as Session);
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
        // Create study groups user profile
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    // Clear demo session if active
    if (isDemo) {
      clearDemoSession();
      setUser(null);
      setSession(null);
      setIsDemo(false);
    } else {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
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
