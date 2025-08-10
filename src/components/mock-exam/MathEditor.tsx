
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEditorProps {
  onInsert: (equation: string) => void;
  onCancel: () => void;
}

const MathEditor = ({ onInsert, onCancel }: MathEditorProps) => {
  const [equation, setEquation] = useState('');

  const equationCategories = {
    basic: [
      { label: 'Fraction', value: '\\frac{a}{b}' },
      { label: 'Power', value: 'x^{n}' },
      { label: 'Subscript', value: 'x_{n}' },
      { label: 'Square Root', value: '\\sqrt{x}' },
      { label: 'Nth Root', value: '\\sqrt[n]{x}' },
    ],
    algebra: [
      { label: 'Quadratic', value: 'ax^2 + bx + c = 0' },
      { label: 'Factored Form', value: '(x + a)(x + b)' },
      { label: 'Absolute Value', value: '|x|' },
      { label: 'Inequality', value: 'x \\leq y' },
      { label: 'System of Equations', value: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}' },
    ],
    calculus: [
      { label: 'Derivative', value: "\\frac{d}{dx}f(x)" },
      { label: 'Partial Derivative', value: '\\frac{\\partial f}{\\partial x}' },
      { label: 'Integral', value: '\\int f(x) \\, dx' },
      { label: 'Definite Integral', value: '\\int_{a}^{b} f(x) \\, dx' },
      { label: 'Double Integral', value: '\\int\\int f(x,y) \\, dx \\, dy' },
      { label: 'Limit', value: '\\lim_{x \\to a} f(x)' },
      { label: 'Infinity Limit', value: '\\lim_{x \\to \\infty} f(x)' },
      { label: 'Series Sum', value: '\\sum_{n=1}^{\\infty} a_n' },
      { label: 'Product', value: '\\prod_{i=1}^{n} a_i' },
    ],
    trigonometry: [
      { label: 'Sin', value: '\\sin(x)' },
      { label: 'Cos', value: '\\cos(x)' },
      { label: 'Tan', value: '\\tan(x)' },
      { label: 'Inverse Sin', value: '\\arcsin(x)' },
      { label: 'Inverse Cos', value: '\\arccos(x)' },
      { label: 'Inverse Tan', value: '\\arctan(x)' },
      { label: 'Sec', value: '\\sec(x)' },
      { label: 'Csc', value: '\\csc(x)' },
      { label: 'Cot', value: '\\cot(x)' },
    ],
    logarithms: [
      { label: 'Natural Log', value: '\\ln(x)' },
      { label: 'Log Base 10', value: '\\log(x)' },
      { label: 'Log Base b', value: '\\log_b(x)' },
      { label: 'Exponential', value: 'e^x' },
      { label: 'Power Function', value: 'a^x' },
    ],
    statistics: [
      { label: 'Mean', value: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i' },
      { label: 'Standard Deviation', value: '\\sigma = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i - \\mu)^2}' },
      { label: 'Variance', value: '\\sigma^2' },
      { label: 'Probability', value: 'P(A \\cap B)' },
      { label: 'Conditional Prob', value: 'P(A|B)' },
      { label: 'Combination', value: '\\binom{n}{k}' },
      { label: 'Permutation', value: 'P(n,k)' },
    ],
    matrices: [
      { label: '2x2 Matrix', value: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: '3x3 Matrix', value: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
      { label: 'Determinant', value: '\\det(A)' },
      { label: 'Transpose', value: 'A^T' },
      { label: 'Inverse', value: 'A^{-1}' },
      { label: 'Vector', value: '\\vec{v}' },
      { label: 'Vector Notation', value: '\\langle x, y, z \\rangle' },
    ],
    geometry: [
      { label: 'Distance Formula', value: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}' },
      { label: 'Circle Equation', value: '(x-h)^2 + (y-k)^2 = r^2' },
      { label: 'Slope', value: 'm = \\frac{y_2-y_1}{x_2-x_1}' },
      { label: 'Area of Circle', value: 'A = \\pi r^2' },
      { label: 'Volume of Sphere', value: 'V = \\frac{4}{3}\\pi r^3' },
    ],
    greekLetters: [
      { label: 'Alpha', value: '\\alpha' },
      { label: 'Beta', value: '\\beta' },
      { label: 'Gamma', value: '\\gamma' },
      { label: 'Delta', value: '\\delta' },
      { label: 'Epsilon', value: '\\epsilon' },
      { label: 'Theta', value: '\\theta' },
      { label: 'Lambda', value: '\\lambda' },
      { label: 'Mu', value: '\\mu' },
      { label: 'Pi', value: '\\pi' },
      { label: 'Sigma', value: '\\sigma' },
      { label: 'Phi', value: '\\phi' },
      { label: 'Omega', value: '\\omega' },
    ],
    symbols: [
      { label: 'Infinity', value: '\\infty' },
      { label: 'Plus/Minus', value: '\\pm' },
      { label: 'Multiplication', value: '\\times' },
      { label: 'Division', value: '\\div' },
      { label: 'Not Equal', value: '\\neq' },
      { label: 'Less/Equal', value: '\\leq' },
      { label: 'Greater/Equal', value: '\\geq' },
      { label: 'Approximately', value: '\\approx' },
      { label: 'Proportional', value: '\\propto' },
      { label: 'Therefore', value: '\\therefore' },
      { label: 'Because', value: '\\because' },
      { label: 'Subset', value: '\\subset' },
      { label: 'Union', value: '\\cup' },
      { label: 'Intersection', value: '\\cap' },
      { label: 'Empty Set', value: '\\emptyset' },
    ]
  };

  const [selectedCategory, setSelectedCategory] = useState('basic');

  const handleInsert = () => {
    if (equation.trim()) {
      onInsert(` $${equation}$ `);
      setEquation('');
    }
  };

  const renderPreview = (equation: string) => {
    try {
      return katex.renderToString(equation, {
        displayMode: false,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false
      });
    } catch (error) {
      return `Error: ${error}`;
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Math Equation Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Enter LaTeX equation:</label>
          <Input
            value={equation}
            onChange={(e) => setEquation(e.target.value)}
            placeholder="e.g., x^2 + y^2 = r^2"
            className="font-mono"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Equation Categories:</label>
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1">
            {Object.keys(equationCategories).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs capitalize"
              >
                {category.replace(/([A-Z])/g, ' $1').trim()}
              </Button>
            ))}
          </div>

          {/* Equation Templates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {equationCategories[selectedCategory as keyof typeof equationCategories].map((eq) => (
              <Button
                key={eq.label}
                variant="outline"
                size="sm"
                onClick={() => setEquation(eq.value)}
                className="text-xs h-auto p-2 whitespace-normal"
                title={eq.value}
              >
                {eq.label}
              </Button>
            ))}
          </div>
        </div>

        {equation && (
          <div className="p-3 bg-white rounded border">
            <p className="text-sm text-gray-600 mb-1">Preview:</p>
            <div 
              className="text-lg p-2 bg-gray-50 rounded border min-h-8 flex items-center"
              dangerouslySetInnerHTML={{ __html: renderPreview(equation) }}
            />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} size="sm">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button 
            onClick={handleInsert} 
            disabled={!equation.trim()}
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Insert Equation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MathEditor;
