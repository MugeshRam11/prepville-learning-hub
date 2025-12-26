import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BarChart3, 
  Brain, 
  Clock, 
  FileText, 
  RefreshCw,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';

const SmartFeatures = () => {
  const features = [
    {
      icon: BarChart3,
      title: 'Performance Analytics',
      description: 'Track your progress with detailed insights and visual charts showing your improvement over time.',
      gradient: 'from-blue-500 to-cyan-500',
      delay: 0,
    },
    {
      icon: Brain,
      title: 'Smart Difficulty Adjustment',
      description: 'AI adapts question difficulty based on your performance to optimize learning.',
      gradient: 'from-purple-500 to-pink-500',
      delay: 0.1,
    },
    {
      icon: Clock,
      title: 'Time Management Practice',
      description: 'Timed tests help you build speed and accuracy for real exam conditions.',
      gradient: 'from-orange-500 to-red-500',
      delay: 0.2,
    },
    {
      icon: FileText,
      title: 'Detailed Explanations',
      description: 'Every question comes with step-by-step solutions and concept explanations.',
      gradient: 'from-green-500 to-emerald-500',
      delay: 0.3,
    },
    {
      icon: RefreshCw,
      title: 'Reattempt & Revision Mode',
      description: 'Review mistakes and reattempt questions you got wrong for better retention.',
      gradient: 'from-indigo-500 to-blue-500',
      delay: 0.4,
    },
    {
      icon: Target,
      title: 'Weak Area Identification',
      description: 'Pinpoint exactly which topics need more practice with AI-powered analysis.',
      gradient: 'from-rose-500 to-pink-500',
      delay: 0.5,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Smart Learning{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cutting-edge technology designed to make your learning experience 
            more effective and enjoyable
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: feature.delay, duration: 0.5 }}
            >
              <Card className="h-full group hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/20 overflow-hidden relative">
                <CardContent className="p-6">
                  {/* Icon */}
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover effect */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full border border-primary/20">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">
              More features being added regularly
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SmartFeatures;
