import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import BulkUploadForm from '@/components/admin/BulkUploadForm';
import ManualQuestionForm from '@/components/admin/ManualQuestionForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminBulkUpload = () => {
  const [activeTab, setActiveTab] = useState('bulk-upload');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              SUBJECT QUESTION MANAGEMENT
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Create questions manually or upload CSV files in bulk - automatically sync to The Prep Ville portal
            </p>
          </div>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="manual">Manual Creation</TabsTrigger>
              <TabsTrigger value="bulk">CSV Bulk Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-6">
              <ManualQuestionForm />
            </TabsContent>

            <TabsContent value="bulk" className="space-y-6">
              <BulkUploadForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminBulkUpload;