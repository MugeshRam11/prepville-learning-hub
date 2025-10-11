
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
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PerformanceCriteria from './PerformanceCriteria';
import DynamicTopicProgress from './DynamicTopicProgress';
import DynamicDailyChallenge from './DynamicDailyChallenge';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { streakData } = useStreakTracker();
  const { xpData, loading: xpLoading } = useXPSystem();
  const { user } = useAuth();
  const { 
    userProgress, 
    topicProgress, 
    dailyChallenge, 
    achievements: realtimeAchievements,
    loading: progressLoading,
    updateTopicProgress,
    updateDailyChallenge,
    updatePerformanceCriteria 
  } = useProgressTracking();
  
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
    avatarEmoji: profileData?.avatar_emoji,
    avatarId: profileData?.avatar_id,
    level: 7,
    xp: 2750,
    xpToNextLevel: 3000,
    weeklyGoal: 5,
    weeklyCompleted: 3,
    totalQuestions: 1247,
    correctAnswers: 1089,
    favoriteTopics: ["Algebra", "Statistics"]
  };

  const handleSaveAvatar = async (avatarId: number, avatarEmoji?: string, avatarName?: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_id: avatarId,
          avatar_emoji: avatarEmoji,
          avatar_name: avatarName
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating avatar:', error);
        return;
      }
      
      // Refresh profile data
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
    }
  };

  // Handler functions for real-time updates
  const handleContinueLearning = async (topicName: string) => {
    await updateTopicProgress(topicName, 1);
    
    // Update performance criteria based on topic
    if (topicName.includes('Algebra')) {
      await updatePerformanceCriteria('knowledge_understanding', 2);
    } else if (topicName.includes('Geometry')) {
      await updatePerformanceCriteria('pattern_recognition', 2);
    } else if (topicName.includes('Statistics')) {
      await updatePerformanceCriteria('real_life_applications', 2);
    } else {
      await updatePerformanceCriteria('communication', 2);
    }
    
    toast.success(`+2% Progress in ${topicName}!`);
  };

  const handleContinueChallenge = async () => {
    await updateDailyChallenge();
    toast.success("Challenge progress updated!");
  };

  // Use realtime achievements or fallback to mock data
  const displayAchievements = realtimeAchievements.length > 0 
    ? realtimeAchievements.map(a => ({
        id: a.id,
        title: a.achievement_name,
        icon: a.achievement_icon,
        unlockedAt: new Date(a.unlocked_at).toLocaleDateString()
      }))
    : [
        { id: '1', title: "Getting Started", icon: "🎯", unlockedAt: "Today" },
        { id: '2', title: "First Steps", icon: "👣", unlockedAt: "Today" }
      ];

  if (loading || xpLoading || progressLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[hsl(var(--adsavvy-blue))] mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-7xl">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-4 border-white shadow-xl ring-4 ring-[hsl(var(--adsavvy-blue))]/20 transition-all group-hover:scale-105">
                    {studentData.avatarEmoji ? (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] rounded-full text-white">
                        <span className="drop-shadow-sm">{studentData.avatarEmoji}</span>
                      </div>
                    ) : (
                      <>
                        <AvatarImage src={studentData.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] text-white text-2xl font-bold">
                          {studentData.name[0]}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <Button 
                    size="sm" 
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full p-0 bg-[hsl(var(--adsavvy-pink))] hover:bg-[hsl(var(--adsavvy-pink))]/90 shadow-lg transition-all hover:scale-110"
                    onClick={() => setShowAvatarCustomizer(true)}
                  >
                    ✏️
                  </Button>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] bg-clip-text text-transparent">
                    Welcome back, {studentData.name}! 
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto font-semibold text-[hsl(var(--adsavvy-blue))] hover:text-[hsl(var(--adsavvy-pink))] transition-colors"
                      onClick={() => navigate('/level-details')}
                    >
                      <Crown className="h-5 w-5 mr-1" />
                      Level {xpData?.current_level || 1} • {xpData?.level_title || 'New Explorer'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    {xpData && (
                      <Badge className="text-xs bg-[hsl(var(--adsavvy-yellow))] text-gray-800 border-none">
                        {xpData.total_xp} XP
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* XP Progress Display */}
              {xpData && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg min-w-[280px] hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Progress to Level {(xpData.current_level || 1) + 1}</span>
                    <span className="text-sm font-bold text-[hsl(var(--adsavvy-blue))]">{xpData.xp_to_next_level || 100} XP</span>
                  </div>
                  <Progress 
                    value={xpData.xp_to_next_level ? ((xpData.total_xp - (xpData.total_xp - xpData.xp_to_next_level)) / xpData.xp_to_next_level) * 100 : 0} 
                    className="h-4 bg-gray-100" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
            <Card className="bg-gradient-to-br from-[hsl(var(--adsavvy-pink))]/10 to-[hsl(var(--adsavvy-pink))]/5 border-[hsl(var(--adsavvy-pink))]/20 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
              <CardContent className="p-6 text-center">
                <Flame className="w-10 h-10 text-[hsl(var(--adsavvy-pink))] mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-800">{streakData.currentStreak}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Day Streak</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[hsl(var(--adsavvy-yellow))]/30 to-[hsl(var(--adsavvy-yellow))]/10 border-[hsl(var(--adsavvy-yellow))]/30 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
              <CardContent className="p-6 text-center">
                <Target className="w-10 h-10 text-yellow-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-800">{studentData.weeklyCompleted}/{studentData.weeklyGoal}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Weekly Goal</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[hsl(var(--adsavvy-blue))]/10 to-[hsl(var(--adsavvy-blue))]/5 border-[hsl(var(--adsavvy-blue))]/20 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-10 h-10 text-[hsl(var(--adsavvy-blue))] mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-800">{studentData.totalQuestions}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Questions Solved</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-100/50 to-purple-50 border-purple-200 hover:shadow-lg transition-all hover:scale-105 rounded-2xl">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-800">
                  {Math.round((studentData.correctAnswers / studentData.totalQuestions) * 100)}%
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1">Accuracy</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6 animate-fade-in">
              {/* Quick Actions */}
              <QuickActions />

              {/* Performance Criteria Progress */}
              <PerformanceCriteria 
                userProgress={userProgress} 
                loading={progressLoading} 
              />

              {/* Topic Progress */}
              <DynamicTopicProgress 
                topics={topicProgress}
                loading={progressLoading}
                onContinueLearning={handleContinueLearning}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6 animate-fade-in">
              {/* Streak Tracker */}
              <StreakTracker />

              {/* Recent Achievements */}
              <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all border-gray-100">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="w-6 h-6 text-[hsl(var(--adsavvy-yellow))]/80" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {displayAchievements.length > 0 ? (
                    displayAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[hsl(var(--adsavvy-yellow))]/20 to-[hsl(var(--adsavvy-yellow))]/10 border border-[hsl(var(--adsavvy-yellow))]/30 hover:shadow-md transition-all hover:scale-105 animate-fade-in">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">{achievement.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{achievement.unlockedAt}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Complete activities to unlock achievements!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Daily Challenge */}
              <DynamicDailyChallenge 
                challenge={dailyChallenge}
                loading={progressLoading}
                onContinueChallenge={handleContinueChallenge}
              />
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
          onSave={handleSaveAvatar}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
