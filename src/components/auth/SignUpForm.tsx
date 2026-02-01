import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowLeft, Loader2, RefreshCw, AlertCircle, IdCard, Hash, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  cleanupAuthState, 
  getFriendlyErrorMessage, 
  withRetry,
  updateServiceStatus 
} from '@/lib/authService';

const SignUpForm = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [className, setClassName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastError(null);
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Continue even if this fails
      }

      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = await withRetry(async () => {
        return supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              student_id: studentId.trim(),
              roll_number: rollNumber.trim(),
              class_name: className,
              role: 'student'
            }
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
        toast.success('Account created! Please check your email for the verification code.');
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
          type: 'signup'
        });
      });

      if (result.error) {
        const friendlyMessage = getFriendlyErrorMessage(result.error);
        setLastError(friendlyMessage);
        toast.error(friendlyMessage);
      } else if (result.data.user) {
        toast.success('Email verified! Account created successfully.');
        updateServiceStatus(true);
        // Clear the form
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setOtpSent(false);
        // Force page reload for clean state
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
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = await withRetry(async () => {
        return supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              student_id: studentId.trim(),
              roll_number: rollNumber.trim(),
              class_name: className,
              role: 'student'
            }
          }
        });
      });

      if (result.error) {
        const friendlyMessage = getFriendlyErrorMessage(result.error);
        toast.error(friendlyMessage);
      } else {
        toast.success('New verification code sent to your email!');
      }
    } catch (error) {
      const friendlyMessage = getFriendlyErrorMessage(error);
      toast.error(friendlyMessage);
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
          <h3 className="text-xl font-semibold">Verify your email</h3>
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
              'Verify & Create Account'
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
              Resend Code
            </Button>
          </p>
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-sm"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to form
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ErrorBanner />
      
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="signup-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
        </div>

        {/* Student Identity Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="studentId"
                type="text"
                placeholder="e.g. STU001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="pl-10"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rollNumber">Roll Number</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="rollNumber"
                type="text"
                placeholder="e.g. 101"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="pl-10"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="className">Class</Label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10 pointer-events-none" />
            <Select value={className} onValueChange={setClassName} disabled={loading}>
              <SelectTrigger id="className" className="pl-10">
                <SelectValue placeholder="Select your class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MYP 1">MYP 1</SelectItem>
                <SelectItem value="MYP 2">MYP 2</SelectItem>
                <SelectItem value="MYP 3">MYP 3</SelectItem>
                <SelectItem value="MYP 4">MYP 4</SelectItem>
                <SelectItem value="MYP 5">MYP 5</SelectItem>
                <SelectItem value="DP 1">DP 1</SelectItem>
                <SelectItem value="DP 2">DP 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
              autoComplete="tel"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              autoComplete="new-password"
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              autoComplete="new-password"
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </div>
  );
};

export default SignUpForm;
