
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Subjects from "./pages/Subjects";
import Practice from "./pages/Practice";
import QuickPractice from "./pages/QuickPractice";
import Quiz from "./pages/Quiz";
import MockExamSelect from "./pages/MockExamSelect";
import MockExamStart from "./pages/MockExamStart";
import MockExamSummary from "./pages/MockExamSummary";
import Videos from "./pages/Videos";
import Analytics from "./pages/Analytics";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
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
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/quick-practice" element={<QuickPractice />} />
          <Route path="/quiz/:quizId" element={<Quiz />} />
          <Route path="/mock-exams/select" element={<MockExamSelect />} />
          <Route path="/mock-exams/start" element={<MockExamStart />} />
          <Route path="/mock-exams/summary" element={<MockExamSummary />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
