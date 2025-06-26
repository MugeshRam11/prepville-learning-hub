
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SubjectFilter from '@/components/SubjectFilter';

const Subjects = () => {
  const subjects = [
    {
      title: 'MYP Math Standard',
      description: 'Foundation mathematics for MYP students',
      questions: 1200,
      videos: 45,
      topics: ['Number', 'Algebra', 'Geometry', 'Statistics'],
      level: 'MYP',
      color: 'bg-blue-500',
      category: 'Mathematics'
    },
    {
      title: 'MYP Math Extended',
      description: 'Advanced mathematics for high achievers',
      questions: 1500,
      videos: 60,
      topics: ['Advanced Algebra', 'Trigonometry', 'Calculus Intro', 'Complex Numbers'],
      level: 'MYP',
      color: 'bg-green-500',
      category: 'Mathematics'
    },
    {
      title: 'Math Analysis & Approaches HL',
      description: 'Advanced mathematical analysis',
      questions: 2000,
      videos: 80,
      topics: ['Calculus', 'Algebra', 'Functions', 'Statistics'],
      level: 'IBDP',
      color: 'bg-purple-500',
      category: 'Mathematics'
    },
    {
      title: 'Math Applications & Interpretation SL',
      description: 'Real-world mathematical applications',
      questions: 1800,
      videos: 65,
      topics: ['Statistics', 'Probability', 'Modeling', 'Technology'],
      level: 'IBDP',
      color: 'bg-orange-500',
      category: 'Mathematics'
    },
    {
      title: 'Physics HL/SL',
      description: 'Comprehensive physics curriculum',
      questions: 1600,
      videos: 70,
      topics: ['Mechanics', 'Thermal Physics', 'Waves', 'Electricity'],
      level: 'IBDP',
      color: 'bg-red-500',
      category: 'Science'
    },
    {
      title: 'Chemistry HL/SL',
      description: 'Complete chemistry coverage',
      questions: 1400,
      videos: 55,
      topics: ['Atomic Structure', 'Bonding', 'Energetics', 'Kinetics'],
      level: 'IBDP',
      color: 'bg-teal-500',
      category: 'Science'
    },
    {
      title: 'Biology HL/SL',
      description: 'Comprehensive biology curriculum',
      questions: 1300,
      videos: 50,
      topics: ['Cell Biology', 'Molecular Biology', 'Genetics', 'Ecology'],
      level: 'IBDP',
      color: 'bg-emerald-500',
      category: 'Science'
    },
    {
      title: 'MYP Sciences',
      description: 'Integrated science for MYP students',
      questions: 1000,
      videos: 40,
      topics: ['Physics', 'Chemistry', 'Biology', 'Environmental Science'],
      level: 'MYP',
      color: 'bg-cyan-500',
      category: 'Science'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                All Subjects at Your Fingertips
              </h1>
              <p className="text-xl text-muted-foreground">
                Comprehensive curriculum coverage for MYP and IBDP students. 
                Choose your subject and start mastering it today.
              </p>
            </div>
          </div>
        </section>

        {/* Subjects with Filters */}
        <section className="py-16 bg-white">
          <div className="container">
            <SubjectFilter subjects={subjects} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Subjects;
