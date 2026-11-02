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
  Wallet,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminAuth } from '@/hooks/useAdminAuth';
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
  const { signOut } = useAdminAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/admin/login', { replace: true });
    }
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
    { id: 'questions', label: 'Question Bank', icon: Database, path: '/admin/questions' },
    { id: 'tests', label: 'Practice Sets (Legacy)', icon: FileText, path: '/admin/tests' },
    { id: 'mock-tests', label: 'Mock Tests', icon: ClipboardList, path: '/admin/mock-tests' },
    { id: 'study-materials', label: 'Study Materials', icon: Upload, path: '/admin/study-materials' },
    { id: 'reports', label: 'Progress Reports', icon: BarChart3, path: '/admin/reports' },
    { id: 'billing', label: 'Billing', icon: Wallet, path: '/admin/billing' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const isActive = (item: any) => {
    if (item.path) {
      if (item.id === 'dashboard') {
        return location.pathname === item.path || location.pathname === '/admin' || location.pathname === '/dashboard';
      }
      return location.pathname === item.path || location.pathname.endsWith(item.path);
    }
    return activeTab === item.id;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-background border-r border-border flex flex-col z-30">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/5 p-1 shrink-0 overflow-hidden border border-border/50">
            <img src={prepVilleLogo} alt="The Prep Ville" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-foreground leading-tight">The PrepVille</h1>
            <p className="text-xs font-semibold text-muted-foreground">Admin Portal</p>
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
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
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
          variant="outline"
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold">Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
