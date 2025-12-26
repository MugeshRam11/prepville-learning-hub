import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, ArrowLeft, Lock, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  cleanupAuthState, 
  getFriendlyErrorMessage, 
  withRetry,
  updateServiceStatus 
} from '@/lib/authService';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Continue even if this fails
      }

      const result = await withRetry(async () => {
        return supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
        });
      });

      if (result.error) {
        const friendlyMessage = getFriendlyErrorMessage(result.error);
        setLastError(friendlyMessage);
        toast.error(friendlyMessage);
        updateServiceStatus(false, friendlyMessage);
      } else {
        setOtpSent(true);
        toast.success('OTP sent to your email! Please check your inbox.');
        updateServiceStatus(true);
      }
    } catch (error) {
      const friendlyMessage = getFriendlyErrorMessage(error);
      setLastError(friendlyMessage);
      toast.error(friendlyMessage);
      updateServiceStatus(false, friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    try {
      const result = await withRetry(async () => {
        return supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp,
          type: 'email'
        });
      });

      if (result.error) {
        const friendlyMessage = getFriendlyErrorMessage(result.error);
        setLastError(friendlyMessage);
        toast.error(friendlyMessage);
      } else if (result.data.user) {
        toast.success('Successfully signed in!');
        updateServiceStatus(true);
        window.location.href = '/';
      }
    } catch (error) {
      const friendlyMessage = getFriendlyErrorMessage(error);
      setLastError(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setLastError(null);
    
    try {
      const result = await withRetry(async () => {
        return supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
        });
      });

      if (result.error) {
        const friendlyMessage = getFriendlyErrorMessage(result.error);
        toast.error(friendlyMessage);
      } else {
        toast.success('New OTP sent to your email!');
      }
    } catch (error) {
      const friendlyMessage = getFriendlyErrorMessage(error);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Continue even if this fails
      }

      const result = await withRetry(async () => {
        return supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
      });

      if (result.error) {
        const friendlyMessage = getFriendlyErrorMessage(result.error);
        setLastError(friendlyMessage);
        toast.error(friendlyMessage);
        updateServiceStatus(false, friendlyMessage);
      } else if (result.data.user) {
        toast.success('Successfully signed in!');
        updateServiceStatus(true);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      const friendlyMessage = getFriendlyErrorMessage(error);
      setLastError(friendlyMessage);
      toast.error(friendlyMessage);
      updateServiceStatus(false, friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLastError(null);
  };

  const handleBack = () => {
    setOtpSent(false);
    setOtp('');
    setLastError(null);
  };

  // Error banner component
  const ErrorBanner = () => {
    if (!lastError) return null;
    
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-destructive">{lastError}</p>
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-destructive hover:text-destructive/80"
            onClick={handleRetry}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  };

  if (otpSent) {
    return (
      <div className="space-y-6">
        <ErrorBanner />
        
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
            className="w-full h-12"
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
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
    <div>
      <ErrorBanner />
      
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
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
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send you a 6-digit verification code
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignInForm;
