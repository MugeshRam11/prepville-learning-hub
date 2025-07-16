
import React, { useState } from 'react';
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
  Zap
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AvatarCustomizer from './AvatarCustomizer';
import StreakTracker from './StreakTracker';
import TopicProgressCard from './TopicProgressCard';
import QuickActions from './QuickActions';

const StudentDashboard = () => {
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  
  // Mock student data - in real app, this would come from user context/API
  const studentData = {
    name: "Alex",
    avatar: "/placeholder.svg",
    level: 7,
    xp: 2750,
    xpToNextLevel: 3000,
    currentStreak: 12,
    longestStreak: 28,
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
                  <p className="text-muted-foreground">Ready to level up your math skills today?</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">Level {studentData.level}</div>
                  <div className="text-sm text-muted-foreground">Math Explorer</div>
                </div>
                <div className="w-24">
                  <Progress 
                    value={(studentData.xp / studentData.xpToNextLevel) * 100} 
                    className="h-3"
                  />
                  <div className="text-xs text-center mt-1 text-muted-foreground">
                    {studentData.xp}/{studentData.xpToNextLevel} XP
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300">
              <CardContent className="p-4 text-center">
                <Flame className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-800">{studentData.currentStreak}</div>
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
              <StreakTracker 
                currentStreak={studentData.currentStreak}
                longestStreak={studentData.longestStreak}
              />

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
