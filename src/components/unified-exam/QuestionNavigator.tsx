import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronDown,
  Flag,
  FileText,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { UnifiedQuestion, UnifiedAnswer } from '@/types/answerBlock';
import { cn } from '@/lib/utils';

interface Extract {
  id: string;
  title: string;
  type: 'text' | 'image' | 'diagram';
  content?: string;
  imageUrl?: string;
}

interface QuestionNavigatorProps {
  questions: UnifiedQuestion[];
  answers: UnifiedAnswer[];
  activeQuestionId: string | null;
  activeSubQuestionId: string | null;
  onNavigate: (questionId: string, subQuestionId?: string) => void;
  extracts?: Extract[];
  onExtractSelect?: (extract: Extract) => void;
  selectedExtractId?: string;
  flaggedQuestions?: Set<string>;
  onToggleFlag?: (questionId: string, subQuestionId?: string) => void;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  answers,
  activeQuestionId,
  activeSubQuestionId,
  onNavigate,
  extracts = [],
  onExtractSelect,
  selectedExtractId,
  flaggedQuestions = new Set(),
  onToggleFlag,
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [showExtractsSection, setShowExtractsSection] = useState(extracts.length > 0);

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
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
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

  const isFlagged = (questionId: string, subQuestionId?: string) => {
    const key = subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    return flaggedQuestions.has(key);
  };

  const toggleExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const totalSlots = getTotalAnswerSlots();
  const answeredCount = getAnsweredCount();
  const progressPercentage = totalSlots > 0 ? (answeredCount / totalSlots) * 100 : 0;

  // Filter questions by difficulty
  const filteredQuestions = difficultyFilter 
    ? questions.filter(q => q.difficulty === difficultyFilter)
    : questions;

  // Get unique difficulties
  const difficulties = [...new Set(questions.map(q => q.difficulty).filter(Boolean))];

  // Format sub-question label with Roman numerals
  const formatLabel = (questionNum: number, subLabel: string, subIndex: number) => {
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    // If label is just a letter, append roman numeral for sub-parts
    if (subLabel.length === 1 && /[a-z]/i.test(subLabel)) {
      return `${questionNum}${subLabel}`;
    }
    return `${questionNum}${subLabel}`;
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 border-r bg-card hidden lg:flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Question Navigator</h3>
          <Badge variant="secondary" className="text-xs">
            {answeredCount}/{totalSlots}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {Math.round(progressPercentage)}% complete
        </p>
      </div>

      {/* Difficulty Filter */}
      {difficulties.length > 1 && (
        <div className="px-4 py-2 border-b flex items-center gap-2">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={difficultyFilter === null ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setDifficultyFilter(null)}
            >
              All
            </Button>
            {difficulties.map(diff => (
              <Button
                key={diff}
                variant={difficultyFilter === diff ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setDifficultyFilter(diff!)}
              >
                {diff}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Extracts Section */}
          {extracts.length > 0 && (
            <Collapsible open={showExtractsSection} onOpenChange={setShowExtractsSection}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    Extracts & Diagrams
                  </span>
                  {showExtractsSection ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 mb-4 pl-2">
                  {extracts.map(extract => (
                    <button
                      key={extract.id}
                      onClick={() => onExtractSelect?.(extract)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-all text-sm",
                        selectedExtractId === extract.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted border border-transparent"
                      )}
                    >
                      {extract.type === 'image' || extract.type === 'diagram' ? (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="truncate">{extract.title}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Questions List */}
          {filteredQuestions.map((question) => {
            const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
            const isExpanded = expandedQuestions.has(question.id) || 
              (activeQuestionId === question.id && hasSubQuestions);

            return (
              <div key={question.id} className="space-y-1">
                {/* Main question button */}
                <button
                  onClick={() => {
                    if (hasSubQuestions) {
                      toggleExpanded(question.id);
                      onNavigate(question.id, question.subQuestions![0].id);
                    } else {
                      onNavigate(question.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all",
                    isActive(question.id) && !hasSubQuestions
                      ? "bg-primary/10 border-2 border-primary"
                      : "hover:bg-muted border-2 border-transparent"
                  )}
                >
                  {/* Status icon */}
                  {!hasSubQuestions && (
                    isAnswered(question.id) ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )
                  )}

                  {/* Question number badge */}
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold",
                    isActive(question.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}>
                    {question.questionNumber}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      Q{question.questionNumber}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {question.marks}m
                      {hasSubQuestions && ` • ${question.subQuestions!.length} parts`}
                    </div>
                  </div>

                  {/* Flags and expansion */}
                  <div className="flex items-center gap-1">
                    {isFlagged(question.id) && (
                      <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                    {hasSubQuestions && (
                      <ChevronRight className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    )}
                  </div>
                </button>

                {/* Sub-questions */}
                <AnimatePresence>
                  {hasSubQuestions && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-5 pl-3 border-l-2 border-muted space-y-1 overflow-hidden"
                    >
                      {question.subQuestions!.map((subQ, subIdx) => (
                        <button
                          key={subQ.id}
                          onClick={() => onNavigate(question.id, subQ.id)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-md text-left transition-all",
                            isActive(question.id, subQ.id)
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted border border-transparent"
                          )}
                        >
                          {/* Status */}
                          {isAnswered(question.id, subQ.id) ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}

                          {/* Label */}
                          <span className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-xs font-medium",
                            isActive(question.id, subQ.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}>
                            {subQ.label}
                          </span>

                          {/* Marks */}
                          <span className="text-xs text-muted-foreground flex-1">
                            {subQ.marks}m
                          </span>

                          {/* Flag */}
                          {isFlagged(question.id, subQ.id) && (
                            <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-3 border-t bg-muted/30 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Legend</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-3 h-3 text-muted-foreground" />
            <span>Not attempted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Flagged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
            <span>Current</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default QuestionNavigator;
