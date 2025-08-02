import React, { useState, useEffect } from 'react';
import StudyGroupsSidebar from '@/components/study-groups/StudyGroupsSidebar';
import StudyGroupsChat from '@/components/study-groups/StudyGroupsChat';
import StudyGroupsMembers from '@/components/study-groups/StudyGroupsMembers';
import AuthModal from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { MessageCirclePlus, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const StudyGroups = () => {
  const { user, signOut } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Study Groups
          </h1>
          <p className="text-slate-400 mb-6">Please sign in to join study groups and collaborate with others.</p>
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Sign In / Sign Up
          </Button>
        </div>
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="flex-shrink-0">
          <StudyGroupsSidebar 
            selectedGroup={selectedGroup}
            onGroupSelect={setSelectedGroup}
          />
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Sign Out */}
          <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm flex justify-between items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
              Study Groups Platform
            </h1>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white flex-shrink-0"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
          
          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            {selectedGroup ? (
              <StudyGroupsChat groupId={selectedGroup} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-400">Select a group to start chatting</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Sidebar */}
        {selectedGroup && (
          <div className="flex-shrink-0">
            <StudyGroupsMembers groupId={selectedGroup} />
          </div>
        )}
        
        {/* Floating Question Button */}
        {selectedGroup && (
          <Button
            onClick={() => setShowQuestionModal(true)}
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all duration-300 hover:scale-110 z-50"
            size="icon"
          >
            <MessageCirclePlus className="h-8 w-8" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default StudyGroups;