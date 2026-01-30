import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isDemoSession } from '@/lib/authService';

interface SubscriptionStatus {
  status: string;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  daysLeft: number;
  planName: string;
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  hasAccess: boolean;
}

// Mock subscription for demo users
const DEMO_SUBSCRIPTION: SubscriptionStatus = {
  status: 'active',
  isTrialActive: false,
  isSubscriptionActive: true,
  daysLeft: 999,
  planName: 'Demo Access'
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemo } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    // Demo users get mock subscription - no API call needed
    if (isDemo || isDemoSession()) {
      setSubscription(DEMO_SUBSCRIPTION);
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_subscription_status', {
        user_uuid: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const sub = data[0];
        setSubscription({
          status: sub.status,
          isTrialActive: sub.is_trial_active,
          isSubscriptionActive: sub.is_subscription_active,
          daysLeft: sub.days_left,
          planName: sub.plan_name
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user?.id, isDemo]);

  // Demo users always have access
  const hasAccess = isDemo || isDemoSession() || subscription?.isTrialActive || subscription?.isSubscriptionActive || false;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      checkSubscription,
      hasAccess
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
