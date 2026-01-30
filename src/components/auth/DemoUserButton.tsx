import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createDemoSession, DEMO_USER, cleanupAuthState } from '@/lib/authService';

/**
 * Demo User Button - Works completely offline
 * Bypasses backend and creates a mock session for demo purposes
 */
const DemoUserButton = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    setLoading(true);
    
    try {
      // Clean up any existing auth state first
      cleanupAuthState();
      
      // Small delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Create offline demo session - NO API CALLS
      createDemoSession();
      
      toast.success(`Welcome, ${DEMO_USER.name}! You're using the demo account.`);
      
      // Small delay to allow state to propagate before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use React Router navigation instead of window.location.href
      // This allows the app to re-read the localStorage session
      navigate('/dashboard', { replace: true });
      
      // Force a re-render by dispatching a storage event
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error('Failed to start demo session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleDemoLogin}
      variant="outline"
      className="w-full mb-4 h-12 text-base font-medium border-2 hover:bg-primary/5"
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Starting Demo...
        </>
      ) : (
        <>
          <User className="w-5 h-5 mr-2" />
          Try Demo Account
        </>
      )}
    </Button>
  );
};

export default DemoUserButton;
