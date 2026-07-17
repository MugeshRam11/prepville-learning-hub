
import React from 'react';
import logo from '@/assets/adsavvy-logo.svg';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Play,
  BarChart3,
  User,
  Menu,
  X,
  Home,
  Target,
  DollarSign,
  LogOut,
  Library,
  Bell,
  Trophy,
  LayoutDashboard
} from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isDemo } = useAuth();
  const { toast } = useToast();

  // Navigation items when logged in
  const loggedInNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/practice', label: 'Practice', icon: Target },
    { href: '/study-materials', label: 'Study Materials', icon: Library },
    { href: '/videos', label: 'Videos', icon: Play },
    { href: '/mock-exams/select', label: 'Mock Exams', icon: GraduationCap },
    { href: '/results', label: 'Results', icon: Trophy },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  ];

  // Navigation items when not logged in
  const publicNavItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/pricing', label: 'Pricing', icon: DollarSign },
  ];

  // Marketing/public pages keep the top bar even when logged in; only the
  // in-app pages use the left sidebar.
  const marketingRoutes = ['/', '/pricing'];
  const isMarketingPage = marketingRoutes.includes(location.pathname);
  const useSidebar = !!user && !isMarketingPage;

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out.",
        variant: "destructive",
      });
    }
  };

  // Offset page content for the fixed sidebar (desktop, logged-in only).
  // The `body.app-has-sidebar` rule in index.css only applies at lg+, so on
  // mobile the class is inert and the top bar is used instead.
  React.useEffect(() => {
    if (!useSidebar) return;
    document.body.classList.add('app-has-sidebar');
    return () => document.body.classList.remove('app-has-sidebar');
  }, [useSidebar]);

  // Live unread notification count for the sidebar badge.
  React.useEffect(() => {
    if (!user?.id || isDemo) return;
    let active = true;
    const load = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (active) setUnreadCount(count || 0);
    };
    load();
    const channel = supabase
      .channel('header-notif-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [user?.id, isDemo]);

  const navLinkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
      active
        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
        : "text-muted-foreground hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700"
    );

  const renderNavLink = (
    item: { href: string; label: string; icon: any; badge?: boolean },
    onClick?: () => void
  ) => (
    <Link key={item.href} to={item.href} onClick={onClick}>
      <span className={navLinkClass(isActive(item.href))}>
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="font-medium flex-1">{item.label}</span>
        {item.badge && unreadCount > 0 && (
          <Badge className="bg-red-500 text-white text-xs px-1.5 min-w-5 justify-center">
            {unreadCount}
          </Badge>
        )}
      </span>
    </Link>
  );

  // ============================================================
  // In-app pages: fixed left sidebar (desktop) + top bar (mobile)
  // ============================================================
  if (useSidebar) {
    return (
      <>
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col border-r bg-background/95 backdrop-blur z-50">
          <div className="p-4 border-b">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <img
                src={logo}
                alt="The Prep Ville"
                className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
              />
              <Badge variant="secondary" className="text-xs">MYP</Badge>
            </Link>
          </div>

          <ScrollArea className="flex-1 px-3 py-3">
            <nav className="space-y-1">
              {loggedInNavItems.map((item) => renderNavLink(item))}
            </nav>
          </ScrollArea>

          <div className="p-3 border-t space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3"
              onClick={() => navigate('/subscription')}
            >
              <User className="w-5 h-5" />
              <span>Account</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 text-red-600 hover:text-red-700"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <img
                src={logo}
                alt="The Prep Ville"
                className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
              />
              <Badge variant="secondary" className="text-xs">MYP</Badge>
            </Link>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Link to="/notifications" className="relative p-2">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {unreadCount}
                  </span>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="border-t py-3 px-4">
              <nav className="flex flex-col space-y-1">
                {loggedInNavItems.map((item) => renderNavLink(item, () => setIsMenuOpen(false)))}
                <div className="pt-3 mt-2 border-t space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={() => { navigate('/subscription'); setIsMenuOpen(false); }}
                  >
                    <User className="w-5 h-5" />
                    Account
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-red-600"
                    onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </header>
      </>
    );
  }

  // ============================================================
  // Logged-out: original public top bar
  // ============================================================
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <img
              src={logo}
              alt="The Prep Ville"
              className="h-28 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <Badge variant="secondary" className="text-xs">
              MYP
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {publicNavItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700"
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
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/auth')}
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  >
                    Sign Up
                  </Button>
                </>
              )}
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
              {publicNavItems.map((item) => (
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
                        : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700"
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}

              <div className="pt-4 border-t">
                {user ? (
                  <>
                    <Button
                      className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      onClick={() => {
                        navigate('/dashboard');
                        setIsMenuOpen(false);
                      }}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Go to Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/auth');
                        setIsMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                    <Button
                      className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      onClick={() => {
                        navigate('/auth');
                        setIsMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
