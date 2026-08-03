import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getActiveDomain, redirectToDomain } from '@/lib/domain';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, loading, isDemo } = useAdminAuth();
  const location = useLocation();

  useEffect(() => {
    // If a non-admin student attempts to access admin portal, redirect to student domain
    if (user && !isDemo) {
      const userRole = user.app_metadata?.role || user.user_metadata?.role;
      if (userRole === 'student') {
        redirectToDomain('student', '/dashboard');
      }
    }
  }, [user, isDemo]);

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
  const isUserAdmin = user && (
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin' ||
    user.email?.includes('admin')
  );

  const isAuthenticatedAdmin = isAdminDemo || isUserAdmin;

  if (!isAuthenticatedAdmin) {
    const isDev = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    return <Navigate to={isDev ? '/admin/login' : '/login'} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
