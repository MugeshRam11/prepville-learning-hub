import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useXPSystem } from '@/hooks/useXPSystem';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Target, 
  Award, 
  BookOpen, 
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  Clock
} from 'lucide-react';
import Header from '@/components/Header';
import { format } from 'date-fns';

const Analytics = () => {
  const navigate = useNavigate();
  const { userProgress, loading } = useProgressTracking();
  const { xpData } = useXPSystem();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchResults = async () => {
      const { data: evals } = await supabase
        .from('exam_evaluations')
        .select('*, test_attempts(completed_at)')
        .eq('student_id', user.id)
        .eq('evaluation_status', 'finalized')
        .order('finalized_at', { ascending: false })
        .limit(10);
      if (!evals || evals.length === 0) { setTestResults([]); return; }
      const testIds = [...new Set(evals.map(e => e.test_id))];
      const { data: tests } = await supabase.from('mock_tests').select('id, title, subject').in('id', testIds);
      const testsMap = (tests || []).reduce((acc: any, t: any) => ({ ...acc, [t.id]: t }), {});
      setTestResults(evals.map(e => ({ ...e, testTitle: testsMap[e.test_id]?.title, testSubject: testsMap[e.test_id]?.subject })));
    };
    fetchResults();
  }, [user?.id]);

  const criteriaData = [
    {
      key: 'knowledge_understanding',
      label: 'A - Knowledge & Understanding',
      description: 'Comprehension of mathematical concepts',
      color: 'from-blue-500 to-blue-400',
      improveWith: ['Quick Practice', 'Graphing Tool', 'Formula Helper'],
      routes: ['/quick-practice', '/graphing-tool', '/formula-helper']
    },
    {
      key: 'pattern_recognition',
      label: 'B - Pattern Recognition',
      description: 'Identifying and analyzing patterns',
      color: 'from-pink-500 to-pink-400',
      improveWith: ['Study Groups', 'Subjects'],
      routes: ['/study-groups', '/subjects']
    },
    {
      key: 'communication',
      label: 'C - Communication',
      description: 'Expressing mathematical ideas clearly',
      color: 'from-purple-500 to-purple-400',
      improveWith: ['Video Lessons', 'Study Groups'],
      routes: ['/videos', '/study-groups']
    },
    {
      key: 'real_life_applications',
      label: 'D - Real-life Applications',
      description: 'Applying concepts to real-world scenarios',
      color: 'from-yellow-500 to-yellow-400',
      improveWith: ['Mock Tests', 'Timed Challenge'],
      routes: ['/mock-exams/select', '/timed-challenge']
    }
  ];

  const getProgress = (key: string) => {
    return Number(userProgress?.[key as keyof typeof userProgress] || 0);
  };

  const getPerformanceStatus = (value: number) => {
    if (value >= 80) return { status: 'Excellent', color: 'bg-green-500', icon: CheckCircle2 };
    if (value >= 60) return { status: 'Good', color: 'bg-blue-500', icon: TrendingUp };
    if (value >= 40) return { status: 'Progressing', color: 'bg-yellow-500', icon: Target };
    if (value >= 20) return { status: 'Developing', color: 'bg-orange-500', icon: BookOpen };
    return { status: 'Getting Started', color: 'bg-red-500', icon: AlertCircle };
  };

  const getOverallProgress = () => {
    const values = criteriaData.map(c => getProgress(c.key));
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const getStrongestArea = () => {
    const values = criteriaData.map(c => ({ ...c, value: getProgress(c.key) }));
    return values.reduce((max, curr) => curr.value > max.value ? curr : max);
  };

  const getWeakestArea = () => {
    const values = criteriaData.map(c => ({ ...c, value: getProgress(c.key) }));
    return values.reduce((min, curr) => curr.value < min.value ? curr : min);
  };

  const overallProgress = getOverallProgress();
  const strongestArea = getStrongestArea();
  const weakestArea = getWeakestArea();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                Performance Analytics
              </h1>
              <p className="text-muted-foreground">
                Track your progress across all learning criteria
              </p>
            </div>
            <Card className="md:w-48">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary mb-1">{overallProgress}%</div>
                <div className="text-sm text-muted-foreground">Overall Progress</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total XP</div>
                  <div className="text-2xl font-bold">{xpData?.total_xp || 0}</div>
                </div>
                <Award className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Current Level</div>
                  <div className="text-2xl font-bold">{xpData?.current_level || 1}</div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Strongest Area</div>
                  <div className="text-sm font-semibold">{strongestArea.label.split(' - ')[1]}</div>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Focus Area</div>
                  <div className="text-sm font-semibold">{weakestArea.label.split(' - ')[1]}</div>
                </div>
                <Target className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Criteria Details */}
        <Card className="mb-6 md:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              Performance Criteria Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {criteriaData.map((criterion, index) => {
              const value = getProgress(criterion.key);
              const status = getPerformanceStatus(value);
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={criterion.key} 
                  className="group animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base md:text-lg font-semibold text-foreground">
                          {criterion.label}
                        </span>
                        <Badge className={`${status.color} text-white text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                    <div className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${criterion.color} bg-clip-text text-transparent`}>
                      {value}%
                    </div>
                  </div>
                  
                  <div className="relative mb-2">
                    <Progress 
                      value={value} 
                      className="h-4 bg-secondary/30 transition-all duration-700" 
                    />
                    {value === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          Start learning to progress
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {value < 100 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">Improve with:</span>
                      {criterion.improveWith.map((activity, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(criterion.routes[idx])}
                          className="text-xs h-7 hover:bg-primary hover:text-primary-foreground"
                        >
                          {activity}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Personalized Recommendations */}
        <Card className="mb-6 md:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakestArea.value < 50 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Priority Focus Area
                </h4>
                <p className="text-sm text-foreground/80 mb-3">
                  Your <strong>{weakestArea.label.split(' - ')[1]}</strong> needs attention. 
                  Complete activities to strengthen this skill.
                </p>
                <div className="flex flex-wrap gap-2">
                  {weakestArea.improveWith.map((activity, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      onClick={() => navigate(weakestArea.routes[idx])}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Try {activity}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {strongestArea.value >= 60 && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Great Progress!
                </h4>
                <p className="text-sm text-foreground/80">
                  You're excelling in <strong>{strongestArea.label.split(' - ')[1]}</strong>! 
                  Keep it up to reach mastery level.
                </p>
              </div>
            )}
            
            {overallProgress >= 75 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Outstanding Performance
                </h4>
                <p className="text-sm text-foreground/80">
                  You've achieved {overallProgress}% overall progress! Challenge yourself with 
                  advanced mock tests and timed challenges.
                </p>
              </div>
            )}
            
            {overallProgress < 25 && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Getting Started
                </h4>
                <p className="text-sm text-foreground/80 mb-3">
                  Begin your learning journey! Start with Quick Practice to build foundational knowledge.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate('/quick-practice')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Quick Practice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              Your Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criteriaData
                .map(c => ({ ...c, value: getProgress(c.key) }))
                .sort((a, b) => a.value - b.value)
                .slice(0, 2)
                .map((criterion, idx) => (
                  <div key={criterion.key} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{criterion.label}</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Current: {criterion.value}% • Target: 100%
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {criterion.improveWith.map((activity, actIdx) => (
                          <Button
                            key={actIdx}
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(criterion.routes[actIdx])}
                            className="text-xs h-7"
                          >
                            {activity}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Previous Test Results */}
        {testResults.length > 0 && (
          <Card className="mb-6 md:mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Results of Your Previous Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{result.testTitle || 'Mock Test'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Score: {result.final_score}/{result.final_marks?.possible || 0}</span>
                        <span>•</span>
                        <span>{result.test_attempts?.completed_at ? format(new Date(result.test_attempts.completed_at), 'dd MMM yyyy') : ''}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/mock-exams/results/${result.test_attempt_id}`)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View Result
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
      
    </div>
  );
};

export default Analytics;
