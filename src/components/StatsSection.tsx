
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const StatsSection = () => {
  const stats = [
    {
      number: '10,000+',
      label: 'Practice Questions',
      description: 'Carefully curated questions across all subjects and difficulty levels'
    },
    {
      number: '500+',
      label: 'Video Hours',
      description: 'Comprehensive video explanations by expert educators'
    },
    {
      number: '2,500+',
      label: 'Active Students',
      description: 'Students actively learning and improving their grades'
    },
    {
      number: '95%',
      label: 'Success Rate',
      description: 'Students report improved grades within 3 months'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Trusted by Students Worldwide
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join thousands of students who have improved their academic performance with ThePrepVille
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur border-white/20 text-center hover:bg-white/20 transition-colors">
              <CardContent className="p-6">
                <div className="text-3xl lg:text-4xl font-bold mb-2 text-white">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold mb-2 text-blue-100">
                  {stat.label}
                </div>
                <p className="text-sm text-blue-200">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
