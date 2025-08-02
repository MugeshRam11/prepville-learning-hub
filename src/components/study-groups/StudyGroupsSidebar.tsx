import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, Plus, Users, Star, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudyGroupsSidebarProps {
  selectedGroup: string;
  onGroupSelect: (group: string) => void;
}

const StudyGroupsSidebar = ({ selectedGroup, onGroupSelect }: StudyGroupsSidebarProps) => {
  const groups = [
    { name: '#Math Wizards', members: 124, active: true, category: 'Mathematics' },
    { name: '#Science Champs', members: 89, active: true, category: 'Science' },
    { name: '#Mock Test Help', members: 156, active: false, category: 'General' },
    { name: '#Physics Squad', members: 67, active: true, category: 'Physics' },
    { name: '#Chemistry Lab', members: 78, active: false, category: 'Chemistry' },
    { name: '#Biology Buddies', members: 92, active: true, category: 'Biology' },
  ];

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
        <div className="space-y-1">
          {groups.map((group) => (
            <Button
              key={group.name}
              variant="ghost"
              className={`w-full justify-start h-auto p-3 text-left transition-all duration-200 ${
                selectedGroup === group.name
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'hover:bg-slate-700/50'
              }`}
              onClick={() => onGroupSelect(group.name)}
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="relative">
                  <Hash className="h-5 w-5 text-slate-400" />
                  {group.active && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white truncate">{group.name.slice(1)}</span>
                    {group.active && <Zap className="h-3 w-3 text-yellow-400" />}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Users className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-500">{group.members} members</span>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {group.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Create Group Button */}
      <div className="p-4 border-t border-slate-700/50">
        <Button className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/25">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>
    </div>
  );
};

export default StudyGroupsSidebar;