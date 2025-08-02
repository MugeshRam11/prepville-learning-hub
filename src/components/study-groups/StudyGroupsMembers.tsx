import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Star, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudyGroupsMembersProps {
  groupId: string;
}

const StudyGroupsMembers = ({ groupId }: StudyGroupsMembersProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      fetchMembers();
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
    <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="font-bold text-white">Members</h3>
        <p className="text-sm text-slate-400">
          {members.filter(m => m.is_active).length} members
        </p>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-slate-400">Loading members...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Star className="h-12 w-12 text-slate-500 mb-4" />
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
    </div>
  );
};

export default StudyGroupsMembers;