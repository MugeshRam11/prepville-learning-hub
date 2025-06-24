
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Calendar, User, Search } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: BookOpen,
      title: 'Interactive Question Bank',
      description: 'Access thousands of carefully curated questions with multiple difficulty levels, instant feedback, and detailed explanations for every answer.',
      benefits: ['10,000+ Questions', 'Multiple Question Types', 'Instant Feedback', 'Detailed Solutions']
    },
    {
      icon: Calendar,
      title: 'Video Explanations',
      description: 'Watch comprehensive video explanations for complex topics, with step-by-step solutions and expert teaching methods.',
      benefits: ['500+ Video Hours', 'Expert Teachers', 'Step-by-Step Solutions', 'HD Quality']
    },
    {
      icon: User,
      title: 'Advanced Analytics',
      description: 'Track your learning progress with detailed analytics, identify weak areas, and get personalized recommendations.',
      benefits: ['Performance Tracking', 'Weak Area Identification', 'Progress Reports', 'Goal Setting']
    },
    {
      icon: Search,
      title: 'Smart Practice System',
      description: 'Adaptive practice sessions that adjust to your learning pace, with spaced repetition and difficulty progression.',
      benefits: ['Adaptive Learning', 'Spaced Repetition', 'Custom Practice', 'Exam Simulation']
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our comprehensive platform provides all the tools and resources needed for academic success
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {feature.description}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
