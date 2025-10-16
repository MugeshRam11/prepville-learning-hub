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

    // Set up real-time listener for topic progress changes to refresh analysis
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
          console.log('Topic progress updated, clearing cache for fresh analysis');
          // Clear cache when topic progress changes
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
          console.log('Struggle topics updated, clearing cache');
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
      
      // Check cache first (valid for 1 hour)
      const cachedData = localStorage.getItem('userAnalysisCache');
      const cacheTime = localStorage.getItem('userAnalysisCacheTime');
      
      if (cachedData && cacheTime) {
        const cacheAge = Date.now() - parseInt(cacheTime);
        if (cacheAge < 3600000) { // 1 hour
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
      
      // Cache the results
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
    // Clear cache
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
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary animate-pulse" />
            <CardTitle className="text-xl">AI-Powered Learning Suggestions</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Personalized recommendations based on your performance (Level {analysis.userLevel} • {analysis.totalTests} tests taken)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Motivational Message */}
        {analysis.motivationalMessage && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">{analysis.motivationalMessage}</p>
            </div>
          </div>
        )}

        {/* Strengths */}
        {analysis.strengthsIdentified && analysis.strengthsIdentified.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <h4 className="font-semibold text-sm">Your Strengths</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.strengthsIdentified.map((strength, idx) => (
                <Badge key={idx} variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
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
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors cursor-pointer group"
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Path */}
        {analysis.learningPath && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">Recommended Learning Path</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysis.learningPath}
            </p>
          </div>
        )}

        {/* Next Milestone */}
        {analysis.nextMilestone && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-accent" />
              <h4 className="font-semibold text-sm">Next Milestone</h4>
            </div>
            <p className="text-sm">{analysis.nextMilestone}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalizedSuggestions;
