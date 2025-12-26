import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  BarChart3, 
  BookOpen, 
  MessageSquare, 
  RefreshCw,
  Check 
} from 'lucide-react';

const AnimatedCounter = ({ end, duration = 2 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;
    
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return (
    <motion.span
      onViewportEnter={() => setHasStarted(true)}
      viewport={{ once: true }}
    >
      {count.toLocaleString()}
    </motion.span>
  );
};

const QuestionBankPower = () => {
  const features = [
    {
      icon: Database,
      title: 'Thousands of Questions',
      description: 'Comprehensive question bank covering all major exam patterns',
      stat: '10,000+',
    },
    {
      icon: BarChart3,
      title: 'Multiple Difficulty Levels',
      description: 'Easy, Medium, and Hard questions to match your skill level',
      stat: '3 Levels',
    },
    {
      icon: BookOpen,
      title: 'Topic-wise Practice',
      description: 'Organized by subjects and topics for focused learning',
      stat: '50+ Topics',
    },
    {
      icon: MessageSquare,
      title: 'Instant Explanations',
      description: 'Detailed solutions and explanations for every question',
      stat: '100%',
    },
    {
      icon: RefreshCw,
      title: 'Unlimited Attempts',
      description: 'Practice as many times as you need to master concepts',
      stat: 'Unlimited',
    },
  ];

  const benefits = [
    'Exam-pattern questions',
    'Regular updates',
    'Previous year papers',
    'AI-curated recommendations',
    'Performance tracking',
    'Weak area identification',
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-foreground to-foreground/95 text-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <span className="inline-block px-4 py-2 bg-primary/20 text-primary-foreground rounded-full text-sm font-medium mb-4 border border-primary/30">
                Question Bank
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Unleash the Power of
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Smart Practice
                </span>
              </h2>
              <p className="text-lg text-background/70 leading-relaxed">
                Our question bank is designed by experts to cover every aspect of your exam preparation. 
                From basic concepts to advanced problems, we've got you covered.
              </p>
            </div>

            {/* Benefits List */}
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-background/80">{benefit}</span>
                </motion.div>
              ))}
            </div>

            {/* Big Stats */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              {[
                { value: 10000, label: 'Questions', suffix: '+' },
                { value: 95, label: 'Accuracy Rate', suffix: '%' },
                { value: 50, label: 'Topics', suffix: '+' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    <AnimatedCounter end={stat.value} />
                    {stat.suffix}
                  </div>
                  <div className="text-sm text-background/60 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Card className="group bg-background/5 border-background/10 hover:bg-background/10 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
                  <CardContent className="p-5 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-background group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-background/60 mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-primary">{feature.stat}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default QuestionBankPower;
