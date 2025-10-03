import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import BulkUploadForm from '@/components/admin/BulkUploadForm';

const AdminBulkUpload = () => {
  const [activeTab, setActiveTab] = useState('bulk-upload');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Bulk Question Upload</h1>
            <p className="text-gray-600 mt-2">Upload questions in bulk via CSV or JSON format</p>
          </div>
          <BulkUploadForm />
        </div>
      </div>
    </div>
  );
};

export default AdminBulkUpload;
