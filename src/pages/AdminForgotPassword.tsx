import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import logo from '@/assets/prep-ville-logo.svg';

const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your administrator email');
      return;
    }
    setSubmitted(true);
    toast.success('Admin password reset request logged.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-4 font-sans text-white antialiased">
      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl rounded-[24px] p-8 sm:p-10 shadow-2xl border border-slate-800 relative">
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <Link to="/" className="h-12 w-auto mb-3">
            <img src={logo} alt="The PrepVille" className="h-full w-auto object-contain brightness-0 invert" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Recovery</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reset Admin Password
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Administrator accounts require master verification to reset access.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-reset-email" className="text-xs font-bold text-slate-300 mb-1.5 block">
                Administrator Email
              </Label>
              <Input
                id="admin-reset-email"
                type="email"
                placeholder="admin@prepville.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-800 rounded-xl text-white bg-slate-950 text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Request Admin Reset Token</span>
            </Button>
          </form>
        ) : (
          <div className="text-center py-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 mb-4">
            <p className="text-xs font-medium text-indigo-200">
              Reset token requested for <strong>{email}</strong>. Master administrator notification dispatched.
            </p>
          </div>
        )}

        <div className="text-center pt-6 mt-4 border-t border-slate-800">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
