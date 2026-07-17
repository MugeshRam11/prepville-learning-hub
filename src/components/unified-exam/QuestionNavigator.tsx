import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronDown,
  Flag,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { UnifiedQuestion, UnifiedAnswer, ExamSection, getExamSections, UnifiedExamData } from '@/types/answerBlock';
import { cn } from '@/lib/utils';

interface Extract {
  id: string;
  title: string;
  type: 'text' | 'image' | 'diagram';
  content?: string;
  imageUrl?: string;
}

interface QuestionNavigatorProps {
  examData: UnifiedExamData;
  answers: UnifiedAnswer[];
  activeQuestionId: string | null;
  activeSubQuestionId: string | null;
  onNavigate: (questionId: string, subQuestionId?: string) => void;
  extracts?: Extract[];
  onExtractSelect?: (extract: Extract) => void;
  selectedExtractId?: string;
  flaggedQuestions?: Set<string>;
  onToggleFlag?: (questionId: string, subQuestionId?: string) => void;
  /** Container ref for IntersectionObserver scroll-sync */
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  examData,
  answers,
  activeQuestionId,
  activeSubQuestionId,
  onNavigate,
  extracts = [],
  onExtractSelect,
  selectedExtractId,
  flaggedQuestions = new Set(),
  onToggleFlag,
  scrollContainerRef,
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showExtractsSection, setShowExtractsSection] = useState(extracts.length > 0);

  const sections = getExamSections(examData);
  const questions = examData.questions;

  // --- Progress calculations ---
  const mainQuestionCount = questions.length;

  const totalAnswerSlots = questions.reduce((total, q) => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return total + q.subQuestions.length;
    }
    return total + 1;
  }, 0);

  const answeredCount = answers.filter(a => {
    const content = a.content;
    if (typeof content === 'string') return content.trim().length > 0;
    if (typeof content === 'object') return Object.keys(content).length > 0;
    return false;
  }).length;

  // Count how many main questions have at least one answered sub-part
  const answeredMainQuestions = questions.filter(q => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return q.subQuestions.some(sq => isAnswered(q.id, sq.id));
    }
    return isAnswered(q.id);
  }).length;

  const progressPercentage = mainQuestionCount > 0 ? (answeredMainQuestions / mainQuestionCount) * 100 : 0;

  // --- Status helpers ---
  function isAnswered(questionId: string, subQuestionId?: string) {
    const answer = answers.find(
      a => a.questionId === questionId && a.subQuestionId === subQuestionId
    );
    if (!answer) return false;
    const content = answer.content;
    if (typeof content === 'string') return content.trim().length > 0;
    if (typeof content === 'object') return Object.keys(content).length > 0;
    return false;
  }

  function isActive(questionId: string, subQuestionId?: string) {
    if (subQuestionId) {
      return activeQuestionId === questionId && activeSubQuestionId === subQuestionId;
    }
    return activeQuestionId === questionId && !activeSubQuestionId;
  }

  function isFlagged(questionId: string, subQuestionId?: string) {
    const key = subQuestionId ? `${questionId}-${subQuestionId}` : questionId;
    return flaggedQuestions.has(key);
  }

  // --- IntersectionObserver scroll-sync ---
  useEffect(() => {
    if (!scrollContainerRef?.current) return;

    const container = scrollContainerRef.current;
    const observerOptions: IntersectionObserverInit = {
      root: container,
      rootMargin: '-20% 0px -60% 0px', // bias toward top third of viewport
      threshold: 0,
    };

    const callback: IntersectionObserverCallback = (entries) => {
      // Find the topmost visible entry
      let topEntry: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
            topEntry = entry;
          }
        }
      }

      if (!topEntry) return;

      const id = topEntry.target.id; // format: "question-{qId}" or "question-{qId}-{sqId}"
      if (!id.startsWith('question-')) return;

      const parts = id.replace('question-', '').split('-');
      // UUID contains dashes, so we need to handle this differently
      // The format is "question-{uuid}" or "question-{uuid}-{sub-uuid}"
      // We'll use data attributes instead
      const qId = topEntry.target.getAttribute('data-question-id');
      const sqId = topEntry.target.getAttribute('data-sub-question-id');

      if (qId) {
        // Don't call onNavigate - just update active state via parent
        // We use a custom event to avoid re-renders from scroll
        window.dispatchEvent(new CustomEvent('exam-scroll-sync', { 
          detail: { questionId: qId, subQuestionId: sqId || null }
        }));
      }
    };

    const observer = new IntersectionObserver(callback, observerOptions);

    // Observe all question and sub-question elements
    const questionElements = container.querySelectorAll('[data-question-id]');
    questionElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [scrollContainerRef, examData]);

  // --- Auto-expand active question ---
  useEffect(() => {
    if (activeQuestionId) {
      setExpandedQuestions(prev => {
        const next = new Set(prev);
        next.add(activeQuestionId);
        return next;
      });
    }
  }, [activeQuestionId]);

  // --- Toggle helpers ---
  const toggleExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Check if question group is fully answered
  const isGroupFullyAnswered = (q: UnifiedQuestion) => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return q.subQuestions.every(sq => isAnswered(q.id, sq.id));
    }
    return isAnswered(q.id);
  };

  const isGroupPartiallyAnswered = (q: UnifiedQuestion) => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return q.subQuestions.some(sq => isAnswered(q.id, sq.id)) && !isGroupFullyAnswered(q);
    }
    return false;
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 border-r border-violet-500/10 exam-glass hidden lg:flex flex-col min-h-0 overflow-hidden"
    >
      {/* Header with progress */}
      <div className="p-4 border-b border-violet-500/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">Question Navigator</h3>
          <Badge variant="secondary" className="text-xs font-mono">
            Q {answeredMainQuestions}/{mainQuestionCount}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {Math.round(progressPercentage)}% complete
          </p>
          {totalAnswerSlots !== mainQuestionCount && (
            <p className="text-[10px] text-muted-foreground">
              {answeredCount}/{totalAnswerSlots} parts
            </p>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-1">
          {/* Extracts Section */}
          {extracts.length > 0 && (
            <Collapsible open={showExtractsSection} onOpenChange={setShowExtractsSection}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-sm font-medium">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Extracts & Diagrams
                </span>
                {showExtractsSection ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 mb-3 pl-2">
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

          {/* Sections */}
          {sections.map((section) => {
            const isSectionCollapsed = collapsedSections.has(section.id);
            const showSectionHeader = sections.length > 1;

            return (
              <div key={section.id} className="space-y-1">
                {/* Section header (only show if multiple sections) */}
                {showSectionHeader && (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </span>
                    {isSectionCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                )}

                {/* Question Groups within section */}
                {!isSectionCollapsed && (
                  <div className="space-y-1">
                    {section.questionGroups.map((question) => {
                      const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
                      const isExpanded = expandedQuestions.has(question.id);
                      const fullyAnswered = isGroupFullyAnswered(question);
                      const partiallyAnswered = isGroupPartiallyAnswered(question);
                      const isActiveGroup = activeQuestionId === question.id;

                      return (
                        <div key={question.id} className="space-y-0.5">
                          {/* Main question group button */}
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
                              isActiveGroup
                                ? "bg-gradient-to-r from-violet-500/15 to-indigo-500/10 border-l-3 border-l-violet-500 shadow-sm shadow-violet-500/10"
                                : "hover:bg-violet-500/5 border-l-3 border-l-transparent"
                            )}
                          >
                            {/* Status icon for group */}
                            {!hasSubQuestions ? (
                              isAnswered(question.id) ? (
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )
                            ) : fullyAnswered ? (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            ) : partiallyAnswered ? (
                              <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-amber-500/20 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}

                            {/* Question number */}
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold transition-all",
                              isActiveGroup
                                ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/30"
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
                                {hasSubQuestions && ` · ${question.subQuestions!.length} parts`}
                              </div>
                            </div>

                            {/* Flags and expansion arrow */}
                            <div className="flex items-center gap-1">
                              {isFlagged(question.id) && (
                                <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                              )}
                              {hasSubQuestions && (
                                <ChevronRight className={cn(
                                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                  isExpanded && "rotate-90"
                                )} />
                              )}
                            </div>
                          </button>

                          {/* Expandable sub-questions */}
                          <AnimatePresence>
                            {hasSubQuestions && isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-6 pl-3 border-l-2 border-muted space-y-0.5 overflow-hidden"
                              >
                                {question.subQuestions!.map((subQ) => (
                                  <button
                                    key={subQ.id}
                                    onClick={() => onNavigate(question.id, subQ.id)}
                                    className={cn(
                                      "w-full flex items-center gap-2 p-2 rounded-md text-left transition-all",
                                      isActive(question.id, subQ.id)
                                        ? "bg-gradient-to-r from-violet-500/15 to-indigo-500/10 border border-violet-500/40"
                                        : "hover:bg-violet-500/5 border border-transparent"
                                    )}
                                  >
                                    {/* Status */}
                                    {isAnswered(question.id, subQ.id) ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}

                                    {/* Sub-question label: (a), (b), etc. */}
                                    <span className={cn(
                                      "w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-all",
                                      isActive(question.id, subQ.id)
                                        ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30"
                                        : "bg-muted"
                                    )}>
                                      ({subQ.label})
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
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-3 border-t border-violet-500/10 bg-violet-500/[0.03] space-y-2">
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
            <div className="w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-500/20" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Flagged</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default QuestionNavigator;
