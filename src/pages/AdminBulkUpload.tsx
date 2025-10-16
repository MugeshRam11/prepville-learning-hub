import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import { toast } from 'sonner';

const AdminBulkUpload = () => {
  const [activeTab, setActiveTab] = useState('bulk-upload');

  const handleAIUploadSuccess = (data: any) => {
    toast.success('Questions uploaded successfully via AI!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Subject Q/A AI Upload
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Upload questions using AI - automatically sync to The Prep Ville portal
            </p>
          </div>

          <QuestionUploadCard mode="quick" onSuccess={handleAIUploadSuccess} />
        </div>
      </div>
    </div>
  );
};

export default AdminBulkUpload;