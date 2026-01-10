import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Table2, 
  GripVertical, 
  Check, 
  X, 
  Copy, 
  ArrowUp, 
  ArrowDown,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export interface TableCell {
  value: string;
  editable: boolean;
  correct?: string;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableConfig {
  headers: string[];
  rows: TableRow[];
  tableType?: 'frequency' | 'two_way' | 'function' | 'probability' | 'statistics' | 'data';
}

interface TableBuilderProps {
  config: TableConfig;
  onChange: (config: TableConfig) => void;
  onClose?: () => void;
}

const TABLE_TYPES = [
  { value: 'data', label: 'Data Table' },
  { value: 'frequency', label: 'Frequency Table' },
  { value: 'two_way', label: 'Two-Way Table' },
  { value: 'function', label: 'Function Table' },
  { value: 'probability', label: 'Probability Table' },
  { value: 'statistics', label: 'Statistics Table' },
];

const DEFAULT_CONFIG: TableConfig = {
  headers: ['x', 'f(x)'],
  rows: [
    { cells: [{ value: '1', editable: false }, { value: '', editable: true, correct: '' }] },
    { cells: [{ value: '2', editable: false }, { value: '', editable: true, correct: '' }] },
  ],
  tableType: 'function'
};

const TableBuilder: React.FC<TableBuilderProps> = ({ config, onChange, onClose }) => {
  const [tableConfig, setTableConfig] = useState<TableConfig>(
    config?.headers?.length > 0 ? config : DEFAULT_CONFIG
  );

  const updateConfig = useCallback((newConfig: TableConfig) => {
    setTableConfig(newConfig);
    onChange(newConfig);
  }, [onChange]);

  // Header operations
  const addColumn = () => {
    const newHeaders = [...tableConfig.headers, `Col ${tableConfig.headers.length + 1}`];
    const newRows = tableConfig.rows.map(row => ({
      cells: [...row.cells, { value: '', editable: true, correct: '' }]
    }));
    updateConfig({ ...tableConfig, headers: newHeaders, rows: newRows });
  };

  const removeColumn = (colIndex: number) => {
    if (tableConfig.headers.length <= 1) {
      toast.error('Table must have at least 1 column');
      return;
    }
    const newHeaders = tableConfig.headers.filter((_, i) => i !== colIndex);
    const newRows = tableConfig.rows.map(row => ({
      cells: row.cells.filter((_, i) => i !== colIndex)
    }));
    updateConfig({ ...tableConfig, headers: newHeaders, rows: newRows });
  };

  const updateHeader = (colIndex: number, value: string) => {
    const newHeaders = [...tableConfig.headers];
    newHeaders[colIndex] = value;
    updateConfig({ ...tableConfig, headers: newHeaders });
  };

  // Row operations
  const addRow = () => {
    const newRow: TableRow = {
      cells: tableConfig.headers.map(() => ({ value: '', editable: true, correct: '' }))
    };
    updateConfig({ ...tableConfig, rows: [...tableConfig.rows, newRow] });
  };

  const removeRow = (rowIndex: number) => {
    if (tableConfig.rows.length <= 1) {
      toast.error('Table must have at least 1 row');
      return;
    }
    const newRows = tableConfig.rows.filter((_, i) => i !== rowIndex);
    updateConfig({ ...tableConfig, rows: newRows });
  };

  const moveRow = (rowIndex: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
    if (newIndex < 0 || newIndex >= tableConfig.rows.length) return;
    
    const newRows = [...tableConfig.rows];
    [newRows[rowIndex], newRows[newIndex]] = [newRows[newIndex], newRows[rowIndex]];
    updateConfig({ ...tableConfig, rows: newRows });
  };

  const duplicateRow = (rowIndex: number) => {
    const rowCopy: TableRow = {
      cells: tableConfig.rows[rowIndex].cells.map(cell => ({ ...cell }))
    };
    const newRows = [...tableConfig.rows];
    newRows.splice(rowIndex + 1, 0, rowCopy);
    updateConfig({ ...tableConfig, rows: newRows });
  };

  // Cell operations
  const updateCell = (rowIndex: number, cellIndex: number, field: keyof TableCell, value: string | boolean) => {
    const newRows = [...tableConfig.rows];
    newRows[rowIndex] = {
      cells: newRows[rowIndex].cells.map((cell, i) => 
        i === cellIndex ? { ...cell, [field]: value } : cell
      )
    };
    updateConfig({ ...tableConfig, rows: newRows });
  };

  const toggleCellEditable = (rowIndex: number, cellIndex: number) => {
    const cell = tableConfig.rows[rowIndex].cells[cellIndex];
    updateCell(rowIndex, cellIndex, 'editable', !cell.editable);
  };

  // Presets
  const applyPreset = (preset: string) => {
    let newConfig: TableConfig;
    
    switch (preset) {
      case 'function_2x2':
        newConfig = {
          headers: ['x', 'f(x)'],
          rows: [
            { cells: [{ value: '0', editable: false }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: '1', editable: false }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: '2', editable: false }, { value: '', editable: true, correct: '' }] },
          ],
          tableType: 'function'
        };
        break;
      case 'frequency':
        newConfig = {
          headers: ['Value', 'Frequency', 'Cumulative Frequency'],
          rows: [
            { cells: [{ value: '1-10', editable: false }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: '11-20', editable: false }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }] },
          ],
          tableType: 'frequency'
        };
        break;
      case 'two_way':
        newConfig = {
          headers: ['', 'Category A', 'Category B', 'Total'],
          rows: [
            { cells: [{ value: 'Row 1', editable: false }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: 'Row 2', editable: false }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: 'Total', editable: false }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }, { value: '', editable: true, correct: '' }] },
          ],
          tableType: 'two_way'
        };
        break;
      case 'probability':
        newConfig = {
          headers: ['Outcome', 'P(X)'],
          rows: [
            { cells: [{ value: 'A', editable: false }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: 'B', editable: false }, { value: '', editable: true, correct: '' }] },
            { cells: [{ value: 'C', editable: false }, { value: '', editable: true, correct: '' }] },
          ],
          tableType: 'probability'
        };
        break;
      default:
        return;
    }
    
    updateConfig(newConfig);
    toast.success(`Applied ${preset.replace('_', ' ')} preset`);
  };

  const resetTable = () => {
    updateConfig(DEFAULT_CONFIG);
    toast.info('Table reset to default');
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Table2 className="w-4 h-4 text-primary" />
            Table Builder
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select 
              value={tableConfig.tableType || 'data'} 
              onValueChange={(v) => updateConfig({ ...tableConfig, tableType: v as TableConfig['tableType'] })}
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-7" onClick={resetTable}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Presets:</span>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => applyPreset('function_2x2')}>
            Function (x, f(x))
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => applyPreset('frequency')}>
            Frequency
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => applyPreset('two_way')}>
            Two-Way
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => applyPreset('probability')}>
            Probability
          </Button>
        </div>

        {/* Table Editor */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            {/* Headers */}
            <thead>
              <tr className="bg-muted">
                <th className="w-8 border-r border-border" />
                {tableConfig.headers.map((header, colIdx) => (
                  <th key={colIdx} className="border-b border-r border-border p-1 min-w-[100px]">
                    <div className="flex items-center gap-1">
                      <Input
                        value={header}
                        onChange={(e) => updateHeader(colIdx, e.target.value)}
                        className="h-7 text-xs text-center font-semibold"
                        placeholder="Header"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeColumn(colIdx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                ))}
                <th className="w-8 border-b border-border p-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addColumn}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </th>
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {tableConfig.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/30">
                  {/* Row actions */}
                  <td className="border-r border-b border-border p-1 bg-muted/50">
                    <div className="flex flex-col items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveRow(rowIdx, 'up')}
                        disabled={rowIdx === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <GripVertical className="w-3 h-3 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveRow(rowIdx, 'down')}
                        disabled={rowIdx === tableConfig.rows.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  {/* Cells */}
                  {row.cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border-b border-r border-border p-1">
                      <div className="space-y-1">
                        {/* Cell value input */}
                        <Input
                          value={cell.value}
                          onChange={(e) => updateCell(rowIdx, cellIdx, 'value', e.target.value)}
                          className={`h-7 text-xs text-center ${!cell.editable ? 'bg-muted font-medium' : ''}`}
                          placeholder={cell.editable ? 'Student input' : 'Fixed value'}
                        />
                        {/* Editable toggle & correct answer */}
                        <div className="flex items-center gap-1 justify-between">
                          <div className="flex items-center gap-1">
                            <Checkbox
                              id={`editable-${rowIdx}-${cellIdx}`}
                              checked={cell.editable}
                              onCheckedChange={() => toggleCellEditable(rowIdx, cellIdx)}
                              className="w-3 h-3"
                            />
                            <label htmlFor={`editable-${rowIdx}-${cellIdx}`} className="text-[10px] text-muted-foreground">
                              Editable
                            </label>
                          </div>
                          {cell.editable && (
                            <Input
                              value={cell.correct || ''}
                              onChange={(e) => updateCell(rowIdx, cellIdx, 'correct', e.target.value)}
                              className="h-5 text-[10px] w-16 text-center border-green-300 focus:ring-green-500"
                              placeholder="Answer"
                              title="Correct answer for validation"
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  ))}
                  {/* Row delete button */}
                  <td className="border-b border-border p-1">
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => duplicateRow(rowIdx)}
                        title="Duplicate row"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive hover:text-destructive"
                        onClick={() => removeRow(rowIdx)}
                        title="Delete row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <Button variant="outline" size="sm" onClick={addRow} className="w-full">
          <Plus className="w-3 h-3 mr-1" />
          Add Row
        </Button>

        {/* Preview */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">Preview</Badge>
            <span className="text-xs text-muted-foreground">
              {tableConfig.rows.length} rows × {tableConfig.headers.length} columns
            </span>
            {tableConfig.tableType && (
              <Badge variant="outline" className="text-xs">{tableConfig.tableType.replace('_', ' ')} table</Badge>
            )}
          </div>
          <div className="overflow-x-auto border rounded bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  {tableConfig.headers.map((h, i) => (
                    <th key={i} className="border border-border px-3 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableConfig.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.cells.map((cell, cIdx) => (
                      <td key={cIdx} className={`border border-border px-3 py-1.5 text-center ${cell.editable ? 'bg-primary/5' : ''}`}>
                        {cell.editable ? (
                          <span className="text-muted-foreground italic">
                            {cell.correct ? `[${cell.correct}]` : '?'}
                          </span>
                        ) : (
                          cell.value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            <span className="bg-primary/5 px-1">Blue cells</span> = Student editable, <span className="text-green-600">[brackets]</span> = Expected answers
          </p>
        </div>

        {/* Actions */}
        {onClose && (
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={onClose}>
              <Check className="w-3 h-3 mr-1" />
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TableBuilder;
