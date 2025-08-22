
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Excel in Your Studies?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students who have transformed their academic performance. 
              Try all Premium features free for 14 days with autopay setup.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
                Start 14-Day Free Trial
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8">
                Schedule Demo
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold mb-1">14 Days</div>
                <div className="text-blue-100">Free Trial</div>
              </div>
              <div>
                <div className="text-2xl font-bold mb-1">Autopay</div>
                <div className="text-blue-100">Setup</div>
              </div>
              <div>
                <div className="text-2xl font-bold mb-1">Cancel</div>
                <div className="text-blue-100">Anytime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;
