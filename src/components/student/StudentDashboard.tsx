
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Target, 
  Flame, 
  BookOpen, 
  TrendingUp, 
  Star,
  Calendar,
  Clock,
  Award,
  Zap,
  Crown,
  ChevronRight
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AvatarCustomizer from './AvatarCustomizer';
import StreakTracker from './StreakTracker';
import TopicProgressCard from './TopicProgressCard';
import QuickActions from './QuickActions';
import { useStreakTracker } from '@/hooks/useStreakTracker';
import { useXPSystem } from '@/hooks/useXPSystem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { streakData } = useStreakTracker();
  const { xpData, loading: xpLoading } = useXPSystem();
  const { user } = useAuth();
  
  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        
        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Fallback student data for display
  const studentData = {
    name: profileData?.first_name ? 
      `${profileData.first_name}${profileData.last_name ? ` ${profileData.last_name}` : ''}` : 
      profileData?.email?.split('@')[0] || 'Student',
    avatar: "/placeholder.svg",
    level: 7,
    xp: 2750,
    xpToNextLevel: 3000,
    weeklyGoal: 5,
    weeklyCompleted: 3,
    totalQuestions: 1247,
    correctAnswers: 1089,
    favoriteTopics: ["Algebra", "Statistics"]
  };

  const recentAchievements = [
    { id: 1, title: "Algebra Master", icon: "🧮", unlockedAt: "2 days ago" },
    { id: 2, title: "Week Warrior", icon: "⚡", unlockedAt: "1 week ago" },
    { id: 3, title: "Problem Solver", icon: "🎯", unlockedAt: "2 weeks ago" }
  ];

  const criterionProgress = [
    { criterion: "A - Knowing & Understanding", progress: 78, color: "bg-blue-500" },
    { criterion: "B - Investigating Patterns", progress: 65, color: "bg-green-500" },
    { criterion: "C - Communicating", progress: 82, color: "bg-purple-500" },
    { criterion: "D - Real-life Applications", progress: 71, color: "bg-orange-500" }
  ];

  if (loading || xpLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      
      <main className="flex-1 py-6">
        <div className="container">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                    <AvatarImage src={studentData.avatar} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl font-bold">
                      {studentData.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    size="sm" 
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full p-0"
                    onClick={() => setShowAvatarCustomizer(true)}
                  >
                    ✏️
                  </Button>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back, {studentData.name}! 
                  </h1>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                      onClick={() => navigate('/level-details')}
                    >
                      <Crown className="h-4 w-4 mr-1" />
                      Level {xpData?.current_level || 1} • {xpData?.level_title || 'New Explorer'}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                    {xpData && (
                      <Badge variant="secondary" className="text-xs">
                        {xpData.total_xp} XP
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* XP Progress Display */}
              {xpData && (
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress to Level {(xpData.current_level || 1) + 1}</span>
                    <span className="text-sm text-muted-foreground">{xpData.xp_to_next_level || 100} XP needed</span>
                  </div>
                  <Progress 
                    value={xpData.xp_to_next_level ? ((xpData.total_xp - (xpData.total_xp - xpData.xp_to_next_level)) / xpData.xp_to_next_level) * 100 : 0} 
                    className="h-3" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300">
              <CardContent className="p-4 text-center">
                <Flame className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-800">{streakData.currentStreak}</div>
                <div className="text-sm text-orange-600">Day Streak</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-300">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-800">{studentData.weeklyCompleted}/{studentData.weeklyGoal}</div>
                <div className="text-sm text-green-600">Weekly Goal</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300">
              <CardContent className="p-4 text-center">
                <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-800">{studentData.totalQuestions}</div>
                <div className="text-sm text-blue-600">Questions Solved</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-800">
                  {Math.round((studentData.correctAnswers / studentData.totalQuestions) * 100)}%
                </div>
                <div className="text-sm text-purple-600">Accuracy</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <QuickActions />

              {/* MYP Criterion Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    MYP Assessment Criteria Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {criterionProgress.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{item.criterion}</span>
                        <span className="text-sm text-muted-foreground">{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Topic Progress */}
              <TopicProgressCard />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Streak Tracker */}
          <StreakTracker />

              {/* Recent Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{achievement.title}</div>
                        <div className="text-xs text-muted-foreground">{achievement.unlockedAt}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Daily Challenge */}
              <Card className="bg-gradient-to-br from-pink-100 to-purple-100 border-pink-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-pink-800">
                    <Zap className="w-5 h-5" />
                    Daily Challenge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-pink-700 mb-3">
                    Solve 5 probability questions to earn 50 XP!
                  </p>
                  <Progress value={60} className="mb-3" />
                  <p className="text-xs text-pink-600">3/5 completed</p>
                  <Button size="sm" className="w-full mt-3 bg-pink-600 hover:bg-pink-700">
                    Continue Challenge
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Avatar Customizer Modal */}
      {showAvatarCustomizer && (
        <AvatarCustomizer 
          onClose={() => setShowAvatarCustomizer(false)}
          currentAvatar={studentData.avatar}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
