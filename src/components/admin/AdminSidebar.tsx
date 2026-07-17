
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
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    
    { id: 'students-progress', label: 'Student Progress', icon: BarChart3, path: '/admin/students-progress' },
    { id: 'evaluation', label: 'Evaluation Center', icon: FileText, path: '/admin/evaluation' },
    { id: 'tests', label: 'Practice Questions', icon: FileText, path: '/admin/tests' },
    { id: 'mock-tests', label: 'Mock Tests', icon: ClipboardList, path: '/admin/mock-tests' },
    
    { id: 'study-materials', label: 'Study Materials', icon: Upload, path: '/admin/study-materials' },
    
    
    { id: 'reports', label: 'Progress Reports', icon: BarChart3, path: '/admin/reports' },
    { id: 'billing', label: 'Billing', icon: Wallet, path: '/admin/billing' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, path: '/admin/help' },
  ];

  const isActive = (item: any) => {
    if (item.path) {
      // Use exact match for most routes to prevent incorrect highlighting
      // Allow startsWith only for the dashboard route to match child pages
      if (item.id === 'dashboard') {
        return location.pathname === item.path || location.pathname === '/admin';
      }
      return location.pathname === item.path;
    }
    return activeTab === item.id;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden">
            <img src={prepVilleLogo} alt="The Prep Ville" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">The Prep Ville</h1>
            <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <nav className="py-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.id, item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive(item)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full flex items-center space-x-3 px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
