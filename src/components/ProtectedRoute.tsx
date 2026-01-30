import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isDemoSession } from '@/lib/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresSubscription?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresSubscription = false 
}) => {
  const { user, loading: authLoading, isDemo } = useAuth();
  const { subscription, loading: subscriptionLoading, hasAccess } = useSubscription();

  // Show loading while checking auth
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Allow access if user exists OR demo session is active
  const isAuthenticated = user || isDemo || isDemoSession();

  // Redirect to auth if not logged in and not demo
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If route requires subscription, check trial/subscription status
  // Demo users always have access
  if (requiresSubscription && !isDemo && !hasAccess) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
