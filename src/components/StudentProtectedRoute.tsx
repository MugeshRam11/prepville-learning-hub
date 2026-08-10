import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { redirectToDomain } from '@/lib/domain';

interface StudentProtectedRouteProps {
  children: React.ReactNode;
}

const StudentProtectedRoute: React.FC<StudentProtectedRouteProps> = ({ children }) => {
  const { user, role, loading, isDemo } = useStudentAuth();
  const location = useLocation();

  useEffect(() => {
    // If a confirmed Admin user accesses the student portal, redirect to admin domain
    if (user && !isDemo && role === 'admin') {
      redirectToDomain('admin', '/dashboard');
    }
  }, [user, role, isDemo]);

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

  // Allow access if user is logged in as a student (or demo student)
  const isAuthenticatedStudent = isDemo || (!!user && role === 'student');

  if (!isAuthenticatedStudent) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default StudentProtectedRoute;
