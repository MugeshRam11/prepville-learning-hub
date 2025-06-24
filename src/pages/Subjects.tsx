
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, User } from 'lucide-react';

const Subjects = () => {
  const subjectCategories = [
    {
      category: 'MYP Mathematics',
      subjects: [
        {
          title: 'MYP Math Standard',
          description: 'Foundation mathematics for MYP students',
          questions: 1200,
          videos: 45,
          topics: ['Number', 'Algebra', 'Geometry', 'Statistics']
        },
        {
          title: 'MYP Math Extended',
          description: 'Advanced mathematics for high achievers',
          questions: 1500,
          videos: 60,
          topics: ['Advanced Algebra', 'Trigonometry', 'Calculus Intro', 'Complex Numbers']
        }
      ]
    },
    {
      category: 'IBDP Mathematics',
      subjects: [
        {
          title: 'Math Analysis & Approaches HL',
          description: 'Advanced mathematical analysis',
          questions: 2000,
          videos: 80,
          topics: ['Calculus', 'Algebra', 'Functions', 'Statistics']
        },
        {
          title: 'Math Applications & Interpretation SL',
          description: 'Real-world mathematical applications',
          questions: 1800,
          videos: 65,
          topics: ['Statistics', 'Probability', 'Modeling', 'Technology']
        }
      ]
    },
    {
      category: 'IBDP Sciences',
      subjects: [
        {
          title: 'Physics HL/SL',
          description: 'Comprehensive physics curriculum',
          questions: 1600,
          videos: 70,
          topics: ['Mechanics', 'Thermal Physics', 'Waves', 'Electricity']
        },
        {
          title: 'Chemistry HL/SL',
          description: 'Complete chemistry coverage',
          questions: 1400,
          videos: 55,
          topics: ['Atomic Structure', 'Bonding', 'Energetics', 'Kinetics']
        }
      ]
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

        {/* Subjects Grid */}
        <section className="py-16 bg-white">
          <div className="container">
            {subjectCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-16">
                <h2 className="text-2xl font-bold mb-8 text-center">{category.category}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {category.subjects.map((subject, subjectIndex) => (
                    <Card key={subjectIndex} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl">{subject.title}</CardTitle>
                        <p className="text-muted-foreground">{subject.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {subject.topics.map((topic, topicIndex) => (
                              <Badge key={topicIndex} variant="outline">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <BookOpen className="w-4 h-4 mr-1" />
                              {subject.questions} Questions
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {subject.videos} Videos
                            </div>
                          </div>
                          
                          <Button className="w-full">
                            Start Learning
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Subjects;
