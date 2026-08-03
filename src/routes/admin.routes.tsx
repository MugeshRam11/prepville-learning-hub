import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routeConstants';
import DomainRedirect from './DomainRedirect';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getDomainUrl } from '@/lib/domain';

// Lazy-loaded Admin Pages
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const AdminForgotPassword = lazy(() => import('@/pages/AdminForgotPassword'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));
const AdminAssignments = lazy(() => import('@/pages/AdminAssignments'));
const AdminStudentsProgress = lazy(() => import('@/pages/AdminStudentsProgress'));
const AdminEvaluation = lazy(() => import('@/pages/AdminEvaluation'));
const AdminTests = lazy(() => import('@/pages/AdminTests'));
const AdminQuickTestCreate = lazy(() => import('@/pages/AdminQuickTestCreate'));
const AdminQuestions = lazy(() => import('@/pages/AdminQuestions'));
const AdminPracticeCreate = lazy(() => import('@/pages/AdminPracticeCreate'));
const AdminReports = lazy(() => import('@/pages/AdminReports'));
const AdminMockTests = lazy(() => import('@/pages/AdminMockTests'));
const AdminMockTestCreate = lazy(() => import('@/pages/AdminMockTestCreate'));
const AdminMockTestEdit = lazy(() => import('@/pages/AdminMockTestEdit'));
const AdminMockTestView = lazy(() => import('@/pages/AdminMockTestView'));
const AdminStudyMaterials = lazy(() => import('@/pages/AdminStudyMaterials'));
const AdminSettings = lazy(() => import('@/pages/AdminSettings'));
const AdminBilling = lazy(() => import('@/pages/AdminBilling'));
const AdminExamBuilder = lazy(() => import('@/pages/AdminExamBuilder'));
const NotFound = lazy(() => import('@/pages/NotFound'));

/**
 * Root route guard for admin domain (/ or /admin)
 */
const AdminRootGuard: React.FC = () => {
  const { user, loading, isDemo } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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

  if (isAuthenticatedAdmin) {
    const isDev = window.location.pathname.startsWith('/admin');
    return <Navigate to={isDev ? '/admin/dashboard' : ROUTES.ADMIN.DASHBOARD} replace />;
  }

  if (user && !isAuthenticatedAdmin) {
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole === 'student') {
      return <DomainRedirect domain="student" path={ROUTES.STUDENT.DASHBOARD} />;
    }
  }

  const isDev = window.location.pathname.startsWith('/admin');
  return <Navigate to={isDev ? '/admin/login' : ROUTES.ADMIN.LOGIN} replace />;
};

/**
 * Auth page guard for admin auth routes (/login, /admin/login, /forgot-password, /admin/forgot-password)
 */
const AdminAuthGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading, isDemo } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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

  if (isAuthenticatedAdmin) {
    const isDev = window.location.pathname.startsWith('/admin');
    return <Navigate to={isDev ? '/admin/dashboard' : ROUTES.ADMIN.DASHBOARD} replace />;
  }

  if (user && !isAuthenticatedAdmin) {
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole === 'student') {
      return <DomainRedirect domain="student" path={ROUTES.STUDENT.DASHBOARD} />;
    }
  }

  return children;
};

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Admin Routes */}
      <Route path="/" element={<AdminRootGuard />} />
      <Route path="/admin" element={<AdminRootGuard />} />
      <Route path="/admin/" element={<AdminRootGuard />} />

      {/* Admin Login */}
      <Route
        path="/login"
        element={
          <AdminAuthGuard>
            <AdminLogin />
          </AdminAuthGuard>
        }
      />
      <Route
        path="/admin/login"
        element={
          <AdminAuthGuard>
            <AdminLogin />
          </AdminAuthGuard>
        }
      />

      {/* Admin Forgot Password */}
      <Route
        path="/forgot-password"
        element={
          <AdminAuthGuard>
            <AdminForgotPassword />
          </AdminAuthGuard>
        }
      />
      <Route
        path="/admin/forgot-password"
        element={
          <AdminAuthGuard>
            <AdminForgotPassword />
          </AdminAuthGuard>
        }
      />

      {/* Redirect Student Register/Signup on Admin domain to Student domain */}
      <Route path="/register" element={<DomainRedirect domain="student" path={ROUTES.STUDENT.REGISTER} />} />
      <Route path="/signup" element={<DomainRedirect domain="student" path={ROUTES.STUDENT.REGISTER} />} />
      <Route path="/admin/register" element={<DomainRedirect domain="student" path={ROUTES.STUDENT.REGISTER} />} />

      {/* Admin Dashboard */}
      <Route
        path="/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Users */}
      <Route
        path="/users"
        element={
          <AdminProtectedRoute>
            <AdminUsers />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtectedRoute>
            <AdminUsers />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Assignments */}
      <Route
        path="/assignments"
        element={
          <AdminProtectedRoute>
            <AdminAssignments />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <AdminProtectedRoute>
            <AdminAssignments />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Students Progress */}
      <Route
        path="/students-progress"
        element={
          <AdminProtectedRoute>
            <AdminStudentsProgress />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/students-progress"
        element={
          <AdminProtectedRoute>
            <AdminStudentsProgress />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Evaluation */}
      <Route
        path="/evaluation"
        element={
          <AdminProtectedRoute>
            <AdminEvaluation />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/evaluation"
        element={
          <AdminProtectedRoute>
            <AdminEvaluation />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Tests */}
      <Route
        path="/tests"
        element={
          <AdminProtectedRoute>
            <AdminTests />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/tests"
        element={
          <AdminProtectedRoute>
            <AdminTests />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Quick Tests Create */}
      <Route
        path="/quick-tests/create"
        element={
          <AdminProtectedRoute>
            <AdminQuickTestCreate />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/quick-tests/create"
        element={
          <AdminProtectedRoute>
            <AdminQuickTestCreate />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Questions */}
      <Route
        path="/questions"
        element={
          <AdminProtectedRoute>
            <AdminQuestions />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/questions"
        element={
          <AdminProtectedRoute>
            <AdminQuestions />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Practice Create / Edit */}
      <Route
        path="/practice/create"
        element={
          <AdminProtectedRoute>
            <AdminPracticeCreate />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/practice/create"
        element={
          <AdminProtectedRoute>
            <AdminPracticeCreate />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/practice/edit/:id"
        element={
          <AdminProtectedRoute>
            <AdminPracticeCreate />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/practice/edit/:id"
        element={
          <AdminProtectedRoute>
            <AdminPracticeCreate />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Reports */}
      <Route
        path="/reports"
        element={
          <AdminProtectedRoute>
            <AdminReports />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminProtectedRoute>
            <AdminReports />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Mock Tests */}
      <Route
        path="/mock-tests"
        element={
          <AdminProtectedRoute>
            <AdminMockTests />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/mock-tests"
        element={
          <AdminProtectedRoute>
            <AdminMockTests />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/mock-tests/create"
        element={
          <AdminProtectedRoute>
            <AdminMockTestCreate />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/mock-tests/create"
        element={
          <AdminProtectedRoute>
            <AdminMockTestCreate />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/mock-tests/edit/:id"
        element={
          <AdminProtectedRoute>
            <AdminMockTestEdit />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/mock-tests/edit/:id"
        element={
          <AdminProtectedRoute>
            <AdminMockTestEdit />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/mock-tests/view/:id"
        element={
          <AdminProtectedRoute>
            <AdminMockTestView />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/mock-tests/view/:id"
        element={
          <AdminProtectedRoute>
            <AdminMockTestView />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Study Materials */}
      <Route
        path="/study-materials"
        element={
          <AdminProtectedRoute>
            <AdminStudyMaterials />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/study-materials"
        element={
          <AdminProtectedRoute>
            <AdminStudyMaterials />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Settings */}
      <Route
        path="/settings"
        element={
          <AdminProtectedRoute>
            <AdminSettings />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminProtectedRoute>
            <AdminSettings />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Billing */}
      <Route
        path="/billing"
        element={
          <AdminProtectedRoute>
            <AdminBilling />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/billing"
        element={
          <AdminProtectedRoute>
            <AdminBilling />
          </AdminProtectedRoute>
        }
      />

      {/* Admin Exam Builder */}
      <Route
        path="/exam-builder"
        element={
          <AdminProtectedRoute>
            <AdminExamBuilder />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/exam-builder"
        element={
          <AdminProtectedRoute>
            <AdminExamBuilder />
          </AdminProtectedRoute>
        }
      />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AdminRoutes;
