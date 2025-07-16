
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
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMockTests from "./pages/AdminMockTests";
import AdminMockTestCreate from "./pages/AdminMockTestCreate";
import AdminMockTestEdit from "./pages/AdminMockTestEdit";
import AdminMockTestView from "./pages/AdminMockTestView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/quiz/:quizId" element={<Quiz />} />
          <Route path="/quick-practice" element={<QuickPractice />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/mock-exams/select" element={<MockExamSelect />} />
          <Route path="/mock-exams/start" element={<MockExamStart />} />
          <Route path="/mock-exams/summary" element={<MockExamSummary />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/mock-tests" element={<AdminMockTests />} />
          <Route path="/admin/mock-tests/create" element={<AdminMockTestCreate />} />
          <Route path="/admin/mock-tests/:id/edit" element={<AdminMockTestEdit />} />
          <Route path="/admin/mock-tests/:id/view" element={<AdminMockTestView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
