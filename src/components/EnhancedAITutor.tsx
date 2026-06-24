import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X, Send, Loader2, Sparkles, Lightbulb, CheckCircle2,
  XCircle, AlertCircle, TrendingUp, ChevronRight, ChevronDown,
  GraduationCap, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useChatbot } from '@/contexts/ChatbotContext';
import { cleanMathContent, normalizeMath, stripLatexFormatting } from '@/lib/mathFormat';
import { cn } from '@/lib/utils';

// ── types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType?: 'chat' | 'hint' | 'evaluation' | 'encouragement';
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
  mode?: 'learner' | 'practice' | 'mock_exam';
}

// ── step parser ──────────────────────────────────────────────────────────────
interface ParsedStep {
  title: string;
  body: string;
}

function parseSteps(text: string): { intro: string; steps: ParsedStep[] } {
  const cleaned = normalizeMath(stripLatexFormatting(cleanMathContent(text)));
  // Match patterns like "1. **Title**: body" or "1. Title: body" or "Step 1: body"
  const stepRegex = /(?:^|\n)\s*(?:(\d+)\.\s*|Step\s+(\d+)[:\s]+)/gi;
  const matches = [...cleaned.matchAll(stepRegex)];

  if (matches.length < 2) {
    return { intro: cleaned, steps: [] };
  }

  const intro = cleaned.slice(0, matches[0].index).trim();
  const steps: ParsedStep[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : cleaned.length;
    const raw = cleaned.slice(start, end).trim();

    const colonIdx = raw.indexOf(':');
    const boldMatch = raw.match(/^\*\*([^*]+)\*\*[:\s]*([\s\S]*)/);

    let title: string;
    let body: string;
    if (boldMatch) {
      title = boldMatch[1].trim();
      body = boldMatch[2].trim();
    } else if (colonIdx > 0 && colonIdx < 60) {
      title = raw.slice(0, colonIdx).replace(/\*\*/g, '').trim();
      body = raw.slice(colonIdx + 1).trim();
    } else {
      title = `Step ${i + 1}`;
      body = raw;
    }
    steps.push({ title, body });
  }

  return { intro, steps };
}

// ── step-by-step renderer ────────────────────────────────────────────────────
const StepByStepRenderer: React.FC<{ content: string }> = ({ content }) => {
  const { intro, steps } = parseSteps(content);
  const [revealedCount, setRevealedCount] = useState(steps.length > 0 ? 1 : 0);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const revealNext = () => {
    const next = revealedCount + 1;
    setRevealedCount(next);
    setExpandedSteps(prev => new Set([...prev, next - 1]));
  };

  if (steps.length === 0) {
    return <PlainText text={content} />;
  }

  return (
    <div className="space-y-2.5">
      {intro && <PlainText text={intro} />}

      {steps.slice(0, revealedCount).map((step, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border bg-background/80 overflow-hidden"
        >
          <button
            onClick={() => toggleStep(idx)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm shrink-0">
              {['📌', '🔍', '✏️', '📐', '🧮', '💡', '🎯', '🔑'][idx % 8]}
            </span>
            <span className="text-xs font-semibold flex-1">{step.title}</span>
            {expandedSteps.has(idx)
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            }
          </button>
          <AnimatePresence>
            {expandedSteps.has(idx) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2.5 pt-0 text-xs leading-relaxed text-muted-foreground border-t border-dashed">
                  <div className="pt-2">
                    <PlainText text={step.body} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}

      {revealedCount < steps.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={revealNext}
            className="w-full h-8 text-xs gap-1.5 border-dashed"
          >
            👉 Show next step ({revealedCount}/{steps.length})
          </Button>
        </motion.div>
      )}

      {revealedCount >= steps.length && steps.length > 1 && (
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 px-1">
          ✅ All {steps.length} steps revealed — you got this! 🙌
        </div>
      )}
    </div>
  );
};

// ── plain text with bold ─────────────────────────────────────────────────────
const PlainText: React.FC<{ text: string }> = ({ text }) => {
  const cleaned = normalizeMath(stripLatexFormatting(cleanMathContent(text)));
  const lines = cleaned.split('\n').filter(l => l.trim());

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pi} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
              }
              return <span key={pi}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

// ── main component ───────────────────────────────────────────────────────────
export const EnhancedAITutor = ({ question, subject, isOpen, onClose, onAnswerCorrect, mode = 'learner' }: EnhancedAITutorProps) => {
  const { isEnabled: isChatbotEnabled } = useChatbot();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [session, setSession] = useState<TutoringSession | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<'correct' | 'partially_correct' | 'incorrect' | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const cleanQ = useCallback(
    () => normalizeMath(stripLatexFormatting(cleanMathContent(question.content))),
    [question.content]
  );

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (isOpen && isExpanded && !session && isChatbotEnabled) {
      initializeTutoringSession();
    }
  }, [isOpen, isExpanded, question, isChatbotEnabled]);

  if (!isOpen || !isChatbotEnabled) return null;

  // ── session init ─────────────────────────────────────────────────────────
  const initializeTutoringSession = async () => {
    if (!user) return;
    try {
      const { data: sessionData, error } = await supabase
        .from('ai_tutoring_sessions')
        .insert({
          user_id: user.id, question_id: question.id, subject,
          question_text: cleanQ(), correct_answer: question.answerKey,
          difficulty_level: question.difficulty, topic: question.topic,
          started_at: new Date().toISOString()
        })
        .select().single();
      if (error) throw error;

      setSession({ sessionId: sessionData.id, hintsUsed: 0, attempts: 0, isCorrect: false, startTime: Date.now() });

      const welcomeMessage: Message = {
        role: 'assistant',
        content: `👋 Hey there! I'm your AI tutor — let's crack this together! 🧠\n\n📝 **Question:** ${cleanQ()}\n\n🤔 What's your first instinct on how to approach this?`,
        messageType: 'chat'
      };
      setMessages([welcomeMessage]);

      await supabase.from('ai_tutoring_messages').insert({
        session_id: sessionData.id, role: 'assistant',
        content: welcomeMessage.content, message_type: 'chat'
      });
    } catch (error) {
      console.error('Error initializing session:', error);
      toast({ title: "Error", description: "Failed to start tutoring session", variant: "destructive" });
    }
  };

  // ── evaluate answer ──────────────────────────────────────────────────────
  const evaluateAnswer = async (studentAnswer: string) => {
    if (!session || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          mode: 'evaluate', subject,
          question: { id: question.id, content: cleanQ(), correctAnswer: question.answerKey, topic: question.topic, difficulty: question.difficulty },
          studentAnswer, sessionId: session.sessionId,
          attemptNumber: session.attempts + 1, conversationHistory: messages
        }
      });
      if (error) throw error;

      const { evaluation, feedback, hint, similarityScore } = data;
      const newAttempts = session.attempts + 1;
      const newHints = hint ? session.hintsUsed + 1 : session.hintsUsed;
      const isCorrectNow = evaluation === 'correct';

      setSession({ ...session, attempts: newAttempts, hintsUsed: newHints, isCorrect: isCorrectNow });
      setEvaluationResult(evaluation);
      setCurrentAnswer(studentAnswer);

      await supabase.from('ai_tutoring_evaluations').insert({
        session_id: session.sessionId, attempt_number: newAttempts,
        student_answer: studentAnswer, evaluation_result: evaluation,
        feedback, hint_provided: hint, similarity_score: similarityScore
      });

      await supabase.from('ai_tutoring_sessions').update({
        attempts: newAttempts, hints_used: newHints, is_correct: isCorrectNow,
        student_answer: studentAnswer,
        ...(isCorrectNow && { completed_at: new Date().toISOString(), session_duration_seconds: Math.floor((Date.now() - session.startTime) / 1000) })
      }).eq('id', session.sessionId);

      let responseContent = '';
      let messageType: 'evaluation' | 'encouragement' | 'hint' = 'evaluation';

      if (evaluation === 'correct') {
        responseContent = `🎉 **Perfect!** ${feedback}\n\n🏆 You've nailed **${question.topic}** — great work! Keep it up! 💪`;
        messageType = 'encouragement';
        onAnswerCorrect?.();
      } else if (evaluation === 'partially_correct') {
        responseContent = `⚡ **Almost there!** ${feedback}${hint ? `\n\n💡 **Hint:** ${hint}` : ''}\n\n🔄 Give it another shot — you're really close!`;
        messageType = 'hint';
        await trackStruggleTopic();
      } else {
        responseContent = `🧩 **Not quite right.** ${feedback}${hint ? `\n\n💡 **Hint:** ${hint}` : ''}\n\n😊 No worries! Let's break it down together — what part feels tricky?`;
        messageType = 'hint';
        await trackStruggleTopic();
      }

      const evalMessage: Message = { role: 'assistant', content: responseContent, messageType };
      setMessages(prev => [...prev, evalMessage]);

      await supabase.from('ai_tutoring_messages').insert({
        session_id: session.sessionId, role: 'assistant',
        content: responseContent, message_type: messageType
      });
    } catch (error) {
      console.error('Evaluation error:', error);
      toast({ title: "Error", description: "Failed to evaluate answer", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const trackStruggleTopic = async () => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('student_struggle_topics')
        .select('id, struggle_count')
        .eq('user_id', user.id).eq('subject', subject)
        .eq('topic', question.topic).eq('difficulty_level', question.difficulty)
        .single();
      if (existing) {
        await supabase.from('student_struggle_topics').update({
          struggle_count: existing.struggle_count + 1, last_struggled_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('student_struggle_topics').insert({
          user_id: user.id, subject, topic: question.topic,
          difficulty_level: question.difficulty, struggle_count: 1,
          last_struggled_at: new Date().toISOString()
        });
      }
    } catch (error) { console.error('Error tracking struggle topic:', error); }
  };

  // ── send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading || !session) return;
    const userMessage = input.trim();
    setInput('');

    const userMsg: Message = { role: 'user', content: userMessage, messageType: 'chat' };
    setMessages(prev => [...prev, userMsg]);

    await supabase.from('ai_tutoring_messages').insert({
      session_id: session.sessionId, role: 'user', content: userMessage, message_type: 'chat'
    });

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: {
          mode: mode === 'mock_exam' ? 'mock_exam' : 'tutor',
          subject, userId: user?.id,
          question: { id: question.id, content: cleanQ(), topic: question.topic, difficulty: question.difficulty },
          message: userMessage, sessionId: session.sessionId, conversationHistory: messages
        }
      });
      if (error) throw error;

      const assistantMsg: Message = { role: 'assistant', content: data.response, messageType: data.messageType || 'chat' };
      setMessages(prev => [...prev, assistantMsg]);

      await supabase.from('ai_tutoring_messages').insert({
        session_id: session.sessionId, role: 'assistant',
        content: data.response, message_type: data.messageType || 'chat'
      });
    } catch (error) {
      console.error('Chat error:', error);
      toast({ title: "Error", description: "Failed to get response from AI tutor", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!input.trim()) {
      toast({ title: "Empty Answer", description: "Please enter your answer first", variant: "destructive" });
      return;
    }
    evaluateAnswer(input.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getEvalIcon = () => {
    if (!evaluationResult) return null;
    if (evaluationResult === 'correct') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (evaluationResult === 'partially_correct') return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
    return <XCircle className="w-3.5 h-3.5 text-red-500" />;
  };

  // ── floating bubble ────────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <motion.button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>
    );
  }

  // ── expanded panel ──────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { setIsExpanded(false); onClose(); }}
      />

      <motion.div
        className="fixed z-50 bottom-6 right-6 w-[420px] max-h-[85vh] bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">AI Tutor</h3>
                <p className="text-[10px] text-white/70 truncate">{subject} · {question.topic}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {session && (
                <div className="flex items-center gap-2 mr-2 text-[10px] text-white/80">
                  <span className="flex items-center gap-0.5"><Lightbulb className="w-3 h-3" /> {session.hintsUsed}</span>
                  <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {session.attempts}</span>
                  {getEvalIcon()}
                </div>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                onClick={() => { setIsExpanded(false); onClose(); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3 bg-muted/20">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-sm font-medium">Ready to help!</p>
              <p className="text-xs text-muted-foreground mt-1">Ask a question or type your answer below 👇</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[85%] bg-violet-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-xs leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className={cn(
                  "max-w-[90%] rounded-2xl rounded-bl-sm px-3.5 py-2.5",
                  msg.messageType === 'hint' ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    : msg.messageType === 'encouragement' ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                    : msg.messageType === 'evaluation' ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                    : "bg-background border"
                )}>
                  {msg.messageType && msg.messageType !== 'chat' && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {msg.messageType === 'hint' ? '💡 Hint' : msg.messageType === 'encouragement' ? '🎯 Correct' : '📋 Feedback'}
                      </span>
                    </div>
                  )}
                  <StepByStepRenderer content={msg.content} />
                </div>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-background border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-muted-foreground">🧠 Thinking...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-background px-3 py-2.5 shrink-0 space-y-2">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={session?.isCorrect ? "🎉 You got it! Well done!" : "✏️ Type your answer or ask for help..."}
              className="flex-1 min-h-[44px] max-h-[88px] resize-none text-xs rounded-xl border-muted"
              disabled={session?.isCorrect}
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || session?.isCorrect}
              size="icon"
              className="h-9 w-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Enter to chat · Shift+Enter for new line</p>
            <Button
              onClick={handleSubmitAnswer}
              disabled={!input.trim() || isLoading || session?.isCorrect}
              size="sm"
              className="h-6 text-[10px] px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Submit Answer
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
