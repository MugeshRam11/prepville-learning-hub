import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CreditCard, Settings, User, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Subscription = () => {
  const { user } = useAuth();
  const { subscription, loading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [managingSubscription, setManagingSubscription] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    } finally {
      setManagingSubscription(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'trial':
        return 'bg-blue-500';
      case 'expired':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">Loading subscription details...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Subscription Management
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription and billing preferences
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Current Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge 
                    className={`${getStatusColor(subscription?.status || 'inactive')} text-white`}
                  >
                    {subscription?.status?.toUpperCase() || 'INACTIVE'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="font-medium">
                    {subscription?.planName || 'No active plan'}
                  </span>
                </div>

                {subscription?.daysLeft !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Days Remaining</span>
                    <span className="font-medium">
                      {subscription.daysLeft} days
                    </span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Quick Actions</h4>
                  <div className="flex flex-col gap-2">
                    {subscription?.isSubscriptionActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManageSubscription}
                        disabled={managingSubscription}
                        className="justify-start"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {managingSubscription ? 'Opening...' : 'Manage Subscription'}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/pricing')}
                      className="justify-start"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      View Plans
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="font-medium">
                    {formatDate(user.created_at)}
                  </span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Account Actions</h4>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      className="justify-start"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trial Information */}
          {subscription?.isTrialActive && (
            <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Free Trial Active</h3>
                    <p className="text-blue-700">
                      You have {subscription.daysLeft} days left in your free trial. 
                      Upgrade to continue enjoying all premium features.
                    </p>
                  </div>
                </div>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade Now
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Subscription Expired */}
          {subscription?.status === 'expired' || subscription?.status === 'cancelled' || 
           (!subscription?.isTrialActive && !subscription?.isSubscriptionActive) && (
            <Card className="mt-6 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <h3 className="font-semibold text-red-900">Subscription Inactive</h3>
                    <p className="text-red-700">
                      Your subscription has expired. Renew to continue accessing premium features.
                    </p>
                  </div>
                </div>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/pricing')}
                >
                  Renew Subscription
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscription;