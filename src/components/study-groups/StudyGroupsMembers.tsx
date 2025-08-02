import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Star, Zap } from 'lucide-react';

const StudyGroupsMembers = () => {
  const members = [
    { 
      name: 'Dr. Sarah Kim', 
      status: 'online', 
      role: 'Admin', 
      avatar: '', 
      xp: 5000,
      streak: 45,
      badges: ['Crown', 'Expert']
    },
    { 
      name: 'Maya Patel', 
      status: 'online', 
      role: 'Moderator', 
      avatar: '', 
      xp: 2340,
      streak: 23,
      badges: ['Shield', 'Helper']
    },
    { 
      name: 'Alex Chen', 
      status: 'online', 
      role: 'Top Helper', 
      avatar: '', 
      xp: 1250,
      streak: 12,
      badges: ['Star']
    },
    { 
      name: 'Sam Wilson', 
      status: 'away', 
      role: 'Member', 
      avatar: '', 
      xp: 890,
      streak: 7,
      badges: []
    },
    { 
      name: 'Luna Rodriguez', 
      status: 'online', 
      role: 'Helper', 
      avatar: '', 
      xp: 1580,
      streak: 18,
      badges: ['Star']
    },
    { 
      name: 'Jordan Lee', 
      status: 'offline', 
      role: 'Member', 
      avatar: '', 
      xp: 450,
      streak: 3,
      badges: []
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'offline': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'border-red-500 text-red-400';
      case 'Moderator': return 'border-blue-500 text-blue-400';
      case 'Top Helper': return 'border-purple-500 text-purple-400';
      case 'Helper': return 'border-green-500 text-green-400';
      default: return 'border-slate-500 text-slate-400';
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'Crown': return <Crown className="w-3 h-3" />;
      case 'Shield': return <Shield className="w-3 h-3" />;
      case 'Star': return <Star className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  return (
    <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="font-bold text-white">Members</h3>
        <p className="text-sm text-slate-400">
          {members.filter(m => m.status === 'online').length} online • {members.length} total
        </p>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {/* Online Members */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Online — {members.filter(m => m.status === 'online').length}
            </h4>
            {members.filter(m => m.status === 'online').map((member, idx) => (
              <div 
                key={idx}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer group"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10 border-2 border-gradient-to-r from-blue-400 to-purple-400">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(member.status)} rounded-full border-2 border-slate-800`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-white text-sm truncate">{member.name}</span>
                    {member.badges.map((badge, badgeIdx) => (
                      <div key={badgeIdx} className="text-yellow-400">
                        {getBadgeIcon(badge)}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRoleColor(member.role)}`}
                    >
                      {member.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                    <span>{member.xp} XP</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span>{member.streak}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Away Members */}
          {members.filter(m => m.status === 'away').length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Away — {members.filter(m => m.status === 'away').length}
              </h4>
              {members.filter(m => m.status === 'away').map((member, idx) => (
                <div 
                  key={idx}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer opacity-75"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-slate-600 text-white font-bold text-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-slate-800`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-300 text-sm truncate">{member.name}</span>
                    <div className="text-xs text-slate-500">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Offline Members */}
          {members.filter(m => m.status === 'offline').length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Offline — {members.filter(m => m.status === 'offline').length}
              </h4>
              {members.filter(m => m.status === 'offline').map((member, idx) => (
                <div 
                  key={idx}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer opacity-50"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-slate-600 text-white font-bold text-sm">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-400 text-sm truncate">{member.name}</span>
                    <div className="text-xs text-slate-500">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default StudyGroupsMembers;