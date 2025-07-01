
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Practice = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Practice & Test Yourself
              </h1>
              <p className="text-xl text-muted-foreground">
                Interactive quizzes and practice tests designed to improve your understanding and exam performance.
              </p>
            </div>
          </div>
        </section>

        {/* Practice Options */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle>Quick Practice</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    5-10 question mini-quizzes for quick topic review
                  </p>
                  <Button className="w-full" onClick={() => navigate('/quick-practice')}>
                    Start Quick Quiz
                  </Button>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <CardTitle>Topic Practice</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Focused practice on specific topics and concepts
                  </p>
                  <Button className="w-full">Choose Topic</Button>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <CardTitle>Mock Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Full-length exam simulations with time limits
                  </p>
                  <Button className="w-full">Take Mock Exam</Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Practice Sessions */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Continue Your Practice</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Card key={item} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary">MYP Math</Badge>
                        <span className="text-sm text-muted-foreground">75% Complete</span>
                      </div>
                      <CardTitle className="text-lg">Algebra Fundamentals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>15/20 Questions</span>
                          <span>12 min left</span>
                        </div>
                        <Button className="w-full" variant="outline">
                          Continue Practice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Practice;
