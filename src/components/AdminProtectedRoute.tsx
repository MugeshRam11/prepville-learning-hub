import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { redirectToDomain } from '@/lib/domain';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, role, loading, isDemo } = useAdminAuth();
  const location = useLocation();

  useEffect(() => {
    // If a non-admin student user attempts to access admin portal, redirect to student domain
    if (user && !isDemo && role === 'student') {
      redirectToDomain('student', '/dashboard');
    }
  }, [user, role, isDemo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Verifying Admin Access...</span>
        </div>
      </div>
    );
  }

  const isAdminDemo = typeof window !== 'undefined' && (localStorage.getItem('demo_is_admin') === 'true' || isDemo);
  const isUserAdmin = !!user && role === 'admin';

  const isAuthenticatedAdmin = isAdminDemo || isUserAdmin;

  if (!isAuthenticatedAdmin) {
    const isDev = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    return <Navigate to={isDev ? '/admin/login' : '/login'} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
