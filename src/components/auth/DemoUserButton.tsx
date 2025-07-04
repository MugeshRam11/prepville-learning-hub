
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const DemoUserButton = () => {
  const [loading, setLoading] = useState(false);
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

  const handleDemoLogin = async () => {
    setLoading(true);
    
    const demoEmail = 'demo@studyhub.com';
    const demoPassword = 'demo123456';

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

      // First try to sign in with demo credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // If demo user doesn't exist, create it
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: 'Demo User',
              first_name: 'Demo',
              last_name: 'User',
              role: 'student'
            }
          }
        });

        if (signUpError) {
          toast.error('Failed to create demo user: ' + signUpError.message);
          return;
        }

        if (signUpData.user) {
          // If email confirmation is required, show message
          if (!signUpData.user.email_confirmed_at) {
            toast.success('Demo user created! Please check email for confirmation (or disable email confirmation in Supabase settings for faster testing).');
            return;
          }

          // Try to sign in again after creating the account
          const { data: secondSignInData, error: secondSignInError } = await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: demoPassword,
          });

          if (secondSignInError) {
            toast.error('Demo user created but sign-in failed: ' + secondSignInError.message);
            return;
          }

          if (secondSignInData.user) {
            toast.success('Demo user created and signed in successfully!');
            window.location.href = '/';
          }
        }
      } else if (signInError && signInError.message.includes('Email not confirmed')) {
        toast.error('Demo account exists but email is not confirmed. Please check the demo email or disable email confirmation in Supabase settings.');
      } else if (signInError) {
        toast.error('Failed to sign in: ' + signInError.message);
      } else if (signInData.user) {
        toast.success('Successfully signed in as demo user!');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleDemoLogin}
      variant="outline"
      className="w-full mb-4"
      disabled={loading}
    >
      <User className="w-4 h-4 mr-2" />
      {loading ? 'Setting up Demo User...' : 'Try Demo Account'}
    </Button>
  );
};

export default DemoUserButton;
