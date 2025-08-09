import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const cleanupAuthState = () => {
    // Clear all auth-related storage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up any existing auth state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Global signout failed, continuing...');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        setOtpSent(true);
        toast.success('OTP sent to your email! Please check your inbox.');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('An unexpected error occurred while sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email'
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        toast.success('Successfully signed in!');
        // Force page reload for clean state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('An unexpected error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('New OTP sent to your email!');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setOtpSent(false);
    setOtp('');
  };

  if (otpSent) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold">Check your email</h3>
          <p className="text-muted-foreground">
            We've sent a 6-digit verification code to <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-center block">Enter verification code</Label>
            <div className="flex justify-center">
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={handleResendOtp}
              disabled={loading}
            >
              Resend OTP
            </Button>
          </p>
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-sm"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
            autoComplete="email"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll send you a 6-digit verification code
        </p>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Verification Code'}
      </Button>
    </form>
  );
};

export default SignInForm;