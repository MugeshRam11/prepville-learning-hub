
import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import DashboardOverview from '@/components/admin/DashboardOverview';
import UserManagement from '@/components/admin/UserManagement';
import TestManagement from '@/components/admin/TestManagement';
import ProgressReports from '@/components/admin/ProgressReports';
import AdminSettings from '@/components/admin/AdminSettings';
import StudyMaterialManager from '@/components/admin/StudyMaterialManager';
import SubjectQuestionManager from '@/components/admin/SubjectQuestionManager';

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
      case 'study-materials':
        return <StudyMaterialManager />;
      case 'questions':
        return <SubjectQuestionManager />;
      case 'reports':
        return <ProgressReports />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-64 p-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
