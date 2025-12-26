import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, BookOpen, Target, TrendingUp, ArrowRight } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: CreditCard,
      number: '01',
      title: 'Choose Your Plan',
      description: 'Select a plan that fits your learning goals. Start with free access or go premium for full features.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: BookOpen,
      number: '02',
      title: 'Access Question Banks',
      description: 'Explore thousands of curated questions organized by subject, topic, and difficulty level.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Target,
      number: '03',
      title: 'Practice & Analyze',
      description: 'Take quizzes, mock tests, and get instant feedback with detailed explanations.',
      color: 'from-pink-500 to-pink-600',
    },
    {
      icon: TrendingUp,
      number: '04',
      title: 'Improve Scores',
      description: 'Track your progress, identify weak areas, and watch your scores improve over time.',
      color: 'from-green-500 to-green-600',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  return (
    <section className="py-24 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
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
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            How{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PrepVille
            </span>{' '}
            Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and begin your journey to better scores
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, index) => (
            <motion.div key={step.number} variants={itemVariants}>
              <Card className="relative h-full group hover:shadow-xl transition-all duration-500 border-2 hover:border-primary/30 overflow-hidden">
                {/* Connecting line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/3 -right-3 w-6 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/30" />
                  </div>
                )}
                
                <CardContent className="p-6 relative">
                  {/* Step Number */}
                  <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20 group-hover:text-primary/10 transition-colors">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
