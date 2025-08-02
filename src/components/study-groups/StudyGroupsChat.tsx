import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StudyGroupsChatProps {
  groupId: string;
}

const StudyGroupsChat = ({ groupId }: StudyGroupsChatProps) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchGroupInfo();
      fetchQuestions();
    }
  }, [groupId]);

  const fetchGroupInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroupInfo(data);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('study_questions')
        .select(`
          *,
          study_groups_users!study_questions_asked_by_fkey (
            username,
            avatar_url,
            reputation,
            role
          ),
          study_answers (
            *,
            study_groups_users!study_answers_answered_by_fkey (
              username,
              avatar_url,
              reputation,
              role
            )
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

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
            <h3 className="font-bold text-white">{groupInfo?.group_name || 'Loading...'}</h3>
            <p className="text-xs text-slate-400">{groupInfo?.member_count || 0} members</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-slate-400">Loading questions...</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <HelpCircle className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-400 mb-2">No questions yet</p>
            <p className="text-sm text-slate-500">Be the first to ask a question!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <Card 
                key={question.id} 
                className="border border-blue-500/30 bg-slate-800/30 hover:shadow-blue-500/20 transition-all duration-300 hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10 border-2 border-gradient-to-r from-blue-400 to-purple-400">
                        <AvatarImage src={question.study_groups_users?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold">
                          {question.study_groups_users?.username?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{question.study_groups_users?.username || 'Unknown'}</span>
                          <Badge 
                            variant="outline" 
                            className="text-xs border-green-500 text-green-400"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            {question.study_groups_users?.role || 'student'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-slate-400">{question.study_groups_users?.reputation || 0} XP</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">{new Date(question.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-slate-200 mb-4">{question.content}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {question.upvotes}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-purple-400 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {question.answer_count}
                      </Button>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {question.is_resolved ? (
                        <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                          <HelpCircle className="w-3 h-3 mr-1" />
                          Open
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Answers */}
                  {question.study_answers && question.study_answers.length > 0 && (
                    <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
                      {question.study_answers.slice(0, 2).map((answer: any) => (
                        <div key={answer.id} className="bg-slate-700/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={answer.study_groups_users?.avatar_url} />
                              <AvatarFallback className="bg-purple-500 text-white text-xs">
                                {answer.study_groups_users?.username?.slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-white">{answer.study_groups_users?.username || 'Unknown'}</span>
                            {answer.is_verified && (
                              <Badge className="text-xs bg-emerald-500/20 text-emerald-400">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{answer.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-slate-400 hover:text-blue-400 h-6 px-2"
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {answer.upvotes}
                            </Button>
                            <span className="text-xs text-slate-500">{new Date(answer.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                      {question.study_answers.length > 2 && (
                        <Button variant="ghost" className="text-blue-400 hover:text-blue-300 text-sm">
                          View {question.study_answers.length - 2} more answers
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5 text-slate-400" />
          </Button>
          <Input 
            placeholder={`Ask a question in ${groupInfo?.group_name || 'this group'}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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