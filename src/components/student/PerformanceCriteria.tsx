import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Award, TrendingUp, BarChart3, Info } from 'lucide-react';
import { UserProgress } from '@/hooks/useProgressTracking';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

interface PerformanceCriteriaProps {
  userProgress: UserProgress | null;
  loading: boolean;
}

const CriterionCard = ({ 
  criterion, 
  value, 
  index 
}: { 
  criterion: { key: string; label: string; description: string; color: string; why: string; action: string };
  value: number;
  index: number;
}) => {
  const navigate = useNavigate();
  const animatedValue = useAnimatedCounter({ end: value, duration: 1500 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="p-4 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {criterion.label}
            </span>
            {value > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <TrendingUp className="w-4 h-4 text-green-500" />
              </motion.div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium mb-1">Why this matters:</p>
                  <p className="text-xs text-muted-foreground">{criterion.why}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">{criterion.description}</p>
        </div>
        <motion.span 
          className={`text-2xl font-bold bg-gradient-to-r ${criterion.color} bg-clip-text text-transparent tabular-nums`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          {Math.round(animatedValue)}%
        </motion.span>
      </div>
      
      <div className="relative mb-3">
        <div className="h-3 bg-secondary/30 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${criterion.color} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: "easeOut" }}
          />
        </div>
        {value === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-medium">Start learning to progress</span>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        onClick={() => navigate('/quick-practice')}
      >
        {criterion.action}
      </Button>
    </motion.div>
  );
};

const PerformanceCriteria: React.FC<PerformanceCriteriaProps> = ({ userProgress, loading }) => {
  const navigate = useNavigate();
  
  const criteriaData = [
    {
      key: 'knowledge_understanding',
      label: 'A - Knowledge & Understanding',
      description: 'Comprehension of mathematical concepts',
      color: 'from-blue-500 to-blue-400',
      why: 'This measures how well you grasp core mathematical principles and can recall formulas and procedures.',
      action: 'Practice concept questions →'
    },
    {
      key: 'pattern_recognition',
      label: 'B - Pattern Recognition',
      description: 'Identifying and analyzing patterns',
      color: 'from-pink-500 to-pink-400',
      why: 'Pattern recognition helps you see connections between problems and develop problem-solving intuition.',
      action: 'Try pattern challenges →'
    },
    {
      key: 'communication',
      label: 'C - Communication',
      description: 'Expressing mathematical ideas clearly',
      color: 'from-purple-500 to-purple-400',
      why: 'Clear mathematical communication is essential for showing your work and explaining your reasoning.',
      action: 'Practice explanations →'
    },
    {
      key: 'real_life_applications',
      label: 'D - Real-life Applications',
      description: 'Applying concepts to real-world scenarios',
      color: 'from-yellow-500 to-yellow-400',
      why: 'This shows you can transfer mathematical knowledge to solve practical, real-world problems.',
      action: 'Solve word problems →'
    }
  ];

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md border-border animate-pulse">
        <CardHeader className="pb-4">
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Award className="w-6 h-6 text-yellow-500" />
              </motion.div>
              Performance Criteria Progress
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/analytics')}
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criteriaData.map((criterion, index) => {
              const value = Number(userProgress?.[criterion.key as keyof UserProgress] || 0);
              return (
                <CriterionCard 
                  key={criterion.key} 
                  criterion={criterion} 
                  value={value} 
                  index={index} 
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerformanceCriteria;
