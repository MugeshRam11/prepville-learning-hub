import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEMO_ADMIN, createDemoAdminSession, clearDemoSession, isDemoSession } from '@/lib/authService';
import { fetchUserRole, UserAppRole } from '@/lib/roleService';

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  role: UserAppRole | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any, role?: UserAppRole }>;
  signInDemoAdmin: () => void;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const createMockAdminUser = (): User => {
  return {
    id: DEMO_ADMIN.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: DEMO_ADMIN.email,
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: {
      full_name: DEMO_ADMIN.name,
      first_name: 'PrepVille',
      last_name: 'Admin',
      role: 'admin',
      is_demo: true,
    },
    app_metadata: {
      provider: 'demo',
      role: 'admin',
      is_demo: true,
    },
  } as User;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserAppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let generation = 0;
    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange(
      (_event, session) => {
        const current = ++generation;
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setIsDemo(false);
          setLoading(true);
          // Auth emits INITIAL_SESSION as well as sign-in and refresh events.
          // Query roles after the auth callback releases the session lock.
          setTimeout(async () => {
            if (current !== generation) return;
            const dbRole = await fetchUserRole(session.user.id);
            if (current === generation) { setRole(dbRole); setLoading(false); }
          }, 0);
        } else {
          if (isDemoSession() && localStorage.getItem('demo_is_admin') === 'true') {
            setUser(createMockAdminUser());
            setRole('admin');
            setIsDemo(true);
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

    return () => { generation++; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
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

  const signInDemoAdmin = () => {
    const mockSession = createDemoAdminSession();
    setUser(createMockAdminUser());
    setSession(mockSession as unknown as Session);
    setRole('admin');
    setIsDemo(true);
  };

  const signOut = async () => {
    if (isDemo) {
      clearDemoSession();
      localStorage.removeItem('demo_is_admin');
      setUser(null);
      setSession(null);
      setRole(null);
      setIsDemo(false);
    } else {
      await supabaseAdmin.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

  return (
    <AdminAuthContext.Provider value={{
      user,
      session,
      role,
      loading,
      isDemo,
      signIn,
      signInDemoAdmin,
      signOut
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
