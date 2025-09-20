import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import TestManagement from '@/components/admin/TestManagement';

const AdminTests = () => {
  const [activeTab, setActiveTab] = useState('tests');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Test Management</h1>
            <p className="text-gray-600">Create and manage practice tests and assessments</p>
          </div>
          <TestManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminTests;