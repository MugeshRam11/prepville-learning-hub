import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up any existing auth state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing...');
      }

      console.log('Attempting sign in with email:', email.trim());
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Supabase auth error:', error);
        // Provide more specific error messages
        if (error.message.includes('fetch')) {
          toast.error('Network error: Unable to connect to authentication service. Please check your internet connection and try again.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials and try again.');
        } else {
          toast.error(error.message);
        }
      } else if (data.user) {
        console.log('Sign in successful:', data.user.email);
        toast.success('Successfully signed in!');
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Password sign in error:', error);
      // Handle network errors specifically
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Connection failed: Unable to reach authentication service. Please check your internet connection and try again.');
      } else {
        toast.error('An unexpected error occurred during sign in');
      }
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
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
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
            className="w-full"
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
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="password" className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Password
        </TabsTrigger>
        <TabsTrigger value="otp" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          OTP
        </TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="otp">
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-otp">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email-otp"
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
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};

export default SignInForm;