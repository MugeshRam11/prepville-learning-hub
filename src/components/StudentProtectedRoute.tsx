import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useQuery } from '@tanstack/react-query';
import { supabaseStudent } from '@/lib/supabaseStudent';
import { redirectToDomain } from '@/lib/domain';

interface StudentProtectedRouteProps {
  children: React.ReactNode;
}

const StudentProtectedRoute: React.FC<StudentProtectedRouteProps> = ({
  children,
}) => {
  const { user, role, loading, isDemo } = useStudentAuth();
  const location = useLocation();

  const exempt = ['/onboarding', '/support'].includes(location.pathname);
  const check = !exempt && !isDemo && !!user && role === 'student';
  const account = useQuery({
    queryKey: ['student-onboarding', user?.id, location.pathname],
    enabled: check,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    queryFn: async () => {
      const db =
        supabaseStudent as unknown as import('@supabase/supabase-js').SupabaseClient;
      const { data, error } = await db
        .from('student_accounts')
        .select('completed_at')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data?.completed_at;
    },
  });

  useEffect(() => {
    // If a confirmed Admin user accesses the student portal, redirect to admin domain
    if (user && !isDemo && role === 'admin') {
      redirectToDomain('admin', '/dashboard');
    }
  }, [user, role, isDemo]);

  if (loading || (check && account.isPending)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">
            Loading Student Portal...
          </span>
        </div>
      </div>
    );
  }

  // Allow access if user is logged in as a student (or demo student)
  const isAuthenticatedStudent = isDemo || (!!user && role === 'student');

  if (!isAuthenticatedStudent) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (check && account.isError)
    return (
      <main role="alert">
        Could not verify onboarding.{' '}
        <button onClick={() => account.refetch()}>Retry</button>{' '}
        <a href="/support">Support</a>
      </main>
    );
  if (check && !account.data) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

export default StudentProtectedRoute;
