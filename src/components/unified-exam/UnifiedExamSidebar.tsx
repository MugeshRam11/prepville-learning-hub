import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ChevronRight, Wifi, WifiOff, Cloud } from 'lucide-react';
import { UnifiedQuestion, UnifiedAnswer } from '@/types/answerBlock';
interface UnifiedExamSidebarProps {
  questions: UnifiedQuestion[];
  answers: UnifiedAnswer[];
  activeQuestionId: string | null;
  activeSubQuestionId: string | null;
  onNavigate: (questionId: string, subQuestionId?: string) => void;
  isConnected?: boolean;
  lastSynced?: Date | null;
}
const UnifiedExamSidebar: React.FC<UnifiedExamSidebarProps> = ({
  questions,
  answers,
  activeQuestionId,
  activeSubQuestionId,
  onNavigate,
  isConnected,
  lastSynced
}) => {
  // Calculate progress
  const getTotalAnswerSlots = () => {
    return questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        return total + q.subQuestions.length;
      }
      return total + 1;
    }, 0);
  };
  const getAnsweredCount = () => {
    return answers.filter(a => {
      const content = a.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (typeof content === 'object') return Object.keys(content).length > 0;
      return false;
    }).length;
  };
  const isAnswered = (questionId: string, subQuestionId?: string) => {
    const answer = answers.find(a => a.questionId === questionId && a.subQuestionId === subQuestionId);
    if (!answer) return false;
    const content = answer.content;
    if (typeof content === 'string') return content.trim().length > 0;
    if (typeof content === 'object') return Object.keys(content).length > 0;
    return false;
  };
  const isActive = (questionId: string, subQuestionId?: string) => {
    if (subQuestionId) {
      return activeQuestionId === questionId && activeSubQuestionId === subQuestionId;
    }
    return activeQuestionId === questionId && !activeSubQuestionId;
  };
  const totalSlots = getTotalAnswerSlots();
  const answeredCount = getAnsweredCount();
  const progressPercentage = totalSlots > 0 ? answeredCount / totalSlots * 100 : 0;
  return <motion.aside initial={{
    x: 20,
    opacity: 0
  }} animate={{
    x: 0,
    opacity: 1
  }} className="w-72 border-l bg-card hidden lg:flex flex-col">
      {/* Header */}
      

      {/* Question list removed */}

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {isConnected !== undefined && (isConnected ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />)}
            <Cloud className="w-3.5 h-3.5" />
            <span>Auto-saved</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {answeredCount} answered
          </Badge>
        </div>
      </div>
    </motion.aside>;
};
export default UnifiedExamSidebar;