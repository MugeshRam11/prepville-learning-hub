
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const DemoUserButton = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    setLoading(true);
    
    const demoEmail = 'demo@studyhub.com';
    const demoPassword = 'demo123456';

    try {
      // First try to sign in with demo credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // If demo user doesn't exist, create it
        const { error: signUpError } = await supabase.auth.signUp({
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

        // Try to sign in again after creating the account
        const { error: secondSignInError } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        if (secondSignInError) {
          toast.error('Demo user created but sign-in failed. Please check your email for confirmation.');
          return;
        }
      } else if (signInError) {
        toast.error('Failed to sign in: ' + signInError.message);
        return;
      }

      toast.success('Successfully signed in as demo user!');
      navigate('/');
    } catch (error) {
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
      {loading ? 'Creating Demo User...' : 'Try Demo Account'}
    </Button>
  );
};

export default DemoUserButton;
