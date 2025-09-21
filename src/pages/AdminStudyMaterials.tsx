import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import StudyMaterialManager from '@/components/admin/StudyMaterialManager';

const AdminStudyMaterials = () => {
  const [activeTab, setActiveTab] = useState('study-materials');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <StudyMaterialManager />
        </div>
      </div>
    </div>
  );
};

export default AdminStudyMaterials;