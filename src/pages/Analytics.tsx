
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const Analytics = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Track Your Progress
              </h1>
              <p className="text-xl text-muted-foreground">
                Detailed analytics and insights to help you understand your learning journey and identify areas for improvement.
              </p>
            </div>
          </div>
        </section>

        {/* Analytics Dashboard */}
        <section className="py-16 bg-white">
          <div className="container">
            {/* Overview Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">1,247</div>
                  <div className="text-sm text-muted-foreground">Questions Solved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">78%</div>
                  <div className="text-sm text-muted-foreground">Average Accuracy</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">24</div>
                  <div className="text-sm text-muted-foreground">Study Hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">12</div>
                  <div className="text-sm text-muted-foreground">Days Streak</div>
                </CardContent>
              </Card>
            </div>

            {/* Subject Progress */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { subject: 'MYP Math Standard', progress: 85, questions: 324 },
                    { subject: 'IBDP Physics', progress: 62, questions: 189 },
                    { subject: 'IBDP Chemistry', progress: 71, questions: 245 },
                    { subject: 'MYP Math Extended', progress: 45, questions: 156 }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.subject}</span>
                        <span className="text-sm text-muted-foreground">{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {item.questions} questions completed
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { topic: 'Quadratic Equations', score: 92, badge: 'Excellent' },
                      { topic: 'Wave Properties', score: 78, badge: 'Good' },
                      { topic: 'Chemical Bonding', score: 65, badge: 'Needs Work' },
                      { topic: 'Trigonometry', score: 88, badge: 'Very Good' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{item.topic}</div>
                          <div className="text-sm text-muted-foreground">Latest attempt</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{item.score}%</div>
                          <Badge variant={item.score >= 85 ? 'default' : item.score >= 70 ? 'secondary' : 'destructive'}>
                            {item.badge}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weak Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { topic: 'Integration by Parts', accuracy: 45, recommendation: 'Watch video tutorial' },
                    { topic: 'Electric Circuits', accuracy: 52, recommendation: 'Practice more problems' },
                    { topic: 'Organic Chemistry', accuracy: 38, recommendation: 'Review fundamentals' }
                  ].map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">{item.topic}</h4>
                      <div className="text-sm text-muted-foreground mb-3">
                        Current accuracy: {item.accuracy}%
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.recommendation}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Analytics;
