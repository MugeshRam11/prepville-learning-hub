
import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import DashboardOverview from '@/components/admin/DashboardOverview';
import UserManagement from '@/components/admin/UserManagement';
import TestManagement from '@/components/admin/TestManagement';
import ProgressReports from '@/components/admin/ProgressReports';
import AdminSettings from '@/components/admin/AdminSettings';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'tests':
        return <TestManagement />;
      case 'reports':
        return <ProgressReports />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-64 p-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
