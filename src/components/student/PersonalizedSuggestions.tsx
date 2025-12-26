import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Sparkles,
  BookOpen,
  Trophy,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface PriorityTopic {
  subject: string;
  topic: string;
  reason: string;
  difficulty: string;
  estimatedTime: string;
}

interface AnalysisData {
  priorityTopics: PriorityTopic[];
  learningPath: string;
  motivationalMessage: string;
  strengthsIdentified: string[];
  nextMilestone: string;
  userLevel: number;
  totalXP: number;
  avgScore: string;
  totalTests: number;
  strugglingTopicsCount: number;
}

const PersonalizedSuggestions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnalysis();
    }

    if (!user) return;

    const channel = supabase
      .channel('personalized-suggestions-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topic_progress',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          localStorage.removeItem('userAnalysisCache');
          localStorage.removeItem('userAnalysisCacheTime');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_struggle_topics',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          localStorage.removeItem('userAnalysisCache');
          localStorage.removeItem('userAnalysisCacheTime');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAnalysis = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const cachedData = localStorage.getItem('userAnalysisCache');
      const cacheTime = localStorage.getItem('userAnalysisCacheTime');
      
      if (cachedData && cacheTime) {
        const cacheAge = Date.now() - parseInt(cacheTime);
        if (cacheAge < 3600000) {
          setAnalysis(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('analyze-user-progress', {
        body: { userId: user.id }
      });

      if (error) throw error;

      setAnalysis(data);
      
      localStorage.setItem('userAnalysisCache', JSON.stringify(data));
      localStorage.setItem('userAnalysisCacheTime', Date.now().toString());
      
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      toast.error('Could not load personalized suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    localStorage.removeItem('userAnalysisCache');
    localStorage.removeItem('userAnalysisCacheTime');
    await fetchAnalysis();
    setRefreshing(false);
    toast.success('Suggestions updated!');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const navigateToSubject = (subject: string) => {
    navigate(`/subjects?subject=${subject}`);
  };

  if (loading) {
    return (
      <Card className="border-primary/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Animated glow border */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 blur-xl animate-pulse" />
        
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Brain className="w-6 h-6 text-primary" />
              </motion.div>
              <CardTitle className="text-xl">AI-Powered Learning Suggestions</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 hover:bg-primary/10"
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              Refresh
            </Button>
          </div>
          <CardDescription>
            Personalized recommendations based on your performance (Level {analysis.userLevel} • {analysis.totalTests} tests taken)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
          {/* Motivational Message */}
          <AnimatePresence mode="wait">
            {analysis.motivationalMessage && (
              <motion.div 
                key={analysis.motivationalMessage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary"
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  </motion.div>
                  <p className="text-sm leading-relaxed">{analysis.motivationalMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Strengths */}
          {analysis.strengthsIdentified && analysis.strengthsIdentified.length > 0 && (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <h4 className="font-semibold text-sm">Your Strengths</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.strengthsIdentified.map((strength, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * idx }}
                  >
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      {strength}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Priority Topics */}
          {analysis.priorityTopics && analysis.priorityTopics.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Priority Topics to Focus On</h4>
              </div>
              <div className="space-y-2">
                {analysis.priorityTopics.map((topic, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigateToSubject(topic.subject)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="capitalize">
                            {topic.subject.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={getDifficultyColor(topic.difficulty)}>
                            {topic.difficulty}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {topic.estimatedTime}
                          </div>
                        </div>
                        <h5 className="font-medium">{topic.topic}</h5>
                        <p className="text-sm text-muted-foreground">{topic.reason}</p>
                      </div>
                      <motion.div
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Path */}
          {analysis.learningPath && (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Recommended Learning Path</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.learningPath}
              </p>
            </motion.div>
          )}

          {/* Next Milestone */}
          {analysis.nextMilestone && (
            <motion.div 
              className="p-4 rounded-lg bg-accent/10 border border-accent/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Lightbulb className="w-4 h-4 text-accent" />
                </motion.div>
                <h4 className="font-semibold text-sm">Next Milestone</h4>
              </div>
              <p className="text-sm">{analysis.nextMilestone}</p>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div 
            className="flex gap-2 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button 
              onClick={() => navigate('/quick-practice')}
              className="flex-1 gap-2"
              variant="default"
            >
              <BookOpen className="w-4 h-4" />
              Start Practice
            </Button>
            <Button 
              onClick={() => navigate('/subjects')}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Target className="w-4 h-4" />
              Browse Topics
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PersonalizedSuggestions;
