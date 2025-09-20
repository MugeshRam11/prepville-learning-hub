
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Quiz from "./pages/Quiz";
import QuickPractice from "./pages/QuickPractice";
import Practice from "./pages/Practice";
import MockExamSelect from "./pages/MockExamSelect";
import MockExamStart from "./pages/MockExamStart";
import MockExamSummary from "./pages/MockExamSummary";
import StudentDashboard from "./pages/StudentDashboard";
import Subjects from "./pages/Subjects";
import Videos from "./pages/Videos";
import Pricing from "./pages/Pricing";
import Subscription from "./pages/Subscription";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminTests from "./pages/AdminTests";
import AdminQuestions from "./pages/AdminQuestions";
import AdminReports from "./pages/AdminReports";
import AdminMockTests from "./pages/AdminMockTests";
import AdminMockTestCreate from "./pages/AdminMockTestCreate";
import AdminMockTestEdit from "./pages/AdminMockTestEdit";
import AdminMockTestView from "./pages/AdminMockTestView";
import StudyGroups from "./pages/StudyGroups";
import NotFound from "./pages/NotFound";
import LevelDetails from "./pages/LevelDetails";
import SubjectLearning from "./pages/SubjectLearning";
import ProtectedRoute from "./components/ProtectedRoute";

import { AuthProvider } from '@/hooks/useAuth';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import StreakAutoRecorder from "./components/StreakAutoRecorder";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
      <Toaster />
      <Sonner />
      <StreakAutoRecorder />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/subscription" element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          } />
          <Route path="/quiz/:quizId" element={
            <ProtectedRoute requiresSubscription>
              <Quiz />
            </ProtectedRoute>
          } />
          <Route path="/quick-practice" element={
            <ProtectedRoute requiresSubscription>
              <QuickPractice />
            </ProtectedRoute>
          } />
          <Route path="/practice" element={
            <ProtectedRoute requiresSubscription>
              <Practice />
            </ProtectedRoute>
          } />
          <Route path="/mock-exams/select" element={
            <ProtectedRoute requiresSubscription>
              <MockExamSelect />
            </ProtectedRoute>
          } />
          <Route path="/mock-exams/start" element={
            <ProtectedRoute requiresSubscription>
              <MockExamStart />
            </ProtectedRoute>
          } />
          <Route path="/mock-exams/summary" element={
            <ProtectedRoute requiresSubscription>
              <MockExamSummary />
            </ProtectedRoute>
          } />
          <Route path="/subjects" element={
            <ProtectedRoute requiresSubscription>
              <Subjects />
            </ProtectedRoute>
          } />
          <Route path="/subject-learning" element={
            <ProtectedRoute requiresSubscription>
              <SubjectLearning />
            </ProtectedRoute>
          } />
          <Route path="/videos" element={
            <ProtectedRoute requiresSubscription>
              <Videos />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute requiresSubscription>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/tests" element={
            <ProtectedRoute>
              <AdminTests />
            </ProtectedRoute>
          } />
          <Route path="/admin/questions" element={
            <ProtectedRoute>
              <AdminQuestions />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/mock-tests" element={
            <ProtectedRoute>
              <AdminMockTests />
            </ProtectedRoute>
          } />
          <Route path="/admin/mock-tests/create" element={
            <ProtectedRoute>
              <AdminMockTestCreate />
            </ProtectedRoute>
          } />
          <Route path="/admin/mock-tests/edit/:id" element={
            <ProtectedRoute>
              <AdminMockTestEdit />
            </ProtectedRoute>
          } />
          <Route path="/admin/mock-tests/view/:id" element={
            <ProtectedRoute>
              <AdminMockTestView />
            </ProtectedRoute>
          } />
          <Route path="/study-groups" element={
            <ProtectedRoute>
              <StudyGroups />
            </ProtectedRoute>
          } />
          <Route path="/level-details" element={
            <ProtectedRoute>
              <LevelDetails />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
</QueryClientProvider>
);

export default App;
