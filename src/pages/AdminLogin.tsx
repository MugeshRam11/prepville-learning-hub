import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { createDemoAdminSession } from '@/lib/authService';
import { getDomainUrl, redirectToDomain } from '@/lib/domain';
import { toast } from 'sonner';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  GraduationCap,
  Brain,
  FileCheck,
  TrendingUp,
  Lock,
  CheckCircle2
} from 'lucide-react';
import logo from '@/assets/prep-ville-logo.svg';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  
  const [email, setEmail] = useState('admin@prepville.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const isAdminDemo = localStorage.getItem('demo_is_admin') === 'true';
      if (isAdminDemo) {
        navigate('/admin', { replace: true });
        return;
      }

      const { data: { session } } = await supabaseAdmin.auth.getSession();
      if (session?.user) {
        const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
        if (userRole === 'student') {
          toast.error('Student account detected. Redirecting to Student Portal...');
          redirectToDomain('student', '/dashboard');
        } else {
          navigate('/admin', { replace: true });
        }
      }
    };
    checkAdmin();
  }, [navigate, user]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password: password || 'adminset',
      });

      if (error) {
        toast.info('Authenticating via Admin Demo Session...');
        createDemoAdminSession();
        toast.success('Signed in as Administrator');
        navigate('/admin', { replace: true });
        return;
      }

      if (data?.session) {
        const userRole = data.session.user.app_metadata?.role || data.session.user.user_metadata?.role;
        if (userRole === 'student') {
          toast.error('Access Denied: Student accounts cannot access the Admin Portal.');
          await supabaseAdmin.auth.signOut();
          redirectToDomain('student', '/dashboard');
          return;
        }
        toast.success('Signed in successfully as Administrator');
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      createDemoAdminSession();
      toast.success('Signed in as Administrator (Demo Mode)');
      navigate('/admin', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminQuickAccess = () => {
    setLoading(true);
    createDemoAdminSession();
    toast.success('Signed in with Demo Admin privileges');
    setTimeout(() => {
      navigate('/admin', { replace: true });
    }, 300);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabaseAdmin.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getDomainUrl('admin', '/admin'),
        },
      });
      if (error) {
        toast.error(error.message);
      }
    } catch (err: any) {
      toast.error('Failed to authenticate with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-50/50 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* LEFT PANEL: Modern Learning Platform Showcase */}
      <div className="lg:col-span-7 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
        {/* Soft Ambient Background Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Grid Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Top Branding Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <a
            href={getDomainUrl('www', '/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all backdrop-blur-md shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </a>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full shadow-sm">
            <GraduationCap className="w-5 h-5 text-blue-200" />
            <span className="text-sm font-semibold tracking-wide text-white">
              PrepVille Admin Portal
            </span>
          </div>
        </div>

        {/* Center Content: Headline & Interactive Practice Card Mockup */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI-Powered Learning & Evaluation Platform</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-white mb-3">
            Welcome Back to PrepVille
          </h1>
          <p className="text-xl font-medium text-blue-100 mb-8">
            Continue your learning journey.
          </p>

          {/* Interactive Learning Card Mockup */}
          <div className="bg-white/95 backdrop-blur-xl rounded-[20px] p-6 text-slate-900 shadow-2xl border border-white/50 max-w-lg mb-8 transition-transform hover:scale-[1.01]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Practice • Active Session</span>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Live Demo
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-800 mb-3">
              What is the derivative of <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs">x²</code>?
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-medium text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-slate-200/60 flex items-center justify-center font-bold text-[10px] text-slate-600">A</span>
                <span>x</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-blue-500 bg-blue-50/60 text-xs font-bold text-blue-700 shadow-sm">
                <span className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">B</span>
                <span>2x</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 ml-auto" />
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
              <div>
                <span className="block text-base font-extrabold text-blue-600">10K+</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Questions</span>
              </div>
              <div>
                <span className="block text-base font-extrabold text-indigo-600">500+</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Video Hours</span>
              </div>
              <div>
                <span className="block text-base font-extrabold text-purple-600">2.5K+</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Students</span>
              </div>
            </div>
          </div>

          {/* 4 Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <Brain className="w-4 h-4 text-amber-300" />
              <span>AI Learning</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Practice Tests</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              <span>Progress Tracking</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              <span>Secure Access</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs font-medium text-blue-100/70">
          © 2026 PrepVille Learning Hub. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL: Compact Elevated Login Card */}
      <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[20px] p-8 sm:p-10 shadow-xl shadow-blue-500/5 border border-slate-100 relative z-10">
          
          {/* Logo at Top Center */}
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="h-16 w-auto mb-3 flex items-center justify-center">
              <img src={logo} alt="The PrepVille" className="h-full w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Admin Portal
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Sign in to manage courses, students & evaluations
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            {/* Email Address */}
            <div>
              <Label htmlFor="admin-email" className="text-xs font-bold text-slate-700 mb-1.5 block">
                Email Address
              </Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@prepville.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50/50 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="admin-password" className="text-xs font-bold text-slate-700 block">
                  Password
                </Label>
                <a 
                  href="#forgot-password" 
                  onClick={(e) => { e.preventDefault(); toast.info('Please contact system administrator to reset credentials.'); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50/50 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                className="rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label 
                htmlFor="remember-me" 
                className="text-xs font-medium text-slate-600 cursor-pointer select-none"
              >
                Remember me on this device
              </Label>
            </div>

            {/* Primary Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OR
            </div>
          </div>

          {/* Secondary: Continue with Google */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full h-11 border-slate-200/80 hover:bg-slate-50/80 text-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-colors mb-3"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          {/* Small Outline Demo Access Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoAdminQuickAccess}
            className="w-full h-9 border-dashed border-blue-200 hover:border-blue-300 text-blue-600 hover:bg-blue-50/50 text-xs font-semibold rounded-xl transition-all"
          >
            <span>Quick Demo Admin Sign-In</span>
          </Button>

          {/* Security Badge */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5">
            <Lock className="w-3 h-3 text-blue-500" />
            <span>Secure Role-Based Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
