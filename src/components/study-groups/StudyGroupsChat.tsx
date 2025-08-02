import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ThumbsUp, 
  MessageCircle, 
  MoreVertical, 
  Send, 
  Paperclip,
  CheckCircle,
  Star,
  Flame,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

interface StudyGroupsChatProps {
  groupName: string;
}

const StudyGroupsChat = ({ groupName }: StudyGroupsChatProps) => {
  const messages = [
    {
      id: 1,
      type: 'question',
      user: { name: 'Alex Chen', avatar: '', xp: 1250, badge: 'Top Helper' },
      content: 'Can someone help me understand quadratic equations? I\'m struggling with factoring.',
      timestamp: '2 hours ago',
      upvotes: 5,
      replies: 3,
      verified: false,
      reactions: ['💡', '❓', '🔥']
    },
    {
      id: 2,
      type: 'answer',
      user: { name: 'Maya Patel', avatar: '', xp: 2340, badge: 'Math Wizard' },
      content: 'Sure! Let me break it down for you. When factoring quadratic equations like ax² + bx + c, you need to find two numbers that multiply to give \'ac\' and add to give \'b\'.',
      timestamp: '1 hour ago',
      upvotes: 12,
      replies: 1,
      verified: true,
      reactions: ['✅', '🔥', '💡']
    },
    {
      id: 3,
      type: 'question',
      user: { name: 'Sam Wilson', avatar: '', xp: 890, badge: 'New Helper' },
      content: 'Does anyone have good resources for practicing calculus derivatives?',
      timestamp: '30 mins ago',
      upvotes: 2,
      replies: 0,
      verified: false,
      reactions: ['❓']
    }
  ];

  const getReactionEmoji = (reaction: string) => {
    const reactionMap: { [key: string]: string } = {
      '✅': '✅',
      '💡': '💡', 
      '❓': '❓',
      '🔥': '🔥'
    };
    return reactionMap[reaction] || reaction;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">#</span>
          </div>
          <div>
            <h3 className="font-bold text-white">{groupName.slice(1)}</h3>
            <p className="text-xs text-slate-400">124 members • 15 online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <Card 
              key={message.id} 
              className={`border transition-all duration-300 hover:shadow-lg ${
                message.type === 'question' 
                  ? 'border-blue-500/30 bg-slate-800/30 hover:shadow-blue-500/20' 
                  : 'border-purple-500/30 bg-slate-800/20 hover:shadow-purple-500/20'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10 border-2 border-gradient-to-r from-blue-400 to-purple-400">
                      <AvatarImage src={message.user.avatar} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold">
                        {message.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{message.user.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs border ${
                            message.user.badge === 'Math Wizard' 
                              ? 'border-purple-500 text-purple-400' 
                              : message.user.badge === 'Top Helper'
                              ? 'border-yellow-500 text-yellow-400'
                              : 'border-green-500 text-green-400'
                          }`}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          {message.user.badge}
                        </Badge>
                        {message.verified && (
                          <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-slate-400">{message.user.xp} XP</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{message.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-slate-200 mb-4">{message.content}</p>
                
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {message.upvotes}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 hover:text-purple-400 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {message.replies}
                    </Button>
                  </div>
                  
                  {/* Reactions */}
                  <div className="flex items-center space-x-2">
                    {message.reactions.map((reaction, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:scale-125 transition-transform duration-200"
                      >
                        <span className="text-lg">{getReactionEmoji(reaction)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5 text-slate-400" />
          </Button>
          <Input 
            placeholder={`Ask a question in ${groupName}...`}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
          />
          <Button 
            size="icon"
            className="shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudyGroupsChat;