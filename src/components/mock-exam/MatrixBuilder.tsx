import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus, Grid3X3 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MatrixBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string) => void;
}

type MatrixType = 'pmatrix' | 'bmatrix' | 'vmatrix' | 'Bmatrix' | 'matrix';

const MATRIX_TYPES: { value: MatrixType; label: string; preview: string }[] = [
  { value: 'pmatrix', label: 'Round ( )', preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { value: 'bmatrix', label: 'Square [ ]', preview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  { value: 'vmatrix', label: 'Determinant | |', preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
  { value: 'Bmatrix', label: 'Curly { }', preview: '\\begin{Bmatrix} a & b \\\\ c & d \\end{Bmatrix}' },
  { value: 'matrix', label: 'Plain', preview: '\\begin{matrix} a & b \\\\ c & d \\end{matrix}' },
];

const MatrixBuilder: React.FC<MatrixBuilderProps> = ({
  open,
  onOpenChange,
  onInsert,
}) => {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [matrixType, setMatrixType] = useState<MatrixType>('pmatrix');
  const [cells, setCells] = useState<string[][]>([
    ['', ''],
    ['', ''],
  ]);
  const [previewHtml, setPreviewHtml] = useState('');

  // Update cells grid when dimensions change
  useEffect(() => {
    setCells(prevCells => {
      const newCells: string[][] = [];
      for (let i = 0; i < rows; i++) {
        const row: string[] = [];
        for (let j = 0; j < cols; j++) {
          row.push(prevCells[i]?.[j] ?? '');
        }
        newCells.push(row);
      }
      return newCells;
    });
  }, [rows, cols]);

  // Generate LaTeX and preview
  useEffect(() => {
    const latex = generateLatex();
    try {
      const html = katex.renderToString(latex, { 
        throwOnError: false,
        displayMode: true 
      });
      setPreviewHtml(html);
    } catch {
      setPreviewHtml('');
    }
  }, [cells, matrixType]);

  const generateLatex = (): string => {
    const rowsLatex = cells.map(row => 
      row.map(cell => cell || '□').join(' & ')
    ).join(' \\\\ ');
    
    return `\\begin{${matrixType}} ${rowsLatex} \\end{${matrixType}}`;
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setCells(prev => {
      const newCells = prev.map(row => [...row]);
      newCells[rowIndex][colIndex] = value;
      return newCells;
    });
  };

  const adjustDimension = (dimension: 'rows' | 'cols', delta: number) => {
    if (dimension === 'rows') {
      const newRows = Math.max(1, Math.min(6, rows + delta));
      setRows(newRows);
    } else {
      const newCols = Math.max(1, Math.min(6, cols + delta));
      setCols(newCols);
    }
  };

  const handleInsert = () => {
    const latex = generateLatex();
    onInsert(latex);
    onOpenChange(false);
    // Reset state
    setRows(2);
    setCols(2);
    setCells([['', ''], ['', '']]);
  };

  const handleQuickInsert = (r: number, c: number) => {
    setRows(r);
    setCols(c);
    // Generate with placeholders
    const placeholderCells: string[][] = [];
    for (let i = 0; i < r; i++) {
      const row: string[] = [];
      for (let j = 0; j < c; j++) {
        row.push('');
      }
      placeholderCells.push(row);
    }
    const rowsLatex = placeholderCells.map(row => 
      row.map(() => '□').join(' & ')
    ).join(' \\\\ ');
    const latex = `\\begin{${matrixType}} ${rowsLatex} \\end{${matrixType}}`;
    onInsert(latex);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Matrix Builder
          </DialogTitle>
          <DialogDescription>
            Build a custom matrix with your desired dimensions and bracket style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Templates */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quick Templates</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { r: 2, c: 2, label: '2×2' },
                { r: 3, c: 3, label: '3×3' },
                { r: 2, c: 3, label: '2×3' },
                { r: 3, c: 2, label: '3×2' },
                { r: 3, c: 1, label: '3×1 (Column)' },
                { r: 1, c: 3, label: '1×3 (Row)' },
              ].map(({ r, c, label }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickInsert(r, c)}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Matrix Type Selector */}
          <div className="space-y-2">
            <Label>Bracket Style</Label>
            <Select value={matrixType} onValueChange={(v) => setMatrixType(v as MatrixType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATRIX_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-3">
                      <span>{type.label}</span>
                      <span 
                        className="text-xs opacity-70"
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(type.preview, { throwOnError: false })
                        }}
                      />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dimension Controls */}
          <div className="flex gap-6">
            <div className="space-y-2">
              <Label>Rows</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => adjustDimension('rows', -1)}
                  disabled={rows <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-mono">{rows}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => adjustDimension('rows', 1)}
                  disabled={rows >= 6}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Columns</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => adjustDimension('cols', -1)}
                  disabled={cols <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-mono">{cols}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => adjustDimension('cols', 1)}
                  disabled={cols >= 6}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Cell Grid */}
          <div className="space-y-2">
            <Label>Enter Values (optional)</Label>
            <div 
              className="inline-grid gap-1 p-3 bg-muted/50 rounded-lg border"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {cells.map((row, rowIndex) => 
                row.map((cell, colIndex) => (
                  <Input
                    key={`${rowIndex}-${colIndex}`}
                    value={cell}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    placeholder="□"
                    className="w-14 h-10 text-center font-mono text-sm"
                  />
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <motion.div 
              className="p-4 bg-primary/5 border rounded-lg flex items-center justify-center min-h-[80px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {previewHtml ? (
                <div 
                  className="text-lg"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <span className="text-muted-foreground text-sm">Preview will appear here</span>
              )}
            </motion.div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert}>
            Insert Matrix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MatrixBuilder;
