
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'forever',
      description: 'Get started with basic features',
      features: [
        '50 questions per month',
        '5 video explanations',
        'Basic progress tracking',
        'Community support'
      ],
      popular: false
    },
    {
      name: 'Student',
      price: '19',
      period: 'month',
      description: 'Perfect for individual students',
      features: [
        'Unlimited questions',
        'All video explanations',
        'Advanced analytics',
        'Practice tests',
        'Study planner',
        'Email support'
      ],
      popular: true
    },
    {
      name: 'Premium',
      price: '39',
      period: 'month',
      description: 'Best for serious learners',
      features: [
        'Everything in Student',
        'Personalized learning paths',
        'Mock exam simulations',
        'Performance predictions',
        'Priority support',
        'Offline access'
      ],
      popular: false
    },
    {
      name: 'School',
      price: '299',
      period: 'month',
      description: 'For educational institutions',
      features: [
        'Up to 100 students',
        'Teacher dashboard',
        'Class management',
        'Bulk reporting',
        'Custom content',
        'Dedicated support'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Choose Your Learning Plan
              </h1>
              <p className="text-xl text-muted-foreground">
                Start with our free plan or upgrade for unlimited access to all features. 
                No setup fees, cancel anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative hover:shadow-lg transition-shadow ${
                    plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold">
                        ${plan.price}
                        <span className="text-base font-normal text-muted-foreground">
                          /{plan.period}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${
                        plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.name === 'Free' ? 'Get Started' : 'Choose Plan'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="mt-20">
              <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {[
                  {
                    question: 'Can I change plans anytime?',
                    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
                  },
                  {
                    question: 'Is there a free trial?',
                    answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required.'
                  },
                  {
                    question: 'What payment methods do you accept?',
                    answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans.'
                  },
                  {
                    question: 'Do you offer student discounts?',
                    answer: 'Yes, we offer a 20% discount for students with valid student ID verification.'
                  }
                ].map((faq, index) => (
                  <div key={index} className="space-y-2">
                    <h3 className="font-semibold">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
