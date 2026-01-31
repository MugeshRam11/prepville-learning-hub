import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar } from 'lucide-react';
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
                Practice & Learn
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose your learning path: explore subjects at your own pace or test yourself with timed mock exams.
              </p>
            </div>
          </div>
        </section>

        {/* Practice Options - Only 2 clear paths */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Study & Learn Card */}
              <Card className="text-center hover:shadow-lg transition-shadow border-2 hover:border-green-200">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl">Study & Learn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Explore subjects, practice questions with explanations and hints. Learn at your own pace with no time pressure.
                  </p>
                  <ul className="text-sm text-left text-muted-foreground space-y-2 px-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Step-by-step solutions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Hints and explanations
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      No timer or pressure
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    size="lg"
                    onClick={() => navigate('/subjects')}
                  >
                    Browse Subjects
                  </Button>
                </CardContent>
              </Card>

              {/* Mock Exams Card */}
              <Card className="text-center hover:shadow-lg transition-shadow border-2 hover:border-purple-200">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-2xl">Mock Exams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Timed exam simulations under real conditions. Evaluate your knowledge and get ready for the actual exam.
                  </p>
                  <ul className="text-sm text-left text-muted-foreground space-y-2 px-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Timed assessment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Real exam conditions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Score and feedback after submission
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    size="lg"
                    onClick={() => navigate('/mock-exams/select')}
                  >
                    Take Mock Exam
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Practice;
