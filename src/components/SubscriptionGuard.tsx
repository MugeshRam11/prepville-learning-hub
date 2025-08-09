import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature?: string;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  feature = "this feature" 
}) => {
  const { user } = useAuth();
  const { subscription, hasAccess, loading } = useSubscription();
  const navigate = useNavigate();

  // If not logged in, redirect to auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Crown className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please sign in to access {feature}.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking subscription...</p>
        </div>
      </div>
    );
  }

  // If has access (trial or subscription), show content
  if (hasAccess) {
    return <>{children}</>;
  }

  // No access - show upgrade message
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <Crown className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="text-2xl">Upgrade Required</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Your trial has ended. Upgrade to continue accessing {feature} and all premium features.
          </p>
          
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-2">What you'll get:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Unlimited access to all features</li>
              <li>• Advanced analytics and reporting</li>
              <li>• Priority customer support</li>
              <li>• Regular content updates</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate('/pricing')} className="flex-1">
              View Pricing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionGuard;