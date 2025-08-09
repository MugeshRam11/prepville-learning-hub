import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionBanner: React.FC = () => {
  const { user } = useAuth();
  const { subscription, hasAccess } = useSubscription();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show banner if user not logged in, has access, or banner dismissed
  if (!user || hasAccess || dismissed) {
    return null;
  }

  // Show trial ending soon warning
  if (subscription?.status === 'trial' && subscription?.daysLeft <= 3 && subscription?.daysLeft > 0) {
    return (
      <Alert className="bg-orange-50 border-orange-200 mb-0 rounded-none">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span className="text-orange-700">
            <strong>Trial ending soon!</strong> {subscription.daysLeft} day{subscription.daysLeft !== 1 ? 's' : ''} left. 
            Upgrade now to keep access to all features.
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate('/pricing')} className="bg-orange-600 hover:bg-orange-700">
              Upgrade Now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show trial expired message
  if (subscription?.status === 'trial' && subscription?.daysLeft <= 0) {
    return (
      <Alert className="bg-red-50 border-red-200 mb-0 rounded-none">
        <Crown className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span className="text-red-700">
            <strong>Trial expired!</strong> Upgrade to continue accessing all premium features.
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate('/pricing')} className="bg-red-600 hover:bg-red-700">
              Upgrade Now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default SubscriptionBanner;