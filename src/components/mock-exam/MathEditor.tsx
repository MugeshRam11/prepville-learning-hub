
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface MathEditorProps {
  onInsert: (equation: string) => void;
  onCancel: () => void;
}

const MathEditor = ({ onInsert, onCancel }: MathEditorProps) => {
  const [equation, setEquation] = useState('');

  const commonEquations = [
    { label: 'Fraction', value: '\\frac{a}{b}' },
    { label: 'Square Root', value: '\\sqrt{x}' },
    { label: 'Power', value: 'x^{n}' },
    { label: 'Subscript', value: 'x_{n}' },
    { label: 'Sum', value: '\\sum_{i=1}^{n}' },
    { label: 'Integral', value: '\\int_{a}^{b}' },
    { label: 'Limit', value: '\\lim_{x \\to \\infty}' },
    { label: 'Pi', value: '\\pi' },
    { label: 'Alpha', value: '\\alpha' },
    { label: 'Beta', value: '\\beta' },
    { label: 'Theta', value: '\\theta' },
    { label: 'Delta', value: '\\Delta' },
  ];

  const handleInsert = () => {
    if (equation.trim()) {
      onInsert(` $${equation}$ `);
      setEquation('');
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Common equations:</label>
          <div className="grid grid-cols-3 gap-2">
            {commonEquations.map((eq) => (
              <Button
                key={eq.label}
                variant="outline"
                size="sm"
                onClick={() => setEquation(eq.value)}
                className="text-xs"
              >
                {eq.label}
              </Button>
            ))}
          </div>
        </div>

        {equation && (
          <div className="p-3 bg-white rounded border">
            <p className="text-sm text-gray-600 mb-1">Preview:</p>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              ${equation}$
            </code>
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
