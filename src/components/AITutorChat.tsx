import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, MessageSquare, Menu } from 'lucide-react';
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
  const [showMathEditor, setShowMathEditor] = useState(false);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="fixed bottom-4 right-4 w-96 max-h-[90vh] bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-blue-500 to-pink-500 shrink-0">
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
            setShowMathEditor(false);
          }}
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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
      <div className={`border-t border-border bg-background shrink-0 transition-all duration-300 ${showMathEditor ? 'p-3' : 'p-4'}`}>
        {!showMathEditor ? (
          <div className="space-y-2">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your question..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              />
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMathEditor(true)}
                  className="shrink-0"
                  title="Open Math Editor"
                >
                  <Menu className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shrink-0"
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line. Click menu for math editor.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium">Math Editor</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMathEditor(false)}
                className="h-6 text-xs"
              >
                Close Editor
              </Button>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <EquationEditor
                  value={input}
                  onChange={(value) => setInput(value)}
                  placeholder="Use the toolbar to insert math symbols..."
                  className="min-h-[80px] max-h-[200px]"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white shrink-0"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
