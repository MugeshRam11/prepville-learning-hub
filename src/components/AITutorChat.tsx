import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EquationEditor from '@/components/admin/EquationEditor';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AITutorChatProps {
  subject: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AITutorChat = ({ subject, isOpen, onClose }: AITutorChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && isExpanded && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'm your ${subject} tutor. Ask me anything about ${subject} concepts, problem-solving strategies, or exam preparation tips!`
        }
      ]);
    }
  }, [isOpen, isExpanded, subject]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          subject,
          message: userMessage,
          conversationHistory: messages
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "AI Tutor Unavailable",
          description: data.error,
          variant: "destructive"
        });
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment."
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI tutor. Please try again.",
        variant: "destructive"
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try asking your question again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMathText = (text: string) => {
    // Check if the text contains LaTeX commands (starts with backslash)
    const hasLatex = /\\[a-zA-Z]+/.test(text);
    
    if (hasLatex) {
      // If it's mostly LaTeX (no $ delimiters), render the entire text as LaTeX
      try {
        const html = katex.renderToString(text, {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (error) {
        console.error('LaTeX rendering error:', error);
        return <span className="text-red-500">LaTeX Error: {text}</span>;
      }
    } else {
      // Split text by $...$ patterns to find LaTeX equations in regular text
      const parts = text.split(/(\$[^$]+\$)/g);
      
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // This is a LaTeX equation
          const equation = part.slice(1, -1); // Remove the $ symbols
          try {
            const html = katex.renderToString(equation, {
              displayMode: false,
              throwOnError: false,
              errorColor: '#cc0000',
              strict: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (error) {
            return <span key={index} className="text-red-500">Error: {equation}</span>;
          }
        } else {
          // Regular text
          return <span key={index}>{part}</span>;
        }
      });
    }
  };

  if (!isOpen) return null;

  // Minimized floating button
  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shadow-2xl z-50 p-0 flex items-center justify-center"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    );
  }

  // Expanded chat window
  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-blue-500 to-pink-500">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-white" />
          <div>
            <h3 className="font-semibold text-white">{subject} Tutor</h3>
            <p className="text-xs text-white/80">AI-powered assistance</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsExpanded(false);
          }}
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white'
                  : 'bg-muted text-foreground'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{renderMathText(msg.content)}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Tutor is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <EquationEditor
              value={input}
              onChange={(value) => setInput(value)}
              placeholder="Ask your question... Use math notation, fractions, symbols, and equations."
              className="min-h-[80px]"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Use the math toolbar to insert equations and symbols
        </p>
      </div>
    </div>
  );
};
