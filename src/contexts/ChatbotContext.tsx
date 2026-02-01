import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface ChatbotContextType {
  isEnabled: boolean;
  currentRoute: string;
}

const ChatbotContext = createContext<ChatbotContextType>({
  isEnabled: true,
  currentRoute: '/'
});

// Routes where chatbot should be DISABLED (exam/assessment contexts)
const DISABLED_ROUTES = [
  '/mock-exams/start',
  '/mock-exams/unified',
  '/mock-exams/interactive',
  '/mock-exams/summary',
  '/mock-exams/submitted',
  '/timed-challenge'
];

// Route prefixes to check
const DISABLED_PREFIXES = [
  '/mock-exams/unified/',
  '/mock-exams/interactive/'
];

export const ChatbotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  const value = useMemo(() => {
    const currentRoute = location.pathname;
    
    // Check if current route matches any disabled route exactly
    const isExactMatch = DISABLED_ROUTES.includes(currentRoute);
    
    // Check if current route starts with any disabled prefix
    const isPrefixMatch = DISABLED_PREFIXES.some(prefix => currentRoute.startsWith(prefix));
    
    const isEnabled = !isExactMatch && !isPrefixMatch;
    
    return {
      isEnabled,
      currentRoute
    };
  }, [location.pathname]);
  
  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  return context;
};

export default ChatbotContext;
