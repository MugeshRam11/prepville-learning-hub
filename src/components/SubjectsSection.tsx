import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubjectCardItem {
  title: string;
  description: string;
  topics: string[];
  level: 'MYP' | 'IBDP';
  status: 'available' | 'coming_soon';
  color: string;
}

const SubjectsSection = () => {
  const navigate = useNavigate();

  const subjects: SubjectCardItem[] = [
    {
      title: 'IB MYP Mathematics',
      description: 'Comprehensive coverage of Middle Years Programme Mathematics (Years 1 to 5). Independent question bank, equation editor, and mock exams.',
      topics: ['Number', 'Algebra', 'Geometry & Trigonometry', 'Statistics & Probability'],
      level: 'MYP',
      status: 'available',
      color: 'bg-emerald-500'
    },
    {
      title: 'IBDP Mathematics (AA & AI)',
      description: 'Analysis & Approaches and Applications & Interpretation at Higher Level and Standard Level.',
      topics: ['Calculus', 'Functions', 'Statistics & Probability', 'Vectors'],
      level: 'IBDP',
      status: 'coming_soon',
      color: 'bg-indigo-500'
    },
    {
      title: 'IBDP Physics',
      description: 'Mechanics, Thermal Physics, Waves, Electromagnetism, and Atomic Physics curriculum coverage.',
      topics: ['Mechanics', 'Waves', 'Fields', 'Nuclear Physics'],
      level: 'IBDP',
      status: 'coming_soon',
      color: 'bg-blue-500'
    },
    {
      title: 'IBDP Chemistry',
      description: 'Atomic Theory, Chemical Bonding, Energetics, Kinetics, Equilibrium, and Organic Chemistry.',
      topics: ['Stoichiometry', 'Bonding', 'Energetics', 'Kinetics'],
      level: 'IBDP',
      status: 'coming_soon',
      color: 'bg-teal-500'
    },
    {
      title: 'IBDP Biology',
      description: 'Cell Biology, Molecular Biology, Genetics, Ecology, Evolution, and Human Physiology.',
      topics: ['Cell Biology', 'Genetics', 'Ecology', 'Physiology'],
      level: 'IBDP',
      status: 'coming_soon',
      color: 'bg-amber-500'
    }
  ];

  return (
    <section className="py-20 bg-slate-50/60 border-t border-border/60">
      <div className="container">
        <div className="text-center mb-12 space-y-3">
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-primary/20 text-primary bg-primary/5">
            Curriculum Scope & Availability
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Explore IB Curriculum Offerings
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            PrepVille is built exclusively for the International Baccalaureate curriculum.
            Middle Years Programme (MYP) Mathematics is fully available for launch, with future subjects arriving in subsequent releases.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, index) => {
            const isAvailable = subject.status === 'available';

            return (
              <Card
                key={index}
                className={`transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  isAvailable
                    ? 'border-2 border-primary/30 hover:border-primary hover:shadow-xl bg-card cursor-pointer'
                    : 'opacity-75 bg-slate-100/80 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 cursor-not-allowed select-none'
                }`}
                onClick={() => {
                  if (isAvailable) {
                    navigate('/mock-exams/select');
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs font-bold"
                      >
                        {subject.level}
                      </Badge>
                      <div className={`w-2.5 h-2.5 rounded-full ${subject.color}`} />
                    </div>

                    {isAvailable ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Available Now
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 border-slate-300 text-[11px] font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Coming Soon
                      </Badge>
                    )}
                  </div>

                  <CardTitle className={`text-xl font-bold ${isAvailable ? 'text-foreground group-hover:text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                    {subject.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {subject.description}
                  </p>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Curriculum Strands
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {subject.topics.map((topic, topicIndex) => (
                        <Badge
                          key={topicIndex}
                          variant="outline"
                          className="text-[11px] bg-background/50 font-normal"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    {isAvailable ? (
                      <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                        Start Mathematics Practice <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                        Under development for 2027 release
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;
