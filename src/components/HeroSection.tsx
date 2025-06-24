
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Calendar, User } from 'lucide-react';

const HeroSection = () => {
  const stats = [
    { icon: BookOpen, label: 'Questions', value: '10,000+' },
    { icon: Calendar, label: 'Video Hours', value: '500+' },
    { icon: User, label: 'Students', value: '2,500+' },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              🎓 Trusted by thousands of students
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Master{' '}
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                MYP & IBDP
              </span>{' '}
              with Confidence
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Comprehensive question banks, interactive quizzes, and detailed video explanations 
              designed specifically for MYP Math, IBDP subjects, and more. Track your progress 
              with advanced analytics.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
                Start Learning Free
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Question Bank</h3>
                  <p className="text-sm text-muted-foreground">
                    10,000+ curated questions across all subjects
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow mt-8">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Video Library</h3>
                  <p className="text-sm text-muted-foreground">
                    500+ hours of detailed explanations
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow -mt-4">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track progress and identify weak areas
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Practice Tests</h3>
                  <p className="text-sm text-muted-foreground">
                    Exam-style practice with real-time scoring
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
