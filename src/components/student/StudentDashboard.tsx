
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
import { useSolvedQuestions } from '@/hooks/useSolvedQuestions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PerformanceCriteria from './PerformanceCriteria';
import DynamicTopicProgress from './DynamicTopicProgress';
import DynamicDailyChallenge from './DynamicDailyChallenge';
import { toast } from 'sonner';
import StatsCards from './StatsCards';
import { useTestProgressSync } from '@/hooks/useTestProgressSync';

// Import avatar images
import coolCat from '@/assets/avatars/cool-cat.png';
import spaceExplorer from '@/assets/avatars/space-explorer.png';
import mathWizard from '@/assets/avatars/math-wizard.png';
import robotFriend from '@/assets/avatars/robot-friend.png';
import dragonTamer from '@/assets/avatars/dragon-tamer.png';
import oceanExplorer from '@/assets/avatars/ocean-explorer.png';

// Avatar mapping
const avatarMap: { [key: number]: string } = {
  1: coolCat,
  2: spaceExplorer,
  3: mathWizard,
  4: robotFriend,
  5: dragonTamer,
  6: oceanExplorer,
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  
  const { streakData } = useStreakTracker();
  const { xpData, loading: xpLoading } = useXPSystem();
  const { user } = useAuth();
  const { 
    mockTestSolved, 
    subjectTestSolved, 
    quickTestSolved, 
    totalSolved,
    loading: solvedQuestionsLoading 
  } = useSolvedQuestions();
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
  
  // Enable automatic progress syncing
  useTestProgressSync();
  
  // Fetch user profile data and real stats
  useEffect(() => {
    const fetchProfileAndStats = async () => {
      if (!user) return;
      
      try {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        setProfileData(profile);

        // Fetch test attempts to calculate real stats
        const { data: attempts } = await supabase
          .from('test_attempts')
          .select('score, total_questions, completed_at')
          .eq('user_id', user.id);

        // Calculate total questions and correct answers
        const total = attempts?.reduce((sum: number, a: any) => sum + (a.total_questions || 0), 0) || 0;
        const correct = attempts?.reduce((sum: number, a: any) => sum + (a.score || 0), 0) || 0;
        
        setTotalQuestions(total);
        setCorrectAnswers(correct);

        // Calculate weekly completed from daily challenges
        const startOfWeek = new Date();
        const dayOfWeek = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const weekStart = startOfWeek.toISOString().split('T')[0];

        const { count: weeklyCount } = await supabase
          .from('daily_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('challenge_date', weekStart)
          .eq('is_completed', true);
        
        setWeeklyCompleted(weeklyCount || 0);

      } catch (error) {
        console.error('Error fetching profile and stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndStats();

    // Set up real-time subscriptions for stats updates
    const testChannel = supabase
      .channel('test-attempts-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'test_attempts',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchProfileAndStats()
      )
      .subscribe();

    const challengeChannel = supabase
      .channel('challenges-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_challenges',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchProfileAndStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(testChannel);
      supabase.removeChannel(challengeChannel);
    };
  }, [user]);

  // Get avatar source based on avatar_id or emoji
  const getAvatarSource = () => {
    if (profileData?.avatar_id && avatarMap[profileData.avatar_id]) {
      return avatarMap[profileData.avatar_id];
    }
    return "/placeholder.svg";
  };

  // Student data for display with real values
  const studentData = {
    name: profileData?.first_name ? 
      `${profileData.first_name}${profileData.last_name ? ` ${profileData.last_name}` : ''}` : 
      profileData?.email?.split('@')[0] || 'Student',
    avatar: getAvatarSource(),
    avatarEmoji: profileData?.avatar_emoji,
    avatarId: profileData?.avatar_id,
    weeklyGoal: weeklyGoal,
    weeklyCompleted: weeklyCompleted,
    totalQuestions: totalQuestions,
    correctAnswers: correctAnswers,
    favoriteTopics: ["Algebra", "Statistics"]
  };

  const handleSaveAvatar = async (avatarId: number, avatarEmoji?: string, avatarName?: string) => {
    if (!user) return;
    
    try {
      // If it's not an emoji avatar, explicitly set avatar_emoji to null
      const updateData: {
        avatar_id: number;
        avatar_emoji: string | null;
        avatar_name: string | undefined;
      } = {
        avatar_id: avatarId,
        avatar_emoji: avatarEmoji || null, // Set to null if no emoji
        avatar_name: avatarName
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating avatar:', error);
        toast.error('Failed to save avatar');
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
        toast.success('Avatar updated successfully!');
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error('Failed to save avatar');
    }
  };

  // Handler functions for real-time updates
  const handleContinueLearning = (topicName: string) => {
    // Redirect to Quick Practice page - progress updates on quiz completion
    navigate('/quick-practice', { state: { selectedTopic: topicName } });
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
                    ) : studentData.avatar !== "/placeholder.svg" ? (
                      <AvatarImage src={studentData.avatar} className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] text-white text-2xl font-bold">
                        {studentData.name[0]}
                      </AvatarFallback>
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
          <StatsCards 
            currentStreak={streakData.currentStreak}
            weeklyCompleted={studentData.weeklyCompleted}
            weeklyGoal={studentData.weeklyGoal}
            totalQuestions={studentData.totalQuestions}
            correctAnswers={studentData.correctAnswers}
            mockTestSolved={mockTestSolved}
            subjectTestSolved={subjectTestSolved}
            quickTestSolved={quickTestSolved}
            totalSolved={totalSolved}
          />

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
