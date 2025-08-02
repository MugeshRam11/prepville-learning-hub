import React, { useState } from 'react';
import StudyGroupsSidebar from '@/components/study-groups/StudyGroupsSidebar';
import StudyGroupsChat from '@/components/study-groups/StudyGroupsChat';
import StudyGroupsMembers from '@/components/study-groups/StudyGroupsMembers';
import { Button } from '@/components/ui/button';
import { MessageCirclePlus } from 'lucide-react';

const StudyGroups = () => {
  const [selectedGroup, setSelectedGroup] = useState('#Math Wizards');
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <StudyGroupsSidebar 
          selectedGroup={selectedGroup}
          onGroupSelect={setSelectedGroup}
        />
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <StudyGroupsChat groupName={selectedGroup} />
        </div>
        
        {/* Right Sidebar */}
        <StudyGroupsMembers />
        
        {/* Floating Question Button */}
        <Button
          onClick={() => setShowQuestionModal(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all duration-300 hover:scale-110 z-50"
          size="icon"
        >
          <MessageCirclePlus className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
};

export default StudyGroups;