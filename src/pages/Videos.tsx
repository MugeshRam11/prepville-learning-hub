
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';

const Videos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Video Library & Explanations
              </h1>
              <p className="text-xl text-muted-foreground">
                Learn from expert educators with our comprehensive video library covering all subjects and topics.
              </p>
            </div>
          </div>
        </section>

        {/* Video Categories */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {['All Videos', 'MYP Math', 'IBDP Math', 'Sciences'].map((category, index) => (
                <Button 
                  key={index} 
                  variant={index === 0 ? "default" : "outline"} 
                  className="w-full"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Featured Video */}
            <Card className="mb-12 overflow-hidden">
              <div className="aspect-video bg-gray-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button size="lg" className="rounded-full w-16 h-16">
                    ▶
                  </Button>
                </div>
                <Badge className="absolute top-4 left-4">Featured</Badge>
                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  24:15
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Advanced Calculus: Integration by Parts</h3>
                    <p className="text-muted-foreground">Master the technique of integration by parts with step-by-step examples</p>
                  </div>
                  <Badge>IBDP Math HL</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Dr. Sarah Johnson
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    24 minutes
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Updated 2 days ago
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                <Card key={item} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-video bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button variant="outline" size="sm" className="rounded-full">
                        ▶
                      </Button>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {Math.floor(Math.random() * 20 + 5)}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {item % 3 === 0 ? 'MYP Math' : item % 2 === 0 ? 'IBDP Math' : 'Physics'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base line-clamp-2">
                      {item % 3 === 0 ? 'Quadratic Equations Made Simple' : 
                       item % 2 === 0 ? 'Derivatives and Chain Rule' : 
                       'Newton\'s Laws of Motion'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>Prof. {item % 2 === 0 ? 'Alex' : 'Maria'} {item % 3 === 0 ? 'Chen' : 'Rodriguez'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Load More Videos
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Videos;
