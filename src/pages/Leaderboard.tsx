import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { Trophy, Crown, Medal, TrendingUp, Flame, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Leaderboard = () => {
  const { user } = useAuth();
  const [xpLeaders, setXpLeaders] = useState<any[]>([]);
  const [streakLeaders, setStreakLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      // Fetch XP leaderboard
      const { data: xpData } = await supabase
        .from('user_xp')
        .select('user_id, total_xp, current_level, profiles(first_name, last_name)')
        .order('total_xp', { ascending: false })
        .limit(10);

      // Fetch streak leaderboard
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('user_id, best_streak, profiles(first_name, last_name)')
        .order('best_streak', { ascending: false })
        .limit(10);

      setXpLeaders(xpData || []);
      setStreakLeaders(streakData || []);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="font-bold text-gray-500">{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600';
    return 'bg-gradient-to-r from-blue-400 to-purple-500';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
              Leaderboard
            </h1>
            <p className="text-gray-600">See where you rank among top performers</p>
          </div>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
            {/* 2nd Place */}
            <div className="flex flex-col items-center pt-12">
              <div className="relative">
                <Avatar className="w-16 h-16 border-4 border-gray-300">
                  <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400">2</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2">
                  <Medal className="w-6 h-6 text-gray-400" />
                </div>
              </div>
              <h3 className="font-semibold mt-2 text-sm">Silver</h3>
              <Badge variant="secondary" className="mt-1">2nd</Badge>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="w-20 h-20 border-4 border-yellow-400">
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600">1</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <h3 className="font-semibold mt-2">Champion</h3>
              <Badge className="mt-1 bg-gradient-to-r from-yellow-400 to-yellow-600">1st</Badge>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center pt-16">
              <div className="relative">
                <Avatar className="w-14 h-14 border-4 border-orange-400">
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600">3</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2">
                  <Medal className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <h3 className="font-semibold mt-2 text-sm">Bronze</h3>
              <Badge variant="secondary" className="mt-1">3rd</Badge>
            </div>
          </div>

          {/* Leaderboard Tables */}
          <Tabs defaultValue="xp" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="xp" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                XP Leaders
              </TabsTrigger>
              <TabsTrigger value="streak" className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Streak Leaders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="xp">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top XP Earners
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <p className="text-center text-gray-500 py-8">Loading leaderboard...</p>
                  ) : (
                    xpLeaders.map((leader, index) => (
                      <div
                        key={leader.user_id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          leader.user_id === user?.id ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'
                        } hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${getRankBadge(index + 1)} flex items-center justify-center text-white font-bold`}>
                            {index < 3 ? getRankIcon(index + 1) : index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {leader.profiles?.first_name} {leader.profiles?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">Level {leader.current_level}</p>
                          </div>
                        </div>
                        <Badge className={getRankBadge(index + 1)}>
                          {leader.total_xp.toLocaleString()} XP
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="streak">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5" />
                    Longest Streaks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <p className="text-center text-gray-500 py-8">Loading leaderboard...</p>
                  ) : (
                    streakLeaders.map((leader, index) => (
                      <div
                        key={leader.user_id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          leader.user_id === user?.id ? 'bg-orange-50 border-2 border-orange-300' : 'bg-gray-50'
                        } hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${getRankBadge(index + 1)} flex items-center justify-center text-white font-bold`}>
                            {index < 3 ? getRankIcon(index + 1) : index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {leader.profiles?.first_name} {leader.profiles?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">Best Streak</p>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-orange-400 to-red-500">
                          🔥 {leader.best_streak} days
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

    </div>
  );
};

export default Leaderboard;
