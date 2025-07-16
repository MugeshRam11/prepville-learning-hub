
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  GraduationCap, 
  Play, 
  BarChart3, 
  User,
  Menu,
  X,
  Home,
  Target,
  Users,
  Settings
} from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/quick-practice', label: 'Quick Practice', icon: Target },
    { href: '/subjects', label: 'Subjects', icon: BookOpen },
    { href: '/videos', label: 'Videos', icon: Play },
    { href: '/mock-exams/select', label: 'Mock Exams', icon: GraduationCap },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
              P
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PrepVille
            </span>
            <Badge variant="secondary" className="text-xs">
              MYP
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button 
                  variant={isActive(item.href) ? "default" : "ghost"} 
                  className={`flex items-center space-x-2 ${
                    isActive(item.href) 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" 
                      : "hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* User Profile (Desktop) */}
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button 
                    variant={isActive(item.href) ? "default" : "ghost"} 
                    className={`w-full justify-start ${
                      isActive(item.href) 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" 
                        : ""
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              
              {/* Mobile User Actions */}
              <div className="pt-4 border-t">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
