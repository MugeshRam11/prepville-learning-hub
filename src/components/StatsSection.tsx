import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Calculator, CheckCircle2, Award } from 'lucide-react';

const StatsSection = () => {
  const capabilities = [
    {
      icon: BookOpen,
      title: 'IB MYP Curriculum',
      subtitle: 'Complete Years 1–5 Focus',
      description: 'Strictly aligned to the International Baccalaureate Middle Years Programme Mathematics curriculum frameworks.'
    },
    {
      icon: Calculator,
      title: 'MathLive & KaTeX',
      subtitle: 'Equation Precision Engine',
      description: 'Interactive mathematical formula editing and standard LaTeX rendering for authentic exam notation.'
    },
    {
      icon: CheckCircle2,
      title: 'Step-by-Step Rubrics',
      subtitle: 'Verified Marking Criteria',
      description: 'Clear marking schemes and step-by-step model solutions isolated safely in protected answer tables.'
    },
    {
      icon: Award,
      title: 'Structured Assessment',
      subtitle: 'Practice & Mock Exams',
      description: 'Distinct workflows for self-directed question bank practice and timed, published mock examinations.'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
      <div className="container">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-sm border border-white/10">
            Platform Architecture & Pedagogical Standards
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
            Engineered for Mathematical Mastery
          </h2>
          <p className="text-base lg:text-lg text-indigo-200/90 max-w-2xl mx-auto">
            A purpose-built assessment architecture designed to deliver verifiable academic rigor for IB educators and students.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="bg-white/5 backdrop-blur-md border-white/10 text-white hover:bg-white/10 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white leading-snug">
                      {item.title}
                    </div>
                    <div className="text-xs font-semibold text-indigo-300">
                      {item.subtitle}
                    </div>
                  </div>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
