import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import MockTestBulkUploadForm from '@/components/admin/MockTestBulkUploadForm';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import { Button } from '@/components/ui/button';
import { Download, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const AdminMockTestBulkUpload = () => {
  const [activeTab, setActiveTab] = useState('mock-test-bulk-upload');

  const handleAIUploadSuccess = (data: any) => {
    toast.success('Mock test created successfully with AI parsing!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                MOCK TEST BULK UPLOAD
              </h1>
              <p className="text-muted-foreground mt-3 text-lg">
                Upload any document type - AI will automatically parse, organize by test, and sync to The Prep Ville portal
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/sample-csv/mocktest_120_questions_sample.csv';
                link.download = 'mocktest_sample.csv';
                link.click();
              }}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Sample CSV
            </Button>
          </div>

          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Smart Upload
              </TabsTrigger>
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="mt-6">
              <QuestionUploadCard mode="mock" onSuccess={handleAIUploadSuccess} />
            </TabsContent>

            <TabsContent value="csv" className="mt-6">
              <MockTestBulkUploadForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminMockTestBulkUpload;
