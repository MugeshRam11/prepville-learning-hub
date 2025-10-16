import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import TestManagement from '@/components/admin/TestManagement';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

const AdminTests = () => {
  const [activeTab, setActiveTab] = useState('tests');
  const [showUpload, setShowUpload] = useState(false);

  const handleAIUploadSuccess = () => {
    toast.success('Questions uploaded successfully!');
    setShowUpload(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-end">
            <Button onClick={() => setShowUpload(!showUpload)} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              {showUpload ? 'Hide AI Upload' : 'Upload with AI'}
            </Button>
          </div>
          
          {showUpload && (
            <div className="mb-6">
              <QuestionUploadCard mode="quick" onSuccess={handleAIUploadSuccess} />
            </div>
          )}
          
          <TestManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminTests;