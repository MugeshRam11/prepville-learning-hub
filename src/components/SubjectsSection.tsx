
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SubjectsSection = () => {
  const subjects = [
    {
      title: 'MYP Math Standard',
      description: 'Comprehensive coverage of MYP Mathematics Standard Level curriculum',
      topics: ['Algebra', 'Geometry', 'Statistics', 'Probability'],
      questions: 1200,
      videos: 45,
      level: 'MYP',
      color: 'bg-blue-500'
    },
    {
      title: 'MYP Math Extended',
      description: 'Advanced mathematics for MYP Extended Level students',
      topics: ['Calculus', 'Trigonometry', 'Complex Numbers', 'Vectors'],
      questions: 1500,
      videos: 60,
      level: 'MYP',
      color: 'bg-green-500'
    },
    {
      title: 'IBDP Math AA HL',
      description: 'Analysis and Approaches Higher Level for IBDP',
      topics: ['Calculus', 'Statistics', 'Probability', 'Discrete Math'],
      questions: 2000,
      videos: 80,
      level: 'IBDP',
      color: 'bg-purple-500'
    },
    {
      title: 'IBDP Math AI SL',
      description: 'Applications and Interpretation Standard Level',
      topics: ['Statistics', 'Modeling', 'Technology', 'Applications'],
      questions: 1800,
      videos: 65,
      level: 'IBDP',
      color: 'bg-orange-500'
    },
    {
      title: 'IBDP Physics',
      description: 'Complete physics curriculum for IBDP students',
      topics: ['Mechanics', 'Waves', 'Electricity', 'Modern Physics'],
      questions: 1600,
      videos: 70,
      level: 'IBDP',
      color: 'bg-red-500'
    },
    {
      title: 'IBDP Chemistry',
      description: 'Comprehensive chemistry coverage for IBDP',
      topics: ['Atomic Theory', 'Bonding', 'Energetics', 'Kinetics'],
      questions: 1400,
      videos: 55,
      level: 'IBDP',
      color: 'bg-teal-500'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Choose Your Subject
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive curriculum coverage for MYP and IBDP students across multiple subjects
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {subject.level}
                  </Badge>
                  <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                </div>
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                  {subject.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {subject.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {subject.topics.map((topic, topicIndex) => (
                      <Badge key={topicIndex} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{subject.questions} Questions</span>
                    <span>{subject.videos} Videos</span>
                  </div>
                  
                  <Button className="w-full mt-4 group-hover:bg-blue-600 transition-colors">
                    Start Learning
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Subjects
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;
