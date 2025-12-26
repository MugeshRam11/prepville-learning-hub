import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlansPreview = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      description: 'Get started with basic features',
      price: '₹0',
      period: 'forever',
      features: [
        'Limited question access',
        'Basic analytics',
        'Community support',
      ],
      popular: false,
      gradient: 'from-slate-500 to-slate-600',
    },
    {
      name: 'Pro',
      description: 'Everything you need to excel',
      price: '₹299',
      period: '/month',
      features: [
        'Full question bank access',
        'Detailed explanations',
        'Advanced analytics',
        'Priority support',
      ],
      popular: true,
      gradient: 'from-primary to-accent',
    },
    {
      name: 'Premium',
      description: 'For serious exam preparation',
      price: '₹499',
      period: '/month',
      features: [
        'Everything in Pro',
        'AI tutoring',
        'Mock test series',
        'Personal mentor',
      ],
      popular: false,
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Simple Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Plan
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Flexible plans designed for every learner. Start free and upgrade as you grow.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={plan.popular ? 'md:-mt-4 md:mb-4' : ''}
            >
              <Card className={`h-full relative overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                plan.popular 
                  ? 'border-2 border-primary shadow-lg shadow-primary/20' 
                  : 'border-2 hover:border-primary/30'
              }`}>
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <motion.div
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 }}
                    >
                      <Badge className="rounded-none rounded-bl-lg bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </motion.div>
                  </div>
                )}

                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${plan.gradient}`} />

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price */}
                  <div className="text-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90'
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => navigate('/pricing')}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View Full Pricing Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center mt-12"
        >
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80 group"
            onClick={() => navigate('/pricing')}
          >
            View Full Pricing Details
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default PlansPreview;
