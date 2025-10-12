import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import UserManagement from '@/components/admin/UserManagement';

const AdminUsers = () => {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>
          <UserManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;