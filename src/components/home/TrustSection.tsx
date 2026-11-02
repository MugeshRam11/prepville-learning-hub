import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Award, BookCheck, Cpu, CheckCircle2 } from 'lucide-react';

const TrustSection = () => {
  const pedagogicalPillars = [
    {
      title: 'Criterion-Referenced Alignment',
      subtitle: 'IB MYP Assessment Criteria A–D',
      icon: Award,
      content:
        'Designed around IB MYP assessment objectives: Knowing and understanding (Criterion A), Investigating patterns (Criterion B), Communicating (Criterion C), and Applying mathematics in real-life contexts (Criterion D).'
    },
    {
      title: 'Equation Engine Precision',
      subtitle: 'KaTeX & MathLive Standard',
      icon: Cpu,
      content:
        'Eliminates formatting drift and ambiguous syntax. Questions and solutions are rendered in authentic mathematical notation with support for superscripts, fractions, radicals, and matrices.'
    },
    {
      title: 'Isolated Answer Security',
      subtitle: 'Protected Database Architecture',
      icon: Shield,
      content:
        'Marking rubrics, step-by-step solutions, and answer keys are protected by database row-level security and cannot be accessed before verified student submission.'
    }
  ];

  const standards = [
    { label: 'Curriculum Scope', value: 'IB MYP Mathematics' },
    { label: 'Evaluation Method', value: 'Rubric-Based' },
    { label: 'Equation Engine', value: 'KaTeX & MathLive' },
    { label: 'Data Architecture', value: 'Supabase RLS Protected' }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-3"
        >
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
            Pedagogical Foundation
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
            Academic Rigor & Platform Standards
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            PrepVille is built from the ground up to reflect the exact expectations of international assessment standards.
          </p>
        </motion.div>

        {/* Pedagogical Pillars */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pedagogicalPillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border border-border/80 bg-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Icon className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {pillar.title}
                      </h3>
                      <div className="text-xs font-semibold text-primary pt-0.5">
                        {pillar.subtitle}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {pillar.content}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Verified Platform Architecture Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border/70"
        >
          {standards.map((item, index) => (
            <div key={index} className="text-center space-y-1">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {item.label}
              </div>
              <div className="text-sm md:text-base font-bold text-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {item.value}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
