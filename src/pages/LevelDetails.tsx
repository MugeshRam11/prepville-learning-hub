import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, Crown, Zap, Users, BarChart3, Brain, Target, Gift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useXPSystem } from '@/hooks/useXPSystem';
import Header from '@/components/Header';

const LevelDetails = () => {
  const navigate = useNavigate();
  const { xpData, recentActivities, loading } = useXPSystem();

  const levelThresholds = [
    { level: 1, xp: 0, title: 'New Explorer', color: 'bg-slate-500' },
    { level: 2, xp: 100, title: 'Curious Student', color: 'bg-blue-500' },
    { level: 3, xp: 250, title: 'Promising Student', color: 'bg-green-500' },
    { level: 5, xp: 700, title: 'Rising Star', color: 'bg-yellow-500' },
    { level: 7, xp: 1350, title: 'Math Explorer', color: 'bg-orange-500' },
    { level: 10, xp: 2700, title: 'Dedicated Learner', color: 'bg-purple-500' },
    { level: 15, xp: 5000, title: 'Advanced Scholar', color: 'bg-pink-500' },
    { level: 20, xp: 8000, title: 'Expert Student', color: 'bg-red-500' },
    { level: 30, xp: 15000, title: 'Master Learner', color: 'bg-indigo-500' },
    { level: 40, xp: 25000, title: 'Elite Student', color: 'bg-emerald-500' },
    { level: 50, xp: 40000, title: 'Grandmaster Scholar', color: 'bg-amber-500' },
  ];

  const xpEarningMethods = [
    {
      activity: 'Daily Streak',
      xp: 10,
      icon: Zap,
      description: 'Maintain your daily learning streak',
      frequency: 'Daily'
    },
    {
      activity: 'Correct Answer',
      xp: 5,
      icon: Target,
      description: 'Answer practice questions correctly',
      frequency: 'Per question'
    },
    {
      activity: 'Complete Quiz',
      xp: 25,
      icon: Star,
      description: 'Finish a practice quiz',
      frequency: 'Per quiz'
    },
    {
      activity: 'Perfect Quiz Score',
      xp: 50,
      icon: Crown,
      description: 'Score 100% on any quiz',
      frequency: 'Bonus'
    },
    {
      activity: 'Mock Exam',
      xp: 50,
      icon: Trophy,
      description: 'Complete a full mock exam',
      frequency: 'Per exam'
    },
    {
      activity: 'Streak Milestones',
      xp: 'Variable',
      icon: Gift,
      description: '7-day: 70 XP, 30-day: 300 XP, 100-day: 1000 XP',
      frequency: 'Milestone'
    }
  ];

  const getBenefitsByLevel = (level: number) => {
    if (level >= 50) return ['Unlimited practice tests', 'Priority support', 'Advanced analytics', 'Exclusive content', 'Mentor program access'];
    if (level >= 40) return ['Advanced practice tests', 'Detailed analytics', 'Study group creation', 'Priority features'];
    if (level >= 30) return ['Extended test history', 'Advanced filters', 'Custom study plans', 'Group admin privileges'];
    if (level >= 20) return ['Extended practice sessions', 'Detailed progress reports', 'Study group moderation'];
    if (level >= 15) return ['Bonus practice questions', 'Advanced streak rewards', 'Study group features'];
    if (level >= 10) return ['Extended streak tracking', 'Bonus XP multiplier', 'Achievement badges'];
    if (level >= 7) return ['Weekly challenges', 'Progress insights', 'Community features'];
    if (level >= 5) return ['Streak bonuses', 'Performance analytics', 'Social features'];
    if (level >= 3) return ['Basic analytics', 'Streak tracking', 'Community access'];
    return ['Basic features', 'Getting started bonus'];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  const currentLevel = xpData?.current_level || 1;
  const totalXP = xpData?.total_xp || 0;
  const progressToNext = xpData ? ((totalXP - (xpData.total_xp - xpData.xp_to_next_level)) / (xpData.xp_to_next_level || 1)) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/10">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Level & XP System</h1>
            <p className="text-muted-foreground">Track your progress and unlock new opportunities</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Current Level Info */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Current Level
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{currentLevel}</div>
                  <div className="text-lg font-semibold">{xpData?.level_title}</div>
                  <div className="text-sm text-muted-foreground">{totalXP} Total XP</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to Level {currentLevel + 1}</span>
                    <span>{xpData?.xp_to_next_level || 0} XP needed</span>
                  </div>
                  <Progress value={progressToNext} className="h-3" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Current Benefits:</h4>
                  <div className="space-y-1">
                    {(xpData?.level_benefits || []).map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Star className="h-3 w-3 text-primary" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How to Earn XP */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  How to Earn XP
                </CardTitle>
                <CardDescription>
                  Different activities reward you with experience points to level up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {xpEarningMethods.map((method, index) => {
                    const IconComponent = method.icon;
                    return (
                      <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm">{method.activity}</h4>
                            <Badge variant="secondary">{method.xp} XP</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{method.description}</p>
                          <div className="text-xs text-primary font-medium">{method.frequency}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Level Progression */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Level Progression & Benefits
            </CardTitle>
            <CardDescription>
              See what you can unlock as you advance through the levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {levelThresholds.map((threshold, index) => {
                const isUnlocked = currentLevel >= threshold.level;
                const isCurrent = currentLevel === threshold.level;
                const benefits = getBenefitsByLevel(threshold.level);

                return (
                  <div 
                    key={threshold.level} 
                    className={`p-4 rounded-lg border transition-colors ${
                      isCurrent ? 'border-primary bg-primary/5' : 
                      isUnlocked ? 'border-green-500/30 bg-green-500/5' : 
                      'border-border bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        isCurrent ? 'bg-primary' : 
                        isUnlocked ? 'bg-green-500' : 
                        'bg-gray-400'
                      }`}>
                        {threshold.level}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{threshold.title}</div>
                        <div className="text-xs text-muted-foreground">{threshold.xp} XP</div>
                      </div>
                      {isCurrent && <Badge variant="default" className="ml-auto">Current</Badge>}
                      {isUnlocked && !isCurrent && <Badge variant="secondary" className="ml-auto">Unlocked</Badge>}
                    </div>
                    
                    <div className="space-y-1">
                      {benefits.slice(0, 3).map((benefit, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-xs ${
                          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          <Star className={`h-3 w-3 ${
                            isUnlocked ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          {benefit}
                        </div>
                      ))}
                      {benefits.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{benefits.length - 3} more benefits
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent XP Activities */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Recent XP Activities
            </CardTitle>
            <CardDescription>
              Your latest experience point earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <div className="font-medium text-sm">
                        {activity.description || activity.activity_type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.activity_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      +{activity.xp_gained} XP
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No XP activities yet. Start learning to earn your first points!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

    </div>
  );
};

export default LevelDetails;