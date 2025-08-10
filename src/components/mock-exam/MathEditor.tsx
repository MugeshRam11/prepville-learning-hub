
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Undo2, Trash2, Edit3 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEditorProps {
  onInsert: (equation: string) => void;
  onCancel: () => void;
}

interface EquationSlot {
  id: string;
  content: string;
  placeholder: string;
}

interface EquationComponent {
  id: string;
  latex: string;
  slots: EquationSlot[];
}

const MathEditor = ({ onInsert, onCancel }: MathEditorProps) => {
  const [equationComponents, setEquationComponents] = useState<EquationComponent[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('basic');
  const [editingText, setEditingText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Available equation templates
  const componentTemplates = {
    basic: [
      { 
        label: 'Fraction', 
        latex: '\\frac{[numerator]}{[denominator]}',
        slots: [
          { placeholder: 'numerator', content: '' },
          { placeholder: 'denominator', content: '' }
        ]
      },
      { 
        label: 'Power', 
        latex: '[base]^{[exponent]}',
        slots: [
          { placeholder: 'base', content: '' },
          { placeholder: 'exponent', content: '' }
        ]
      },
      { 
        label: 'Square Root', 
        latex: '\\sqrt{[content]}',
        slots: [
          { placeholder: 'content', content: '' }
        ]
      },
      { 
        label: 'Nth Root', 
        latex: '\\sqrt[[index]]{[content]}',
        slots: [
          { placeholder: 'index', content: '' },
          { placeholder: 'content', content: '' }
        ]
      },
      { 
        label: 'Subscript', 
        latex: '[base]_{[subscript]}',
        slots: [
          { placeholder: 'base', content: '' },
          { placeholder: 'subscript', content: '' }
        ]
      },
    ],
    calculus: [
      { 
        label: 'Integral', 
        latex: '\\int [function] \\,d[variable]',
        slots: [
          { placeholder: 'function', content: '' },
          { placeholder: 'variable', content: 'x' }
        ]
      },
      { 
        label: 'Definite Integral', 
        latex: '\\int_{[lower]}^{[upper]} [function] \\,d[variable]',
        slots: [
          { placeholder: 'lower', content: '' },
          { placeholder: 'upper', content: '' },
          { placeholder: 'function', content: '' },
          { placeholder: 'variable', content: 'x' }
        ]
      },
      { 
        label: 'Derivative', 
        latex: '\\frac{d[function]}{d[variable]}',
        slots: [
          { placeholder: 'function', content: '' },
          { placeholder: 'variable', content: 'x' }
        ]
      },
      { 
        label: 'Limit', 
        latex: '\\lim_{[variable] \\to [value]} [function]',
        slots: [
          { placeholder: 'variable', content: 'x' },
          { placeholder: 'value', content: '' },
          { placeholder: 'function', content: '' }
        ]
      },
      { 
        label: 'Sum', 
        latex: '\\sum_{[variable]=[start]}^{[end]} [expression]',
        slots: [
          { placeholder: 'variable', content: 'i' },
          { placeholder: 'start', content: '1' },
          { placeholder: 'end', content: 'n' },
          { placeholder: 'expression', content: '' }
        ]
      },
    ],
    symbols: [
      { label: '+', latex: '+', slots: [] },
      { label: '-', latex: '-', slots: [] },
      { label: '×', latex: '\\times', slots: [] },
      { label: '÷', latex: '\\div', slots: [] },
      { label: '=', latex: '=', slots: [] },
      { label: '≠', latex: '\\neq', slots: [] },
      { label: '≤', latex: '\\leq', slots: [] },
      { label: '≥', latex: '\\geq', slots: [] },
      { label: '(', latex: '(', slots: [] },
      { label: ')', latex: ')', slots: [] },
    ],
    variables: [
      { label: 'x', latex: 'x', slots: [] },
      { label: 'y', latex: 'y', slots: [] },
      { label: 'z', latex: 'z', slots: [] },
      { label: 'a', latex: 'a', slots: [] },
      { label: 'b', latex: 'b', slots: [] },
      { label: 'n', latex: 'n', slots: [] },
      { label: 't', latex: 't', slots: [] },
    ],
    numbers: [
      { label: '0', latex: '0', slots: [] },
      { label: '1', latex: '1', slots: [] },
      { label: '2', latex: '2', slots: [] },
      { label: '3', latex: '3', slots: [] },
      { label: '4', latex: '4', slots: [] },
      { label: '5', latex: '5', slots: [] },
      { label: '6', latex: '6', slots: [] },
      { label: '7', latex: '7', slots: [] },
      { label: '8', latex: '8', slots: [] },
      { label: '9', latex: '9', slots: [] },
    ]
  };

  // Add component to equation
  const addComponent = (template: any) => {
    const newComponent: EquationComponent = {
      id: `comp_${Date.now()}`,
      latex: template.latex,
      slots: template.slots.map((slot: any, index: number) => ({
        id: `slot_${Date.now()}_${index}`,
        content: slot.content || '',
        placeholder: slot.placeholder
      }))
    };
    setEquationComponents([...equationComponents, newComponent]);
  };

  // Update slot content
  const updateSlot = (slotId: string, content: string) => {
    setEquationComponents(prev => 
      prev.map(comp => ({
        ...comp,
        slots: comp.slots.map(slot => 
          slot.id === slotId ? { ...slot, content } : slot
        )
      }))
    );
  };

  // Remove last component
  const undoLast = () => {
    setEquationComponents(equationComponents.slice(0, -1));
  };

  // Clear all
  const clearAll = () => {
    setEquationComponents([]);
    setSelectedSlot(null);
  };

  // Build final equation from components
  const buildEquation = () => {
    return equationComponents.map(comp => {
      let latex = comp.latex;
      comp.slots.forEach(slot => {
        const content = slot.content || slot.placeholder;
        latex = latex.replace(`[${slot.placeholder}]`, content);
      });
      return latex;
    }).join(' ');
  };

  // Handle slot click
  const handleSlotClick = (slotId: string, currentContent: string) => {
    setSelectedSlot(slotId);
    setEditingText(currentContent);
    setShowTextInput(true);
  };

  // Update selected slot
  const updateSelectedSlot = () => {
    if (selectedSlot) {
      updateSlot(selectedSlot, editingText);
      setSelectedSlot(null);
      setShowTextInput(false);
      setEditingText('');
    }
  };

  const handleInsert = () => {
    const finalEquation = buildEquation();
    if (finalEquation.trim()) {
      onInsert(` $${finalEquation}$ `);
      clearAll();
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

  // Render interactive equation with clickable slots
  const renderInteractiveEquation = () => {
    return equationComponents.map((comp, compIndex) => (
      <span key={comp.id} className="inline-block mx-1">
        {comp.slots.length > 0 ? (
          <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded border">
            {comp.slots.map((slot, slotIndex) => {
              let displayLatex = comp.latex;
              comp.slots.forEach((s, i) => {
                if (i < slotIndex) {
                  displayLatex = displayLatex.replace(`[${s.placeholder}]`, s.content || s.placeholder);
                } else if (i === slotIndex) {
                  displayLatex = displayLatex.replace(`[${s.placeholder}]`, 
                    `\\colorbox{lightblue}{${s.content || s.placeholder}}`
                  );
                } else {
                  displayLatex = displayLatex.replace(`[${s.placeholder}]`, s.placeholder);
                }
              });
              
              return (
                <button
                  key={slot.id}
                  className="px-2 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded text-xs cursor-pointer transition-colors"
                  onClick={() => handleSlotClick(slot.id, slot.content)}
                  title={`Click to edit ${slot.placeholder}`}
                >
                  {slot.content || slot.placeholder}
                </button>
              );
            })}
          </div>
        ) : (
          <span 
            dangerouslySetInnerHTML={{ 
              __html: renderPreview(comp.latex) 
            }}
          />
        )}
      </span>
    ));
  };

  return (
    <Card className="border-2 border-primary/20 bg-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Interactive Equation Builder</CardTitle>
        <p className="text-sm text-muted-foreground">Click buttons to add components, then click placeholders to edit them</p>
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
                disabled={equationComponents.length === 0}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                disabled={equationComponents.length === 0}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {equationComponents.length > 0 ? (
            <div className="space-y-2">
              {/* Interactive View */}
              <div className="p-2 bg-background rounded border min-h-8 flex items-center flex-wrap gap-1">
                {renderInteractiveEquation()}
              </div>
              
              {/* Final Preview */}
              <div className="p-2 bg-background rounded border min-h-8 flex items-center">
                <span className="text-xs text-muted-foreground mr-2">Preview:</span>
                <div 
                  dangerouslySetInnerHTML={{ __html: renderPreview(buildEquation()) }}
                />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4">
              Click components below to build your equation
            </div>
          )}
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div className="p-3 bg-primary/5 border-2 border-primary/20 rounded-lg">
            <p className="text-sm font-medium mb-2">Edit Content:</p>
            <div className="flex gap-2">
              <Input
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                placeholder="Enter content"
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateSelectedSlot();
                  if (e.key === 'Escape') setShowTextInput(false);
                }}
              />
              <Button size="sm" onClick={updateSelectedSlot}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowTextInput(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {Object.keys(componentTemplates).map((category) => (
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
            {componentTemplates[selectedCategory as keyof typeof componentTemplates].map((template, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => addComponent(template)}
                className="text-xs h-auto p-2 whitespace-normal hover:bg-primary/10"
                title={`Add ${template.label}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium">{template.label}</span>
                  <div 
                    className="text-[10px] opacity-70"
                    dangerouslySetInnerHTML={{ 
                      __html: renderPreview(template.latex.replace(/\[[^\]]+\]/g, '?')) 
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
            disabled={equationComponents.length === 0}
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
