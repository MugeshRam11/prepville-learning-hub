import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { getActiveDomain, redirectToDomain } from '@/lib/domain';

interface StudentProtectedRouteProps {
  children: React.ReactNode;
}

const StudentProtectedRoute: React.FC<StudentProtectedRouteProps> = ({ children }) => {
  const { user, loading, isDemo } = useStudentAuth();
  const location = useLocation();

  const currentDomain = getActiveDomain();

  useEffect(() => {
    // If an Admin logs into the student portal, redirect them to admin domain
    if (user && !isDemo) {
      const userRole = user.app_metadata?.role || user.user_metadata?.role;
      if (userRole === 'admin') {
        redirectToDomain('admin', '/dashboard');
      }
    }
  }, [user, isDemo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading Student Portal...</span>
        </div>
      </div>
    );
  }

  // Allow access if student user exists or demo student is active
  const isAuthenticatedStudent = !!user || isDemo;

  if (!isAuthenticatedStudent) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default StudentProtectedRoute;
