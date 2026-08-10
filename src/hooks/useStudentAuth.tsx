import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseStudent } from '@/lib/supabaseStudent';
import { isDemoSession, getDemoSession, clearDemoSession, createDemoSession, DEMO_USER } from '@/lib/authService';
import { fetchUserRole, UserAppRole } from '@/lib/roleService';

interface StudentAuthContextType {
  user: User | null;
  session: Session | null;
  role: UserAppRole | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any, role?: UserAppRole }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInDemoStudent: () => void;
  signOut: () => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

const createMockStudentUser = (): User => {
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
      last_name: 'Student',
      role: 'student',
      is_demo: true,
    },
    app_metadata: {
      provider: 'demo',
      role: 'student',
      is_demo: true,
    },
  } as User;
};

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserAppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabaseStudent.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setIsDemo(false);
          const dbRole = await fetchUserRole(session.user.id);
          setRole(dbRole);
          setLoading(false);
        } else {
          if (isDemoSession() && localStorage.getItem('demo_is_admin') !== 'true') {
            const demoSession = getDemoSession();
            if (demoSession) {
              setUser(createMockStudentUser());
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

    supabaseStudent.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setIsDemo(false);
        const dbRole = await fetchUserRole(session.user.id);
        setRole(dbRole);
      } else if (isDemoSession() && localStorage.getItem('demo_is_admin') !== 'true') {
        const demoSession = getDemoSession();
        if (demoSession) {
          setUser(createMockStudentUser());
          setSession(demoSession as Session);
          setRole('student');
          setIsDemo(true);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabaseStudent.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: username,
          role: 'student'
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabaseStudent.auth.signInWithPassword({
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

  const resetPassword = async (email: string) => {
    const { error } = await supabaseStudent.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error };
  };

  const signInDemoStudent = () => {
    localStorage.removeItem('demo_is_admin');
    const mockSession = createDemoSession();
    setUser(createMockStudentUser());
    setSession(mockSession as unknown as Session);
    setRole('student');
    setIsDemo(true);
  };

  const signOut = async () => {
    if (isDemo) {
      clearDemoSession();
      setUser(null);
      setSession(null);
      setRole(null);
      setIsDemo(false);
    } else {
      await supabaseStudent.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

  return (
    <StudentAuthContext.Provider value={{
      user,
      session,
      role,
      loading,
      isDemo,
      signUp,
      signIn,
      resetPassword,
      signInDemoStudent,
      signOut
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};
