import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Activity, Calendar, Award } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import UserProgressCard from './UserProgressCard';
import SessionHistoryTable from './SessionHistoryTable';
import ActivityTimeline from './ActivityTimeline';
import { Skeleton } from '@/components/ui/skeleton';

interface UserDetailDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_tests_taken: number;
  avg_score_percentage: number;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ userId, isOpen, onClose }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !isOpen) {
      setUserData(null);
      return;
    }

    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_progress_summary')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, isOpen]);

  const displayName = userData
    ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
    : '';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">{displayName}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{userData?.email}</p>
            </div>
            {userData && (
              <Badge variant="secondary" className="text-xs">
                Level {userData.current_level}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : userData ? (
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="overview" className="text-xs">
                <Award className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="progress" className="text-xs">
                <TrendingUp className="h-4 w-4 mr-1" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs">
                <Calendar className="h-4 w-4 mr-1" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <Activity className="h-4 w-4 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-2xl font-bold">{userData.total_xp.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                  <p className="text-2xl font-bold">🔥 {userData.longest_streak} days</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Tests Completed</p>
                  <p className="text-2xl font-bold">{userData.total_tests_taken}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-bold">{userData.avg_score_percentage}%</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm text-muted-foreground mb-2">Role & Status</p>
                <div className="flex gap-2">
                  <Badge variant="outline">{userData.role}</Badge>
                  <Badge variant="outline">
                    Last Active: {userData.last_activity_date 
                      ? new Date(userData.last_activity_date).toLocaleDateString()
                      : 'Never'}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="progress">
              <UserProgressCard userId={userId!} />
            </TabsContent>

            <TabsContent value="sessions">
              <SessionHistoryTable userId={userId!} />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTimeline userId={userId!} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No user data available</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailDrawer;
