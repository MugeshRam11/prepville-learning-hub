import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routeConstants';
import DomainRedirect from './DomainRedirect';
import StudentProtectedRoute from '@/components/StudentProtectedRoute';
import { useStudentAuth } from '@/hooks/useStudentAuth';

// Lazy-loaded Student Pages
const StudentLogin = lazy(() => import('@/pages/StudentLogin'));
const StudentRegister = lazy(() => import('@/pages/StudentRegister'));
const ConfirmAccount = lazy(() => import('@/pages/ConfirmAccount'));
const StudentForgotPassword = lazy(() => import('@/pages/StudentForgotPassword'));
const StudentDashboard = lazy(() => import('@/pages/StudentDashboard'));
const Practice = lazy(() => import('@/pages/Practice'));
const PracticeQuestionView = lazy(() => import('@/pages/PracticeQuestionView'));
const QuickPractice = lazy(() => import('@/pages/QuickPractice'));
const Quiz = lazy(() => import('@/pages/Quiz'));
const MockExamSelect = lazy(() => import('@/pages/MockExamSelect'));
const MockExamSubjectView = lazy(() => import('@/pages/MockExamSubjectView'));
const MockExamStart = lazy(() => import('@/pages/MockExamStart'));
const MockExamSummary = lazy(() => import('@/pages/MockExamSummary'));
const InteractiveMockDemo = lazy(() => import('@/pages/InteractiveMockDemo'));
const UnifiedMockExam = lazy(() => import('@/pages/UnifiedMockExam'));
const ExamSubmitted = lazy(() => import('@/pages/ExamSubmitted'));
const StudentExamResults = lazy(() => import('@/pages/StudentExamResults'));
const ExamResults = lazy(() => import('@/pages/ExamResults'));
const StudentAssignments = lazy(() => import('@/pages/StudentAssignments'));
const Subjects = lazy(() => import('@/pages/Subjects'));
const SubjectLearning = lazy(() => import('@/pages/SubjectLearning'));
const Videos = lazy(() => import('@/pages/Videos'));
const StudyMaterials = lazy(() => import('@/pages/StudyMaterials'));
const StudyMaterialReader = lazy(() => import('@/pages/StudyMaterialReader'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const StudyGroups = lazy(() => import('@/pages/StudyGroups'));
const GraphingTool = lazy(() => import('@/pages/GraphingTool'));
const FormulaHelper = lazy(() => import('@/pages/FormulaHelper'));
const TimedChallenge = lazy(() => import('@/pages/TimedChallenge'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const LevelDetails = lazy(() => import('@/pages/LevelDetails'));
const Subscription = lazy(() => import('@/pages/Subscription'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const NotFound = lazy(() => import('@/pages/NotFound'));

/**
 * Root route guard for student domain (/)
 */
const StudentRootGuard: React.FC = () => {
  const { user, role, loading } = useStudentAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (role === 'admin') {
      return <DomainRedirect domain="admin" path={ROUTES.ADMIN.DASHBOARD} />;
    }
    return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />;
  }

  return <Navigate to={ROUTES.STUDENT.LOGIN} replace />;
};

/**
 * Auth page guard: Redirects authenticated users away from /login, /register, /forgot-password
 */
const StudentAuthGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, role, loading } = useStudentAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (role === 'admin') {
      return <DomainRedirect domain="admin" path={ROUTES.ADMIN.DASHBOARD} />;
    }
    return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />;
  }

  return children;
};

export const StudentRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Domain Route */}
      <Route path={ROUTES.STUDENT.ROOT} element={<StudentRootGuard />} />

      {/* Student Auth Routes */}
      <Route
        path={ROUTES.STUDENT.LOGIN}
        element={
          <StudentAuthGuard>
            <StudentLogin />
          </StudentAuthGuard>
        }
      />
      <Route
        path={ROUTES.STUDENT.REGISTER}
        element={
          <StudentAuthGuard>
            <StudentRegister />
          </StudentAuthGuard>
        }
      />
      <Route
        path={ROUTES.STUDENT.CONFIRM}
        element={<ConfirmAccount />}
      />
      <Route
        path={ROUTES.STUDENT.FORGOT_PASSWORD}
        element={
          <StudentAuthGuard>
            <StudentForgotPassword />
          </StudentAuthGuard>
        }
      />

      {/* Legacy auth route aliases */}
      <Route path="/signup" element={<Navigate to={ROUTES.STUDENT.REGISTER} replace />} />
      <Route path="/auth" element={<Navigate to={ROUTES.STUDENT.REGISTER} replace />} />

      {/* Redirect admin URL attempts on student domain to admin domain */}
      <Route path="/admin/*" element={<DomainRedirect domain="admin" path={ROUTES.ADMIN.LOGIN} />} />

      {/* Protected Student Feature Routes */}
      <Route
        path={ROUTES.STUDENT.DASHBOARD}
        element={
          <StudentProtectedRoute>
            <StudentDashboard />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.ONBOARDING}
        element={
          <StudentProtectedRoute>
            <Onboarding />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.SUBSCRIPTION}
        element={
          <StudentProtectedRoute>
            <Subscription />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.PRACTICE}
        element={
          <StudentProtectedRoute>
            <Practice />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.PRACTICE_QUESTION}
        element={
          <StudentProtectedRoute>
            <PracticeQuestionView />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.PRACTICE_SET}
        element={
          <StudentProtectedRoute>
            <PracticeQuestionView />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.QUICK_PRACTICE}
        element={
          <StudentProtectedRoute>
            <QuickPractice />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.QUIZ}
        element={
          <StudentProtectedRoute>
            <Quiz />
          </StudentProtectedRoute>
        }
      />

      {/* Mock Exams */}
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_SELECT}
        element={
          <StudentProtectedRoute>
            <MockExamSelect />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_SUBJECT}
        element={
          <StudentProtectedRoute>
            <MockExamSubjectView />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_START}
        element={
          <StudentProtectedRoute>
            <MockExamStart />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_SUMMARY}
        element={
          <StudentProtectedRoute>
            <MockExamSummary />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_INTERACTIVE_DEMO}
        element={
          <StudentProtectedRoute>
            <InteractiveMockDemo />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_UNIFIED}
        element={
          <StudentProtectedRoute>
            <UnifiedMockExam />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_UNIFIED_TEST}
        element={
          <StudentProtectedRoute>
            <UnifiedMockExam />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_SUBMITTED}
        element={
          <StudentProtectedRoute>
            <ExamSubmitted />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.MOCK_EXAMS_RESULTS}
        element={
          <StudentProtectedRoute>
            <StudentExamResults />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.RESULTS}
        element={
          <StudentProtectedRoute>
            <ExamResults />
          </StudentProtectedRoute>
        }
      />

      {/* General Student Features */}
      <Route
        path={ROUTES.STUDENT.ASSIGNMENTS}
        element={
          <StudentProtectedRoute>
            <StudentAssignments />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.SUBJECTS}
        element={
          <StudentProtectedRoute>
            <Subjects />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.SUBJECT_LEARNING}
        element={
          <StudentProtectedRoute>
            <SubjectLearning />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.VIDEOS}
        element={
          <StudentProtectedRoute>
            <Videos />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.STUDY_MATERIALS}
        element={
          <StudentProtectedRoute>
            <StudyMaterials />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.STUDY_MATERIALS_READ}
        element={
          <StudentProtectedRoute>
            <StudyMaterialReader />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.ANALYTICS}
        element={
          <StudentProtectedRoute>
            <Analytics />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.STUDY_GROUPS}
        element={
          <StudentProtectedRoute>
            <StudyGroups />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.GRAPHING_TOOL}
        element={
          <StudentProtectedRoute>
            <GraphingTool />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.FORMULA_HELPER}
        element={
          <StudentProtectedRoute>
            <FormulaHelper />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.TIMED_CHALLENGE}
        element={
          <StudentProtectedRoute>
            <TimedChallenge />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.LEADERBOARD}
        element={
          <StudentProtectedRoute>
            <Leaderboard />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.LEVEL_DETAILS}
        element={
          <StudentProtectedRoute>
            <LevelDetails />
          </StudentProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.NOTIFICATIONS}
        element={
          <StudentProtectedRoute>
            <Notifications />
          </StudentProtectedRoute>
        }
      />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default StudentRoutes;
