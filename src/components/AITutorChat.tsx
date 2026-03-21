import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, MessageSquare, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatbot } from '@/contexts/ChatbotContext';
import EquationEditor from '@/components/admin/EquationEditor';
import { renderLatexContent } from '@/lib/renderLatex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AITutorChatProps {
  subject: string;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'learner' | 'practice' | 'mock_exam';
}

export const AITutorChat = ({ subject, isOpen, onClose, mode = 'learner' }: AITutorChatProps) => {
  // All hooks MUST be called unconditionally and in the same order
  const { isEnabled: isChatbotEnabled } = useChatbot();
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
    if (isOpen && isExpanded && messages.length === 0 && isChatbotEnabled) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'm your ${subject} tutor. Ask me anything about ${subject} concepts, problem-solving strategies, or exam preparation tips!`
        }
      ]);
    }
  }, [isOpen, isExpanded, subject, isChatbotEnabled]);
  
  // If chatbot is disabled for this route or not open, don't render
  // This return MUST come AFTER all hooks have been called
  if (!isOpen || !isChatbotEnabled) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          mode,
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

  // Detect pasted LaTeX and wrap it with $ delimiters for proper rendering
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted) return;

    // Detect LaTeX patterns: \frac, \sqrt, \int, ^{}, _{}, etc.
    const latexPattern = /\\(frac|sqrt|int|sum|prod|lim|alpha|beta|gamma|delta|theta|pi|sigma|omega|infty|partial|nabla|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|text|mathbb|mathcal|left|right|begin|end)\b|[_^]\{/;
    
    if (latexPattern.test(pasted)) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = input.slice(0, start);
      const after = input.slice(end);
      
      // Wrap pasted LaTeX in $ delimiters if not already wrapped
      const trimmed = pasted.trim();
      const alreadyWrapped = (trimmed.startsWith('$') && trimmed.endsWith('$')) ||
                              (trimmed.startsWith('$$') && trimmed.endsWith('$$'));
      const wrapped = alreadyWrapped ? trimmed : `$${trimmed}$`;
      
      setInput(before + wrapped + after);
    }
  }, [input]);

  // Note: isOpen check is done at top with isChatbotEnabled

  // Minimized floating button with glow animation
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        {/* Glow ring animation */}
        <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-blue-400 to-purple-500 opacity-30" />
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 opacity-50 blur-md animate-pulse" />
        
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl flex items-center justify-center cursor-pointer border-2 border-white/20"
        >
          <MessageSquare className="w-7 h-7" />
          
          {/* Badge */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </span>
        </motion.button>
        
        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute right-20 top-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
        >
          <p className="text-sm font-medium text-foreground">General Tutor</p>
          <p className="text-xs text-muted-foreground">AI-powered assistance</p>
        </motion.div>
      </motion.div>
    );
  }

  // Expanded chat window
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 w-[380px] max-h-[85vh] bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
      >
        {/* Header with gradient */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative flex items-center justify-between p-4 shrink-0 overflow-hidden"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{subject} Tutor</h3>
              <p className="text-xs text-white/80">AI-powered assistance</p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsExpanded(false);
              setShowMathEditor(false);
            }}
            className="relative w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-gradient-to-b from-background/50 to-background">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[85%]">
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={`rounded-2xl p-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-br-md'
                        : 'bg-muted/80 backdrop-blur-sm text-foreground rounded-bl-md border border-border/50'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {renderLatexContent(msg.content)}
                    </div>
                  </motion.div>
                  
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg">
                      <span className="text-white text-xs font-medium">You</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-md p-4 border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                        className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-blue-500"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-border/50 bg-background/80 backdrop-blur-sm shrink-0 p-4"
        >
          <AnimatePresence mode="wait">
            {!showMathEditor ? (
              <motion.div
                key="text-input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <div className="relative flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder="Ask your question..."
                      className="min-h-[50px] max-h-[100px] resize-none pr-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowMathEditor(true)}
                      className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Math Editor"
                    >
                      <Calculator className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 text-white shadow-lg disabled:opacity-50"
                      size="icon"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </motion.div>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send
                  </p>
                  <div className="flex gap-1">
                    {['learner', 'practice', 'mock_exam'].map((m) => (
                      <span
                        key={m}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          mode === m 
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-primary font-medium' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        {m === 'mock_exam' ? 'Exam' : m.charAt(0).toUpperCase() + m.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="math-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">Math Editor</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMathEditor(false)}
                    className="h-7 text-xs"
                  >
                    Close
                  </Button>
                </div>
                
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <EquationEditor
                      value={input}
                      onChange={(value) => setInput(value)}
                      placeholder="Use toolbar for math symbols..."
                      className="min-h-[80px] max-h-[150px] rounded-xl"
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 text-white shadow-lg"
                      size="icon"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
