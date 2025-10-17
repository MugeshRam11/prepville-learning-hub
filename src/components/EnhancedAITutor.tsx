import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Send, Loader2, MessageSquare, Lightbulb, CheckCircle2, XCircle, AlertCircle, TrendingUp, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import EquationEditor from '@/components/admin/EquationEditor';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType?: 'chat' | 'hint' | 'evaluation' | 'encouragement';
  timestamp?: string;
}

interface TutoringSession {
  sessionId: string;
  hintsUsed: number;
  attempts: number;
  isCorrect: boolean;
  startTime: number;
}

interface EnhancedAITutorProps {
  question: {
    id: string;
    title: string;
    content: string;
    answerKey: string;
    topic: string;
    difficulty: string;
  };
  subject: string;
  isOpen: boolean;
  onClose: () => void;
  onAnswerCorrect?: () => void;
}

export const EnhancedAITutor = ({ question, subject, isOpen, onClose, onAnswerCorrect }: EnhancedAITutorProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [session, setSession] = useState<TutoringSession | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<'correct' | 'partially_correct' | 'incorrect' | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && isExpanded && !session) {
      initializeTutoringSession();
    }
  }, [isOpen, isExpanded, question]);

  const initializeTutoringSession = async () => {
    if (!user) return;

    try {
      // Create tutoring session in database
      const { data: sessionData, error } = await supabase
        .from('ai_tutoring_sessions')
        .insert({
          user_id: user.id,
          question_id: question.id,
          subject: subject,
          question_text: question.content,
          correct_answer: question.answerKey,
          difficulty_level: question.difficulty,
          topic: question.topic,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSession({
        sessionId: sessionData.id,
        hintsUsed: 0,
        attempts: 0,
        isCorrect: false,
        startTime: Date.now()
      });

      // Initial welcome message
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `👋 Hi! I'm here to help you understand **${question.title}**.\n\nLet me guide you through this step by step. First, let's break down what the question is asking.\n\n**Question:** ${question.content}\n\nWhat's your initial thought on how to approach this?`,
        messageType: 'chat'
      };

      setMessages([welcomeMessage]);

      // Store message in database
      await supabase.from('ai_tutoring_messages').insert({
        session_id: sessionData.id,
        role: 'assistant',
        content: welcomeMessage.content,
        message_type: 'chat'
      });

    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Error",
        description: "Failed to start tutoring session",
        variant: "destructive"
      });
    }
  };

  const evaluateAnswer = async (studentAnswer: string) => {
    if (!session || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          mode: 'evaluate',
          subject,
          question: {
            id: question.id,
            content: question.content,
            correctAnswer: question.answerKey,
            topic: question.topic,
            difficulty: question.difficulty
          },
          studentAnswer,
          sessionId: session.sessionId,
          attemptNumber: session.attempts + 1,
          conversationHistory: messages
        }
      });

      if (error) throw error;

      const { evaluation, feedback, hint, similarityScore } = data;
      
      // Update session
      const newAttempts = session.attempts + 1;
      const newHints = hint ? session.hintsUsed + 1 : session.hintsUsed;
      const isCorrectNow = evaluation === 'correct';

      setSession({
        ...session,
        attempts: newAttempts,
        hintsUsed: newHints,
        isCorrect: isCorrectNow
      });

      setEvaluationResult(evaluation);
      setCurrentAnswer(studentAnswer);

      // Store evaluation
      await supabase.from('ai_tutoring_evaluations').insert({
        session_id: session.sessionId,
        attempt_number: newAttempts,
        student_answer: studentAnswer,
        evaluation_result: evaluation,
        feedback: feedback,
        hint_provided: hint,
        similarity_score: similarityScore
      });

      // Update session in database
      await supabase
        .from('ai_tutoring_sessions')
        .update({
          attempts: newAttempts,
          hints_used: newHints,
          is_correct: isCorrectNow,
          student_answer: studentAnswer,
          ...(isCorrectNow && {
            completed_at: new Date().toISOString(),
            session_duration_seconds: Math.floor((Date.now() - session.startTime) / 1000)
          })
        })
        .eq('id', session.sessionId);

      // Add evaluation message
      let responseContent = '';
      let messageType: 'evaluation' | 'encouragement' | 'hint' = 'evaluation';

      if (evaluation === 'correct') {
        responseContent = `🎉 **Perfect!** ${feedback}\n\nYou got it right! You've demonstrated great understanding of ${question.topic}.`;
        messageType = 'encouragement';
        
        // Track success
        if (onAnswerCorrect) {
          onAnswerCorrect();
        }
      } else if (evaluation === 'partially_correct') {
        responseContent = `⚠️ **You're close!** ${feedback}\n\n${hint ? `💡 **Hint:** ${hint}` : ''}\n\nTry again! Think about what might need adjusting.`;
        messageType = 'hint';
        
        // Track struggle topic
        await trackStruggleTopic();
      } else {
        responseContent = `❌ **Not quite.** ${feedback}\n\n${hint ? `💡 **Hint:** ${hint}` : ''}\n\nDon't worry! Let's think through this together. What part seems confusing?`;
        messageType = 'hint';
        
        // Track struggle topic
        await trackStruggleTopic();
      }

      const evalMessage: Message = {
        role: 'assistant',
        content: responseContent,
        messageType
      };

      setMessages(prev => [...prev, evalMessage]);

      // Store message
      await supabase.from('ai_tutoring_messages').insert({
        session_id: session.sessionId,
        role: 'assistant',
        content: responseContent,
        message_type: messageType
      });

    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: "Error",
        description: "Failed to evaluate answer",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const trackStruggleTopic = async () => {
    if (!user) return;

    try {
      // Check if topic already exists
      const { data: existing } = await supabase
        .from('student_struggle_topics')
        .select('id, struggle_count')
        .eq('user_id', user.id)
        .eq('subject', subject)
        .eq('topic', question.topic)
        .eq('difficulty_level', question.difficulty)
        .single();

      if (existing) {
        // Increment struggle count
        await supabase
          .from('student_struggle_topics')
          .update({
            struggle_count: existing.struggle_count + 1,
            last_struggled_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new struggle topic
        await supabase
          .from('student_struggle_topics')
          .insert({
            user_id: user.id,
            subject: subject,
            topic: question.topic,
            difficulty_level: question.difficulty,
            struggle_count: 1,
            last_struggled_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error tracking struggle topic:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !session) return;

    const userMessage = input.trim();
    setInput('');
    
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      messageType: 'chat'
    };
    
    setMessages(prev => [...prev, userMsg]);

    // Store user message
    await supabase.from('ai_tutoring_messages').insert({
      session_id: session.sessionId,
      role: 'user',
      content: userMessage,
      message_type: 'chat'
    });

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          mode: 'tutor',
          subject,
          userId: user?.id,
          question: {
            id: question.id,
            content: question.content,
            topic: question.topic,
            difficulty: question.difficulty
          },
          message: userMessage,
          sessionId: session.sessionId,
          conversationHistory: messages
        }
      });

      if (error) throw error;

      console.log('AI Response received:', data);
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        messageType: data.messageType || 'chat'
      };

      console.log('Adding assistant message to state:', assistantMsg);
      setMessages(prev => {
        const newMessages = [...prev, assistantMsg];
        console.log('New messages array:', newMessages);
        return newMessages;
      });

      // Store assistant message
      await supabase.from('ai_tutoring_messages').insert({
        session_id: session.sessionId,
        role: 'assistant',
        content: data.response,
        message_type: data.messageType || 'chat'
      });

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI tutor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!input.trim()) {
      toast({
        title: "Empty Answer",
        description: "Please enter your answer first",
        variant: "destructive"
      });
      return;
    }
    evaluateAnswer(input.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMathText = (text: string) => {
    const hasLatex = /\\[a-zA-Z]+/.test(text);
    
    if (hasLatex) {
      try {
        const html = katex.renderToString(text, {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (error) {
        return <span className="text-destructive">LaTeX Error: {text}</span>;
      }
    } else {
      const parts = text.split(/(\$[^$]+\$)/g);
      
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const equation = part.slice(1, -1);
          try {
            const html = katex.renderToString(equation, {
              displayMode: false,
              throwOnError: false,
              errorColor: '#cc0000',
              strict: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (error) {
            return <span key={index} className="text-destructive">Error: {equation}</span>;
          }
        } else {
          // Parse markdown-style bold
          const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((boldPart, boldIdx) => {
            if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
              return <strong key={`${index}-${boldIdx}`}>{boldPart.slice(2, -2)}</strong>;
            }
            return <span key={`${index}-${boldIdx}`}>{boldPart}</span>;
          });
        }
      });
    }
  };

  const getMessageIcon = (messageType?: string) => {
    switch (messageType) {
      case 'hint': return <Lightbulb className="w-4 h-4" />;
      case 'evaluation': return <AlertCircle className="w-4 h-4" />;
      case 'encouragement': return <CheckCircle2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const getEvaluationBadge = () => {
    if (!evaluationResult) return null;

    switch (evaluationResult) {
      case 'correct':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Correct!</Badge>;
      case 'partially_correct':
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Almost There</Badge>;
      case 'incorrect':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Try Again</Badge>;
    }
  };

  if (!isOpen) return null;

  // Minimized floating button
  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white shadow-2xl z-50 p-0 flex items-center justify-center animate-pulse"
        size="icon"
      >
        <MessageSquare className="w-7 h-7" />
      </Button>
    );
  }

  // Expanded tutoring window
  return (
    <div className="fixed bottom-4 right-4 w-[450px] max-h-[85vh] bg-background border-2 border-primary/20 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <MessageSquare className="w-6 h-6 text-white shrink-0" />
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm truncate">{question.title}</h3>
            <p className="text-xs text-white/90">{subject} · {question.topic}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsExpanded(false);
            setShowMathEditor(false);
          }}
          className="text-white hover:bg-white/20 shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress Stats */}
      {session && (
        <Card className="m-3 p-3 bg-muted/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Hints: {session.hintsUsed}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Attempts: {session.attempts}</span>
            </div>
            {getEvaluationBadge()}
          </div>
          {session.attempts > 0 && (
            <Progress 
              value={evaluationResult === 'correct' ? 100 : evaluationResult === 'partially_correct' ? 60 : 30} 
              className="h-2"
            />
          )}
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            Start chatting below or ask for guidance!
          </div>
        )}
        {messages.map((msg, idx) => {
          console.log(`Rendering message ${idx}:`, msg);
          return (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : msg.messageType === 'hint'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 text-foreground'
                  : msg.messageType === 'evaluation'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 text-foreground'
                  : msg.messageType === 'encouragement'
                  ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 text-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.role === 'assistant' && msg.messageType && (
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold opacity-70">
                  {getMessageIcon(msg.messageType)}
                  <span className="uppercase tracking-wide">
                    {msg.messageType === 'hint' ? 'Hint' : 
                     msg.messageType === 'evaluation' ? 'Evaluation' : 
                     msg.messageType === 'encouragement' ? 'Great Job' : 'AI Tutor'}
                  </span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {renderMathText(msg.content)}
              </div>
            </div>
          </div>
        );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Tutor is analyzing...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t-2 border-border bg-background shrink-0 transition-all duration-300 ${showMathEditor ? 'p-3' : 'p-4'}`}>
        {!showMathEditor ? (
          <div className="space-y-2">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer or ask for guidance..."
                className="flex-1 min-h-[80px] max-h-[150px] resize-none text-sm"
                disabled={session?.isCorrect}
              />
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMathEditor(true)}
                  className="shrink-0"
                  title="Open Math Editor"
                  disabled={session?.isCorrect}
                >
                  <Menu className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || session?.isCorrect}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shrink-0"
                  size="icon"
                  title="Send Message"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press Enter to chat • Shift+Enter for new line
              </p>
              <Button
                onClick={handleSubmitAnswer}
                disabled={!input.trim() || isLoading || session?.isCorrect}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs px-3 py-1 h-7"
              >
                Submit Answer
              </Button>
            </div>
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
                  placeholder="Use toolbar for math symbols..."
                  className="min-h-[100px] max-h-[200px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || session?.isCorrect}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shrink-0"
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!input.trim() || isLoading || session?.isCorrect}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shrink-0"
                  size="icon"
                  title="Submit Answer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};