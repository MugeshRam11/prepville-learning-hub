import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Shield, Star, Zap, Users, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StudyGroupsMembersProps {
  groupId: string;
}

const StudyGroupsMembers = ({ groupId }: StudyGroupsMembersProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchMembers();
      fetchAllUsers();
    }
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          study_groups_users (
            username,
            avatar_url,
            reputation,
            streak_days,
            role
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // 1) Find groups the current user belongs to
      const { data: myGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (groupsError) throw groupsError;
      const groupIds = (myGroups || []).map(g => g.group_id);
      if (groupIds.length === 0) {
        setAllUsers([]);
        return;
      }

      // 2) Get all user_ids from those groups (people you share a group with)
      const { data: groupUsers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .eq('is_active', true);

      if (membersError) throw membersError;
      const candidateUserIds = Array.from(new Set((groupUsers || []).map(m => m.user_id)));
      if (candidateUserIds.length === 0) {
        setAllUsers([]);
        return;
      }

      // 3) Load their study group profiles (RLS now restricts visibility appropriately)
      const { data, error } = await supabase
        .from('study_groups_users')
        .select('*')
        .in('user_id', candidateUserIds)
        .eq('is_active', true);

      if (error) throw error;
      
      // Filter out users who are already members of this selected group
      const memberUserIds = members.map(m => m.user_id);
      const nonMembers = (data || []).filter(user => !memberUserIds.includes(user.user_id));
      setAllUsers(nonMembers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleJoinGroup = async (userId: string) => {
    setJoinLoading(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;
      
      toast.success('User added to group successfully!');
      fetchMembers();
      fetchAllUsers();
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to add user to group');
    } finally {
      setJoinLoading(false);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-400' : 'bg-slate-500';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'border-red-500 text-red-400';
      case 'moderator': return 'border-blue-500 text-blue-400';
      default: return 'border-slate-500 text-slate-400';
    }
  };

  const getBadgeIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3" />;
      case 'moderator': return <Shield className="w-3 h-3" />;
      default: return <Star className="w-3 h-3" />;
    }
  };

  return (
    <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="font-bold text-white">Group Management</h3>
        <p className="text-sm text-slate-400">
          {members.filter(m => m.is_active).length} members
        </p>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs defaultValue="members" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 border-b border-slate-600">
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="join" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Add Users</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="flex-1 mt-0">
            <ScrollArea className="flex-1 p-2">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-slate-400">Loading members...</div>
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Users className="h-12 w-12 text-slate-500 mb-4" />
                  <p className="text-slate-400">No members found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer group"
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10 border-2 border-gradient-to-r from-blue-400 to-purple-400">
                          <AvatarImage src={member.study_groups_users?.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm">
                            {member.study_groups_users?.username?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(member.is_active)} rounded-full border-2 border-slate-800`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-white text-sm truncate">{member.study_groups_users?.username || 'Unknown'}</span>
                          {getBadgeIcon(member.study_groups_users?.role || 'student')}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRoleColor(member.study_groups_users?.role || 'student')}`}
                          >
                            {member.role}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                          <span>{member.study_groups_users?.reputation || 0} XP</span>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span>{member.study_groups_users?.streak_days || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="join" className="flex-1 mt-0">
            <ScrollArea className="flex-1 p-2">
              {allUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <UserPlus className="h-12 w-12 text-slate-500 mb-4" />
                  <p className="text-slate-400">No users available to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allUsers.map((user, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200"
                    >
                      <Avatar className="w-10 h-10 border-2 border-gradient-to-r from-green-400 to-blue-400">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold text-sm">
                          {user.username?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-white text-sm truncate">{user.username}</span>
                              {getBadgeIcon(user.role)}
                            </div>
                            
                            <div className="flex items-center space-x-3 text-xs text-slate-500">
                              <span>{user.reputation} XP</span>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span>{user.streak_days}</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => handleJoinGroup(user.user_id)}
                            disabled={joinLoading}
                            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudyGroupsMembers;