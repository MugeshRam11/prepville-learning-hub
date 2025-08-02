import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, Plus, Users, Star, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CreateGroupModal from './CreateGroupModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StudyGroup {
  id: string;
  group_name: string;
  description: string;
  member_count: number;
  is_public: boolean;
}

interface StudyGroupsSidebarProps {
  selectedGroup: string | null;
  onGroupSelect: (groupId: string | null) => void;
}

const StudyGroupsSidebar = ({ selectedGroup, onGroupSelect }: StudyGroupsSidebarProps) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      // Get groups the user is a member of
      const { data: memberGroups, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          study_groups (
            id,
            group_name,
            description,
            member_count,
            is_public
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      const groupsData = memberGroups
        ?.map(mg => mg.study_groups)
        .filter(Boolean) as StudyGroup[];
      
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-72 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Study Groups
        </h2>
        <p className="text-sm text-slate-400 mt-1">Collaborate & Learn Together</p>
      </div>

      {/* Groups List */}
      <ScrollArea className="flex-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-slate-400">Loading groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Users className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-400 mb-2">No groups joined yet</p>
            <p className="text-sm text-slate-500">Create or join a group to get started!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant="ghost"
                className={`w-full justify-start h-auto p-3 text-left transition-all duration-200 ${
                  selectedGroup === group.id
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'hover:bg-slate-700/50'
                }`}
                onClick={() => onGroupSelect(group.id)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="relative">
                    <Hash className="h-5 w-5 text-slate-400" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white truncate">{group.group_name}</span>
                      <Zap className="h-3 w-3 text-yellow-400" />
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="h-3 w-3 text-slate-500" />
                      <span className="text-xs text-slate-500">{group.member_count} members</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {group.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Group Button */}
      <div className="p-4 border-t border-slate-700/50">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/25"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <CreateGroupModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onGroupCreated={fetchGroups}
      />
    </div>
  );
};

export default StudyGroupsSidebar;