
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_popular: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

const Pricing = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = () => {
    if (!user) {
      navigate('/auth');
    } else if (subscription?.isTrialActive || subscription?.isSubscriptionActive) {
      navigate('/');
    } else {
      navigate('/auth');
    }
  };

  const handleUpgrade = (plan: Plan) => {
    // TODO: Implement Stripe checkout
    console.log('Upgrade to:', plan.name);
  };

  const getCurrentPrice = (plan: Plan) => {
    return billingInterval === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const getSavings = (plan: Plan) => {
    const yearlyMonthly = plan.price_yearly / 12;
    const savings = ((plan.price_monthly - yearlyMonthly) / plan.price_monthly) * 100;
    return Math.round(savings);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">Loading pricing plans...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Choose Your Perfect Plan
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required.
            </p>
            
            {/* Billing Toggle */}
            <Tabs value={billingInterval} onValueChange={(value) => setBillingInterval(value as 'monthly' | 'yearly')} className="mb-12">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                  <Badge variant="secondary" className="ml-2">Save up to 20%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${plan.is_popular ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        <Crown className="w-4 h-4 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        ${getCurrentPrice(plan)}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingInterval === 'monthly' ? 'month' : 'year'}
                      </span>
                      {billingInterval === 'yearly' && (
                        <div className="text-sm text-green-600 mt-1">
                          Save {getSavings(plan)}% annually
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full"
                      variant={plan.is_popular ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan)}
                    >
                      Choose {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trial CTA */}
            <div className="text-center mt-16">
              <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-4">Start Your Free Trial</h3>
                  <p className="text-muted-foreground mb-6">
                    Try all Premium features free for 14 days. No credit card required.
                  </p>
                  <Button size="lg" onClick={handleStartTrial}>
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">What happens during the free trial?</h3>
                  <p className="text-muted-foreground">
                    You get full access to all Premium features for 14 days. No credit card required to start.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                  <p className="text-muted-foreground">
                    Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                  <p className="text-muted-foreground">
                    We offer a 30-day money-back guarantee for all annual plans.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
