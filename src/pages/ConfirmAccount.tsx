import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { getDomainUrl } from '@/lib/domain';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  GraduationCap, 
  ShieldCheck, 
  User, 
  Mail, 
  Key, 
  BadgeCheck,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import logo from '@/assets/prep-ville-logo.svg';

const ConfirmAccount = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isDemo } = useStudentAuth();

  const emailParam = searchParams.get('email') || user?.email || 'student@prepville.com';
  const rawUserId = user?.id || searchParams.get('user_id') || '8be897ac-17c7-4f8e-9c35-5231de91d380';
  const studentId = `STD-${new Date().getFullYear()}-${rawUserId.slice(0, 8).toUpperCase()}`;

  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen w-screen max-w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header Controls */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between py-2">
        <a
          href={getDomainUrl('www', '/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all backdrop-blur-md shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </a>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full shadow-sm">
          <GraduationCap className="w-4 h-4 text-blue-300" />
          <span className="text-xs font-semibold tracking-wide text-white">
            PrepVille Student Portal
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-xl mx-auto my-auto py-8">
        <div className="bg-white/95 backdrop-blur-2xl rounded-[28px] p-8 sm:p-10 shadow-2xl border border-white/20 text-slate-900 relative">
          
          {/* Animated Success Badge Header */}
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10 transition-transform hover:scale-105">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 mb-2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              <span>Email Confirmed & Verified</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Account Created Successfully!
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-md">
              Your student account has been verified and registered on The Prep Ville Learning Platform.
            </p>
          </div>

          {/* Student Identity Card */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 mb-6 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Student Verification Record</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Field: Student ID */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Student ID:</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                {studentId}
              </span>
            </div>

            {/* Field: Registered Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address:</span>
              </div>
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">
                {emailParam}
              </span>
            </div>

            {/* Field: Role & Access */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Role:</span>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                Student Portal User
              </span>
            </div>
          </div>

          {/* Quick Features Included Banner */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
              <Sparkles className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">AI Tutor Access</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <BookOpen className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">Question Bank</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
              <GraduationCap className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <span className="block text-[10px] font-bold text-slate-700">Mock Exams</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <Button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Go to Student Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Link
              to="/login"
              className="w-full h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
            >
              Sign In to Student Portal
            </Link>
          </div>

          {/* Security Badge */}
          <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verified Student Identity Record</span>
          </div>

        </div>
      </div>

      {/* Footer Copyright */}
      <div className="relative z-10 text-center text-xs font-medium text-slate-400 py-2">
        © 2026 The Prep Ville Learning Hub. All rights reserved.
      </div>
    </div>
  );
};

export default ConfirmAccount;
