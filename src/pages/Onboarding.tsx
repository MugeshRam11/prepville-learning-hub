import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  User, Phone, Building2, GraduationCap, Users, Mail, 
  ArrowRight, ArrowLeft, Loader2, Check, Shield, Sparkles,
  Crown, Star, MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logo from '@/assets/prep-ville-logo.svg';

type OnboardingStep = 'details' | 'parent' | 'verification' | 'plan';

interface OnboardingData {
  fullName: string;
  studentPhone: string;
  institution: string;
  className: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('details');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fullName: '',
    studentPhone: '',
    institution: '',
    className: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
  });
  const [parentOtp, setParentOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [signupMethod, setSignupMethod] = useState<'email' | 'google'>('email');

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (isDemo) {
      navigate('/dashboard', { replace: true });
      return;
    }
    // Detect signup method
    const provider = user.app_metadata?.provider;
    if (provider === 'google') {
      setSignupMethod('google');
    }
    // Pre-fill name from user metadata
    const fullName = user.user_metadata?.full_name || 
      `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
    if (fullName) {
      setData(prev => ({ ...prev, fullName }));
    }
  }, [user, isDemo, navigate]);

  const updateField = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleDetailsNext = () => {
    if (!data.fullName.trim()) { toast.error('Please enter your full name'); return; }
    if (!data.studentPhone.trim()) { toast.error('Please enter your phone number'); return; }
    if (!data.institution.trim()) { toast.error('Please enter your institution'); return; }
    if (!data.className) { toast.error('Please select your class'); return; }
    setStep('parent');
  };

  const handleParentNext = () => {
    if (!data.parentName.trim()) { toast.error('Please enter parent name'); return; }
    if (!data.parentPhone.trim()) { toast.error('Please enter parent phone'); return; }
    if (!data.parentEmail.trim()) { toast.error('Please enter parent email'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.parentEmail)) { toast.error('Please enter a valid parent email'); return; }
    setStep('verification');
  };

  const handleSendParentOtp = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-otp', {
        body: { email: data.parentEmail, otp_type: 'parent_email' }
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success(`Verification code sent to ${data.parentEmail}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyParentOtp = async () => {
    if (parentOtp.length !== 6) { toast.error('Please enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('verify-otp', {
        body: { otp_code: parentOtp, otp_type: 'parent_email' }
      });
      if (error) throw error;
      toast.success('Parent email verified!');
      setStep('plan');
    } catch (err: any) {
      toast.error(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVerification = () => {
    // Allow skipping for now during development
    setStep('plan');
  };

  const handleCompletePlan = async () => {
    if (!selectedPlan) { toast.error('Please select a plan'); return; }
    setLoading(true);
    try {
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Update profile with all onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          student_phone: data.studentPhone,
          institution_name: data.institution,
          class_name: data.className,
          parent_name: data.parentName,
          parent_phone: data.parentPhone,
          parent_email: data.parentEmail,
          signup_method: signupMethod,
          onboarding_completed: true,
        })
        .eq('id', user!.id);

      if (profileError) throw profileError;

      toast.success('Welcome to The Prep Ville! 🎉');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: 'details', label: 'Student Details', icon: User },
    { key: 'parent', label: 'Parent Details', icon: Users },
    { key: 'verification', label: 'Verification', icon: Shield },
    { key: 'plan', label: 'Choose Plan', icon: Sparkles },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-6">
        <img src={logo} alt="The Prep Ville" className="h-16 w-auto" />
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8 w-full max-w-md">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < currentStepIndex ? 'bg-primary text-primary-foreground' :
                i === currentStepIndex ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center ${
                i <= currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mt-[-16px] ${
                i < currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="w-full max-w-md shadow-lg">
        {/* Step 1: Student Details */}
        {step === 'details' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Student Details
              </CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Enter your full name" value={data.fullName} 
                    onChange={e => updateField('fullName', e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input type="tel" placeholder="+91 98765 43210" value={data.studentPhone}
                    onChange={e => updateField('studentPhone', e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Institution / School / College *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Enter your institution name" value={data.institution}
                    onChange={e => updateField('institution', e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class / Grade *</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 z-10 pointer-events-none" />
                  <Select value={data.className} onValueChange={v => updateField('className', v)}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select your class" />
                    </SelectTrigger>
                    <SelectContent>
                      {['MYP 1','MYP 2','MYP 3','MYP 4','MYP 5','DP 1','DP 2'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleDetailsNext} className="w-full h-12">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 2: Parent Details */}
        {step === 'parent' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Parent / Guardian Details
              </CardTitle>
              <CardDescription>We need your parent's contact for account verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Parent Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Enter parent's full name" value={data.parentName}
                    onChange={e => updateField('parentName', e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parent Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input type="tel" placeholder="+91 98765 43210" value={data.parentPhone}
                    onChange={e => updateField('parentPhone', e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parent Email ID *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input type="email" placeholder="parent@email.com" value={data.parentEmail}
                    onChange={e => updateField('parentEmail', e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1 h-12">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleParentNext} className="flex-1 h-12">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: OTP Verification */}
        {step === 'verification' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Verify Parent Email
              </CardTitle>
              <CardDescription>
                We'll send a verification code to <strong>{data.parentEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-center">
                    <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-medium">Parent email verification required</p>
                    <p className="text-muted-foreground mt-1">
                      A 6-digit code will be sent to your parent's email for account verification.
                    </p>
                  </div>
                  <Button onClick={handleSendParentOtp} className="w-full h-12" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : 
                      <>Send Verification Code <Mail className="w-4 h-4 ml-2" /></>}
                  </Button>
                  <Button variant="ghost" onClick={handleSkipVerification} className="w-full text-muted-foreground">
                    Skip for now (verify later)
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter the 6-digit code sent to <strong>{data.parentEmail}</strong>
                    </p>
                    <div className="flex justify-center mb-4">
                      <InputOTP value={parentOtp} onChange={setParentOtp} maxLength={6}>
                        <InputOTPGroup>
                          {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button onClick={handleVerifyParentOtp} className="w-full h-12" 
                    disabled={loading || parentOtp.length !== 6}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 
                      'Verify & Continue'}
                  </Button>
                  <div className="text-center">
                    <Button variant="link" onClick={handleSendParentOtp} disabled={loading} className="text-sm">
                      Resend Code
                    </Button>
                  </div>
                </>
              )}
              <div className="flex justify-start">
                <Button variant="ghost" size="sm" onClick={() => { setStep('parent'); setOtpSent(false); setParentOtp(''); }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 4: Plan Selection */}
        {step === 'plan' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Choose Your Plan
              </CardTitle>
              <CardDescription>Currently available: Mathematics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Plan */}
              <div 
                onClick={() => setSelectedPlan('trial_basic')}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedPlan === 'trial_basic' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Basic</h3>
                  </div>
                  <Badge variant="secondary">2 Months Free</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mathematics • Essential features</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>✓ Practice questions</li>
                  <li>✓ Mock exams</li>
                  <li>✓ Basic AI tutor</li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div 
                onClick={() => setSelectedPlan('trial_pro')}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all relative ${
                  selectedPlan === 'trial_pro' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Badge className="absolute -top-2 right-3 bg-primary">Recommended</Badge>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold">Pro</h3>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">2 Months Free</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Mathematics • All features unlocked</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>✓ Everything in Basic</li>
                  <li>✓ Advanced AI tutor</li>
                  <li>✓ Detailed analytics</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>

              {/* Enterprise */}
              <div 
                onClick={() => setSelectedPlan('enterprise_inquiry')}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedPlan === 'enterprise_inquiry' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold">Enterprise</h3>
                  </div>
                  <Badge variant="outline">Custom</Badge>
                </div>
                <p className="text-sm text-muted-foreground">For institutions • Custom pricing</p>
                <div className="flex items-center gap-1 text-xs text-primary mt-2">
                  <MessageCircle className="w-3 h-3" /> Contact us for details
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Free trial for 2 months. Billing terms apply after trial period.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('verification')} className="flex-1 h-12">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleCompletePlan} className="flex-1 h-12" disabled={loading || !selectedPlan}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up...</> :
                    'Start Learning 🚀'}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default Onboarding;
