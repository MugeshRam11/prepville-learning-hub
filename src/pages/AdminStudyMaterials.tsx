import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import StudyMaterialManager from '@/components/admin/StudyMaterialManager';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AdminStudyMaterials = () => {
  const [activeTab, setActiveTab] = useState('study-materials');
  const [showAIUpload, setShowAIUpload] = useState(false);

  const handleAIUploadSuccess = () => {
    toast.success('Study materials uploaded successfully!');
    setShowAIUpload(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={() => setShowAIUpload(!showAIUpload)} 
              variant="outline" 
              className="gap-2 border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <Sparkles className="h-4 w-4" />
              {showAIUpload ? 'Hide AI Upload' : 'AI Upload'}
            </Button>
          </div>
          
          {showAIUpload && (
            <div className="mb-6">
              <QuestionUploadCard mode="quick" onSuccess={handleAIUploadSuccess} />
            </div>
          )}
          
          <StudyMaterialManager />
        </div>
      </div>
    </div>
  );
};

export default AdminStudyMaterials;