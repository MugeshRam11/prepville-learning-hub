import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { TrendingUp, LineChart, BarChart3, PieChart } from 'lucide-react';

const GraphingTool = () => {
  const [equation, setEquation] = useState('y = x^2');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Interactive Graphing Tool
            </h1>
            <p className="text-gray-600">Visualize mathematical functions and equations</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Equation Input */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Equation Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="equation">Enter Equation</Label>
                  <Input
                    id="equation"
                    value={equation}
                    onChange={(e) => setEquation(e.target.value)}
                    placeholder="y = x^2"
                    className="mt-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Quick Functions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEquation('y = x^2')}>
                      y = x²
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEquation('y = sin(x)')}>
                      y = sin(x)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEquation('y = cos(x)')}>
                      y = cos(x)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEquation('y = x^3')}>
                      y = x³
                    </Button>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-indigo-500 to-blue-500">
                  Plot Graph
                </Button>
              </CardContent>
            </Card>

            {/* Graph Display */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Graph Display</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Graph will appear here</p>
                    <p className="text-sm text-gray-400 mt-1">Enter an equation and click "Plot Graph"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graph Types */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Graph Types</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="line">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="line">Line Graph</TabsTrigger>
                  <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  <TabsTrigger value="pie">Pie Chart</TabsTrigger>
                </TabsList>
                <TabsContent value="line" className="space-y-4">
                  <p className="text-sm text-gray-600">Plot continuous functions and equations</p>
                </TabsContent>
                <TabsContent value="bar" className="space-y-4">
                  <p className="text-sm text-gray-600">Compare discrete data values</p>
                </TabsContent>
                <TabsContent value="pie" className="space-y-4">
                  <p className="text-sm text-gray-600">Show proportions and percentages</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Example Graphs */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center">
                  <LineChart className="w-12 h-12 mx-auto mb-3 text-indigo-500" />
                  <h3 className="font-semibold mb-2">Linear Functions</h3>
                  <p className="text-sm text-gray-600">y = mx + b</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                  <h3 className="font-semibold mb-2">Quadratic Functions</h3>
                  <p className="text-sm text-gray-600">y = ax² + bx + c</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-3 text-purple-500" />
                  <h3 className="font-semibold mb-2">Trigonometric</h3>
                  <p className="text-sm text-gray-600">sin, cos, tan</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

    </div>
  );
};

export default GraphingTool;
