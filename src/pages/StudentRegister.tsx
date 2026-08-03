import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { supabaseStudent } from '@/lib/supabaseStudent';
import { getDomainUrl, redirectToDomain } from '@/lib/domain';
import { toast } from 'sonner';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  GraduationCap, 
  Loader2, 
  Sparkles, 
  Brain, 
  FileCheck, 
  TrendingUp, 
  Lock, 
  CheckCircle2,
  BookOpen,
  UserCheck
} from 'lucide-react';
import logo from '@/assets/prep-ville-logo.svg';

const StudentRegister = () => {
  const navigate = useNavigate();
  const { signUp, user } = useStudentAuth();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const userRole = user.app_metadata?.role || user.user_metadata?.role;
      if (userRole === 'admin') {
        redirectToDomain('admin', '/dashboard');
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, username);
      if (error) {
        toast.error(error.message || 'Registration failed. Please try again.');
      } else {
        toast.success('Account created successfully! Welcome to PrepVille.');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabaseStudent.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getDomainUrl('student', '/dashboard'),
        },
      });
      if (error) {
        toast.error(error.message);
      }
    } catch (err: any) {
      toast.error('Failed to register with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* LEFT PANEL: Modern Student Showcase (7 Cols) */}
      <div className="lg:col-span-7 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Top Header Controls */}
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
              Student Registration
            </span>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-auto py-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 mb-5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Join Thousands of IB & MYP Students</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-white mb-3">
            Start Your Prep Journey Today
          </h1>
          <p className="text-lg xl:text-xl font-medium text-blue-100 mb-7 max-w-xl">
            Create your account to unlock adaptive practice sets, step-by-step AI hints, timed exam simulation, and XP rewards.
          </p>

          {/* Registration Perks Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-[20px] p-6 text-slate-900 shadow-2xl border border-white/50 max-w-lg mb-7 transition-transform hover:scale-[1.01]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">What's Included in Your Free Plan</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                Instant Access
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Access 10,000+ IB & MYP past paper style practice questions</span>
              </div>
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>AI Tutor hints and step-by-step formula derivations</span>
              </div>
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Full-length timed mock exams with instant auto-grading</span>
              </div>
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>XP level progression, daily streak tracking, and study analytics</span>
              </div>
            </div>
          </div>

          {/* 4 Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <Brain className="w-4 h-4 text-amber-300" />
              <span>Smart Hints</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Full Mocks</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              <span>XP Badges</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <BookOpen className="w-4 h-4 text-purple-300" />
              <span>Formulas</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs font-medium text-blue-100/70">
          © 2026 PrepVille Learning Hub. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL: Registration Card (5 Cols) */}
      <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex flex-col justify-center items-center p-6 sm:p-10 relative overflow-y-auto h-full">
        
        {/* Mobile Navigation Header */}
        <div className="lg:hidden w-full max-w-md flex items-center justify-between mb-6">
          <a
            href={getDomainUrl('www', '/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </a>
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold text-blue-600">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </div>
        </div>

        <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-[24px] p-8 sm:p-10 shadow-xl shadow-blue-500/5 border border-slate-100 relative z-10">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="h-16 w-auto mb-3 flex items-center justify-center">
              <img src={logo} alt="The PrepVille" className="w-[180px] h-auto object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-600 mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Registration</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Create Your Account
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Join thousands of students practicing on PrepVille
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStudentRegister} className="space-y-4">
            {/* Full Name / Username */}
            <div>
              <Label htmlFor="reg-username" className="text-xs font-bold text-slate-700 mb-1.5 block">
                Full Name / Username
              </Label>
              <Input
                id="reg-username"
                type="text"
                placeholder="Alex Johnson"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50/50 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Email Address */}
            <div>
              <Label htmlFor="reg-email" className="text-xs font-bold text-slate-700 mb-1.5 block">
                Email Address
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="student@prepville.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50/50 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="reg-password" className="text-xs font-bold text-slate-700 mb-1.5 block">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="•••••••• (Min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50/50 focus:bg-white transition-all"
                  required
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

            {/* Primary Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OR
            </div>
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
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
                <span>Register with Google</span>
              </>
            )}
          </Button>

          {/* Footer Signin Link */}
          <div className="text-center text-xs font-medium text-slate-500 pt-4 mt-4 border-t border-slate-100">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
              Sign In Here
            </Link>
          </div>

          {/* Security Badge */}
          <div className="pt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-2">
            <Lock className="w-3 h-3 text-blue-500" />
            <span>Encrypted Account Registration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
