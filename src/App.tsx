
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
import StudyMaterials from "./pages/StudyMaterials";
import StudyMaterialReader from "./pages/StudyMaterialReader";
import Pricing from "./pages/Pricing";
import Subscription from "./pages/Subscription";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminTests from "./pages/AdminTests";
import AdminQuestions from "./pages/AdminQuestions";
import AdminBulkUpload from "./pages/AdminBulkUpload";
import AdminMockTestBulkUpload from "./pages/AdminMockTestBulkUpload";
import AdminReports from "./pages/AdminReports";
import AdminMockTests from "./pages/AdminMockTests";
import AdminMockTestCreate from "./pages/AdminMockTestCreate";
import AdminMockTestEdit from "./pages/AdminMockTestEdit";
import AdminMockTestView from "./pages/AdminMockTestView";
import AdminStudyMaterials from "./pages/AdminStudyMaterials";
import StudyGroups from "./pages/StudyGroups";
import GraphingTool from "./pages/GraphingTool";
import FormulaHelper from "./pages/FormulaHelper";
import TimedChallenge from "./pages/TimedChallenge";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import LevelDetails from "./pages/LevelDetails";
import SubjectLearning from "./pages/SubjectLearning";
import QuestionBuilder from "./pages/QuestionBuilder";
import ProtectedRoute from "./components/ProtectedRoute";

import { AuthProvider } from '@/hooks/useAuth';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import StreakAutoRecorder from "./components/StreakAutoRecorder";
import { useSessionTracking } from '@/hooks/useSessionTracking';

const SessionTracker = () => {
  useSessionTracking();
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
      <Toaster />
      <Sonner />
      <StreakAutoRecorder />
      <SessionTracker />
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
          <Route path="/study-materials" element={
            <ProtectedRoute requiresSubscription>
              <StudyMaterials />
            </ProtectedRoute>
          } />
          <Route path="/study-materials/read/:id" element={
            <ProtectedRoute requiresSubscription>
              <StudyMaterialReader />
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
          <Route path="/admin/bulk-upload" element={
            <ProtectedRoute>
              <AdminBulkUpload />
            </ProtectedRoute>
          } />
          <Route path="/admin/mock-test-bulk-upload" element={
            <ProtectedRoute>
              <AdminMockTestBulkUpload />
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
          <Route path="/admin/study-materials" element={
            <ProtectedRoute>
              <AdminStudyMaterials />
            </ProtectedRoute>
          } />
          <Route path="/admin/question-builder" element={
            <ProtectedRoute>
              <QuestionBuilder />
            </ProtectedRoute>
          } />
          <Route path="/study-groups" element={
            <ProtectedRoute>
              <StudyGroups />
            </ProtectedRoute>
          } />
          <Route path="/graphing-tool" element={
            <ProtectedRoute requiresSubscription>
              <GraphingTool />
            </ProtectedRoute>
          } />
          <Route path="/formula-helper" element={
            <ProtectedRoute requiresSubscription>
              <FormulaHelper />
            </ProtectedRoute>
          } />
          <Route path="/timed-challenge" element={
            <ProtectedRoute requiresSubscription>
              <TimedChallenge />
            </ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <Leaderboard />
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
