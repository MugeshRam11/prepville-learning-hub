import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { getDomainUrl } from '@/lib/domain';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Send, 
  GraduationCap, 
  Loader2, 
  Sparkles, 
  Brain, 
  FileCheck, 
  TrendingUp, 
  Lock, 
  BookOpen,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import logo from '@/assets/prep-ville-logo.svg';

const StudentForgotPassword = () => {
  const { resetPassword } = useStudentAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your student email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message || 'Failed to send reset email. Please try again.');
      } else {
        setSubmitted(true);
        toast.success('Password reset instructions sent to your email');
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred while processing password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* LEFT PANEL: Student Showcase (7 Cols) */}
      <div className="lg:col-span-7 relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
        {/* Glow Orbs */}
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
              Student Recovery
            </span>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-auto py-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 mb-5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Secure Password Recovery</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.15] text-white mb-3">
            Reset Student Account Access
          </h1>
          <p className="text-lg xl:text-xl font-medium text-blue-100 mb-7 max-w-xl">
            Don't worry — enter your registered email address and we'll send you instant password reset instructions.
          </p>

          {/* Security Card Mockup */}
          <div className="bg-white/95 backdrop-blur-xl rounded-[20px] p-6 text-slate-900 shadow-2xl border border-white/50 max-w-lg mb-7 transition-transform hover:scale-[1.01]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Account Protection Protocol</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-blue-600" />
                256-bit SSL
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Instant email verification link dispatch</span>
              </div>
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Time-limited, single-use password update tokens</span>
              </div>
              <div className="flex items-start gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Preserves your XP progress, streak data, and saved exam history</span>
              </div>
            </div>
          </div>

          {/* 4 Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <Brain className="w-4 h-4 text-amber-300" />
              <span>AI Tutor</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Mock Exams</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              <span>XP Progress</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm">
              <BookOpen className="w-4 h-4 text-purple-300" />
              <span>Guides</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs font-medium text-blue-100/70">
          © 2026 PrepVille Learning Hub. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL: Forgot Password Card (5 Cols) */}
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
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password Recovery</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Reset Password
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Enter your email to receive recovery instructions
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <Label htmlFor="reset-email" className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Student Email Address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="student@prepville.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-slate-50/50 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Instructions</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                  Reset instructions dispatched! Please check your inbox at <strong className="text-emerald-900">{email}</strong> to set a new password.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitted(false)}
                className="w-full h-10 border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
              >
                Try Another Email Address
              </Button>
            </div>
          )}

          {/* Footer Back Link */}
          <div className="text-center text-xs font-medium text-slate-500 pt-6 mt-6 border-t border-slate-100">
            <Link to="/login" className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Login</span>
            </Link>
          </div>

          {/* Security Badge */}
          <div className="pt-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            <Lock className="w-3 h-3 text-blue-500" />
            <span>Secure Password Recovery</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentForgotPassword;
