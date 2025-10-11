import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Calculator, BookOpen, Search, Star } from 'lucide-react';

const FormulaHelper = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const formulaCategories = [
    {
      category: 'Algebra',
      formulas: [
        { name: 'Quadratic Formula', formula: 'x = (-b ± √(b²-4ac)) / 2a', description: 'Solves ax² + bx + c = 0' },
        { name: 'Difference of Squares', formula: 'a² - b² = (a+b)(a-b)', description: 'Factoring pattern' },
        { name: 'Perfect Square', formula: '(a±b)² = a² ± 2ab + b²', description: 'Expansion formula' },
      ]
    },
    {
      category: 'Geometry',
      formulas: [
        { name: 'Circle Area', formula: 'A = πr²', description: 'Area of a circle' },
        { name: 'Triangle Area', formula: 'A = ½bh', description: 'Area of a triangle' },
        { name: 'Pythagorean Theorem', formula: 'a² + b² = c²', description: 'Right triangle relationship' },
      ]
    },
    {
      category: 'Trigonometry',
      formulas: [
        { name: 'Sine Rule', formula: 'a/sin(A) = b/sin(B) = c/sin(C)', description: 'Triangle sides and angles' },
        { name: 'Cosine Rule', formula: 'c² = a² + b² - 2ab·cos(C)', description: 'Triangle calculation' },
        { name: 'Pythagorean Identity', formula: 'sin²θ + cos²θ = 1', description: 'Fundamental identity' },
      ]
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Formula Helper
            </h1>
            <p className="text-gray-600">Quick reference for mathematical formulas and solvers</p>
          </div>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for formulas..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Formula Categories */}
          <Tabs defaultValue="Algebra" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Algebra">Algebra</TabsTrigger>
              <TabsTrigger value="Geometry">Geometry</TabsTrigger>
              <TabsTrigger value="Trigonometry">Trigonometry</TabsTrigger>
            </TabsList>

            {formulaCategories.map((category) => (
              <TabsContent key={category.category} value={category.category}>
                <div className="grid gap-4">
                  {category.formulas.map((formula, index) => (
                    <Card key={index} className="hover:shadow-lg transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{formula.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{formula.description}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Star className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                          <code className="text-lg font-mono text-purple-900">{formula.formula}</code>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">
                            Use Calculator
                          </Button>
                          <Button size="sm" variant="outline">
                            View Examples
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Quick Calculator */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quick Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Variable a:</label>
                  <Input type="number" placeholder="Enter value" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Variable b:</label>
                  <Input type="number" placeholder="Enter value" />
                </div>
              </div>
              <Button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500">
                Calculate
              </Button>
            </CardContent>
          </Card>

          {/* Popular Formulas */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Most Used Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="px-3 py-2">Quadratic Formula</Badge>
                <Badge variant="secondary" className="px-3 py-2">Pythagorean Theorem</Badge>
                <Badge variant="secondary" className="px-3 py-2">Circle Area</Badge>
                <Badge variant="secondary" className="px-3 py-2">Distance Formula</Badge>
                <Badge variant="secondary" className="px-3 py-2">Slope Formula</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FormulaHelper;
