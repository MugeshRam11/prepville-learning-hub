import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from '@/hooks/useAuth';
import { StudentAuthProvider } from '@/hooks/useStudentAuth';
import { AdminAuthProvider } from '@/hooks/useAdminAuth';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { ChatbotProvider } from '@/contexts/ChatbotContext';
import StreakAutoRecorder from "./components/StreakAutoRecorder";
import { useSessionTracking } from '@/hooks/useSessionTracking';
import CopyPasteProtection from "./components/CopyPasteProtection";
import { DomainRouter } from "./routes/DomainRouter";

const SessionTracker = () => {
  useSessionTracking();
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StudentAuthProvider>
        <AdminAuthProvider>
          <SubscriptionProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <StreakAutoRecorder />
              <SessionTracker />
              <BrowserRouter>
                <ChatbotProvider>
                  <CopyPasteProtection>
                    <DomainRouter />
                  </CopyPasteProtection>
                </ChatbotProvider>
              </BrowserRouter>
            </TooltipProvider>
          </SubscriptionProvider>
        </AdminAuthProvider>
      </StudentAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;