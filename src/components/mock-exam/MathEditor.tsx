
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Undo2, Trash2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEditorProps {
  onInsert: (equation: string) => void;
  onCancel: () => void;
}

const MathEditor = ({ onInsert, onCancel }: MathEditorProps) => {
  const [equationParts, setEquationParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('basic');

  // Visual equation building components
  const equationComponents = {
    basic: [
      { label: 'Fraction', latex: '\\frac{[]}{\[\]}', slots: 2 },
      { label: 'Power', latex: '[]^{[]}', slots: 2 },
      { label: 'Subscript', latex: '[]_{[]}', slots: 2 },
      { label: 'Square Root', latex: '\\sqrt{[]}', slots: 1 },
      { label: 'Nth Root', latex: '\\sqrt\[[]\]{[]}', slots: 2 },
      { label: 'Parentheses', latex: '\\left([]\\right)', slots: 1 },
      { label: 'Brackets', latex: '\\left\[[]\\right\]', slots: 1 },
      { label: 'Absolute Value', latex: '\\left|[]\\right|', slots: 1 },
    ],
    calculus: [
      { label: 'Integral', latex: '\\int []\\,dx', slots: 1 },
      { label: 'Definite Integral', latex: '\\int_{[]}^{[]} []\\,dx', slots: 3 },
      { label: 'Double Integral', latex: '\\iint []\\,dx\\,dy', slots: 1 },
      { label: 'Triple Integral', latex: '\\iiint []\\,dx\\,dy\\,dz', slots: 1 },
      { label: 'Derivative', latex: '\\frac{d}{d[]}[]', slots: 2 },
      { label: 'Partial Derivative', latex: '\\frac{\\partial}{\\partial []}[]', slots: 2 },
      { label: 'Limit', latex: '\\lim_{[] \\to []} []', slots: 3 },
      { label: 'Sum', latex: '\\sum_{[]}^{[]} []', slots: 3 },
      { label: 'Product', latex: '\\prod_{[]}^{[]} []', slots: 3 },
    ],
    trigonometry: [
      { label: 'sin', latex: '\\sin([])' },
      { label: 'cos', latex: '\\cos([])' },
      { label: 'tan', latex: '\\tan([])' },
      { label: 'arcsin', latex: '\\arcsin([])' },
      { label: 'arccos', latex: '\\arccos([])' },
      { label: 'arctan', latex: '\\arctan([])' },
      { label: 'sec', latex: '\\sec([])' },
      { label: 'csc', latex: '\\csc([])' },
      { label: 'cot', latex: '\\cot([])' },
    ],
    logarithms: [
      { label: 'ln', latex: '\\ln([])' },
      { label: 'log', latex: '\\log([])' },
      { label: 'log base', latex: '\\log_{[]}([])' },
      { label: 'e^x', latex: 'e^{[]}' },
      { label: 'Power', latex: '[]^{[]}' },
    ],
    symbols: [
      { label: '+', latex: '+' },
      { label: '-', latex: '-' },
      { label: '×', latex: '\\times' },
      { label: '÷', latex: '\\div' },
      { label: '=', latex: '=' },
      { label: '≠', latex: '\\neq' },
      { label: '≤', latex: '\\leq' },
      { label: '≥', latex: '\\geq' },
      { label: '±', latex: '\\pm' },
      { label: '∞', latex: '\\infty' },
      { label: '∝', latex: '\\propto' },
      { label: '≈', latex: '\\approx' },
    ],
    greekLetters: [
      { label: 'α', latex: '\\alpha' },
      { label: 'β', latex: '\\beta' },
      { label: 'γ', latex: '\\gamma' },
      { label: 'δ', latex: '\\delta' },
      { label: 'ε', latex: '\\epsilon' },
      { label: 'θ', latex: '\\theta' },
      { label: 'λ', latex: '\\lambda' },
      { label: 'μ', latex: '\\mu' },
      { label: 'π', latex: '\\pi' },
      { label: 'σ', latex: '\\sigma' },
      { label: 'φ', latex: '\\phi' },
      { label: 'ω', latex: '\\omega' },
    ],
    variables: [
      { label: 'x', latex: 'x' },
      { label: 'y', latex: 'y' },
      { label: 'z', latex: 'z' },
      { label: 'a', latex: 'a' },
      { label: 'b', latex: 'b' },
      { label: 'c', latex: 'c' },
      { label: 'n', latex: 'n' },
      { label: 't', latex: 't' },
      { label: 'dx', latex: 'dx' },
      { label: 'dy', latex: 'dy' },
    ],
    numbers: [
      { label: '1', latex: '1' },
      { label: '2', latex: '2' },
      { label: '3', latex: '3' },
      { label: '4', latex: '4' },
      { label: '5', latex: '5' },
      { label: '6', latex: '6' },
      { label: '7', latex: '7' },
      { label: '8', latex: '8' },
      { label: '9', latex: '9' },
      { label: '0', latex: '0' },
    ]
  };

  // Add component to equation
  const addComponent = (component: any) => {
    setEquationParts([...equationParts, component.latex]);
  };

  // Remove last component
  const undoLast = () => {
    setEquationParts(equationParts.slice(0, -1));
  };

  // Clear all
  const clearAll = () => {
    setEquationParts([]);
  };

  // Build final equation from parts
  const buildEquation = () => {
    return equationParts.join(' ');
  };

  const handleInsert = () => {
    const finalEquation = buildEquation();
    if (finalEquation.trim()) {
      onInsert(` $${finalEquation}$ `);
      setEquationParts([]);
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
    <Card className="border-2 border-primary/20 bg-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Visual Equation Builder</CardTitle>
        <p className="text-sm text-muted-foreground">Click buttons to build your equation visually</p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Equation Display */}
        <div className="p-4 bg-muted rounded-lg border-2 border-dashed min-h-20">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium">Building Equation:</p>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undoLast}
                disabled={equationParts.length === 0}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                disabled={equationParts.length === 0}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {equationParts.length > 0 ? (
            <div 
              className="text-xl p-2 bg-background rounded border min-h-8 flex items-center"
              dangerouslySetInnerHTML={{ __html: renderPreview(buildEquation()) }}
            />
          ) : (
            <div className="text-muted-foreground text-center py-4">
              Click components below to build your equation
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {Object.keys(equationComponents).map((category) => (
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

          {/* Component Buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-2 border rounded">
            {equationComponents[selectedCategory as keyof typeof equationComponents].map((component, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => addComponent(component)}
                className="text-xs h-auto p-2 whitespace-normal hover:bg-primary/10"
                title={`Add ${component.label}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium">{component.label}</span>
                  <div 
                    className="text-[10px] opacity-70"
                    dangerouslySetInnerHTML={{ 
                      __html: renderPreview(component.latex.replace(/\[\]/g, 'x')) 
                    }}
                  />
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onCancel} size="sm">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button 
            onClick={handleInsert} 
            disabled={equationParts.length === 0}
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
