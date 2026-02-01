import React from 'react';
import { AITutorChat } from '@/components/AITutorChat';
import { useChatbot } from '@/contexts/ChatbotContext';

interface GlobalChatbotProps {
  subject?: string;
}

/**
 * Global floating chatbot that appears on learning pages.
 * Automatically shows/hides based on route context via ChatbotContext.
 */
const GlobalChatbot: React.FC<GlobalChatbotProps> = ({ subject = 'General' }) => {
  const { isEnabled } = useChatbot();

  // Only render on learning pages (ChatbotContext determines this)
  if (!isEnabled) return null;

  return (
    <AITutorChat
      subject={subject}
      isOpen={true}
      onClose={() => {}}
      mode="practice"
    />
  );
};

export default GlobalChatbot;
