import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminSettings from '@/components/admin/AdminSettings';

const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <AdminSettings />
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
