import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import BulkUploadForm from '@/components/admin/BulkUploadForm';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

const AdminBulkUpload = () => {
  const [activeTab, setActiveTab] = useState('bulk-upload');

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        subject: 'mathematics',
        topic: 'Algebra',
        question_text: 'What is 2 + 2?',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        answer_key: 'B',
        difficulty: 'easy',
        level: 'MYP',
        explanation: 'Basic addition: 2 + 2 equals 4',
        xp_reward: '10'
      },
      {
        subject: 'science',
        topic: 'Physics',
        question_text: 'What is the speed of light?',
        option_a: '299,792,458 m/s',
        option_b: '300,000 km/s',
        option_c: 'Both A and B',
        option_d: 'None',
        answer_key: 'C',
        difficulty: 'medium',
        level: 'DP',
        explanation: 'Speed of light is approximately 299,792,458 m/s or 300,000 km/s',
        xp_reward: '15'
      }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_questions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAIUploadSuccess = (data: any) => {
    toast.success('Questions uploaded successfully via AI!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Subject Q/A Bulk Upload
              </h1>
              <p className="text-muted-foreground mt-3 text-lg">
                Upload questions using AI or CSV - automatically sync to The Prep Ville portal
              </p>
            </div>
            <Button
              onClick={downloadSampleCSV}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Sample CSV
            </Button>
          </div>

          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="ai">AI Smart Upload</TabsTrigger>
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai">
              <QuestionUploadCard mode="quick" onSuccess={handleAIUploadSuccess} />
            </TabsContent>
            
            <TabsContent value="csv">
              <BulkUploadForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminBulkUpload;