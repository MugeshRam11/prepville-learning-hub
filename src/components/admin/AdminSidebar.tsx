
import React from 'react';
import { 
  Home, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  HelpCircle,
  BookOpen,
  LogOut,
  ClipboardList,
  Upload,
  FileQuestion
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import prepVilleLogo from '@/assets/prep-ville-icon.png';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleNavigation = (tab: string, path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/admin' },
    { id: 'users', label: 'User Management', icon: Users, path: '/admin/users' },
    { id: 'tests', label: 'Quick Test', icon: FileText, path: '/admin/tests' },
    { id: 'mock-tests', label: 'Mock Tests', icon: ClipboardList, path: '/admin/mock-tests' },
    { id: 'study-materials', label: 'Study Materials', icon: Upload, path: '/admin/study-materials' },
    { id: 'questions', label: 'Subject Questions', icon: FileQuestion, path: '/admin/questions' },
    { id: 'bulk-upload', label: 'Bulk Upload', icon: Upload, path: '/admin/bulk-upload' },
    { id: 'reports', label: 'Progress Reports', icon: BarChart3, path: '/admin/reports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, path: '/admin/help' },
  ];

  const isActive = (item: any) => {
    if (item.path) {
      return location.pathname.startsWith(item.path);
    }
    return activeTab === item.id;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden">
            <img src={prepVilleLogo} alt="The Prep Ville" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">The Prep Ville</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.id, item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive(item)
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
