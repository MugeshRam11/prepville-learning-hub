import React from 'react';
import { Plus, Minus, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComponentConfig, TableConfig, createDefaultTableConfig } from '../types';

interface TableEditorProps {
  component: ComponentConfig;
  onUpdate: (id: string, updates: Partial<ComponentConfig>) => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ component, onUpdate }) => {
  const tableConfig = component.tableConfig || createDefaultTableConfig(3, 3);

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newCells = tableConfig.cells.map((row, rIdx) =>
      row.map((cell, cIdx) =>
        rIdx === rowIdx && cIdx === colIdx ? { ...cell, value } : cell
      )
    );
    onUpdate(component.id, {
      tableConfig: { ...tableConfig, cells: newCells },
    });
  };

  const addRow = () => {
    const newRow = Array(tableConfig.columns).fill(null).map(() => ({
      value: '',
      isHeader: false,
      isEditable: true,
    }));
    const newCells = [...tableConfig.cells, newRow];
    onUpdate(component.id, {
      tableConfig: {
        ...tableConfig,
        rows: tableConfig.rows + 1,
        cells: newCells,
      },
    });
  };

  const removeRow = () => {
    if (tableConfig.rows <= 2) return;
    const newCells = tableConfig.cells.slice(0, -1);
    onUpdate(component.id, {
      tableConfig: {
        ...tableConfig,
        rows: tableConfig.rows - 1,
        cells: newCells,
      },
    });
  };

  const addColumn = () => {
    const newCells = tableConfig.cells.map((row, rowIdx) => [
      ...row,
      { value: '', isHeader: rowIdx === 0, isEditable: true },
    ]);
    onUpdate(component.id, {
      tableConfig: {
        ...tableConfig,
        columns: tableConfig.columns + 1,
        cells: newCells,
      },
    });
  };

  const removeColumn = () => {
    if (tableConfig.columns <= 2) return;
    const newCells = tableConfig.cells.map(row => row.slice(0, -1));
    onUpdate(component.id, {
      tableConfig: {
        ...tableConfig,
        columns: tableConfig.columns - 1,
        cells: newCells,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Table controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={removeRow}
            disabled={tableConfig.rows <= 2}
            className="h-7 px-2"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-xs font-medium px-2">{tableConfig.rows} rows</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="h-7 px-2"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={removeColumn}
            disabled={tableConfig.columns <= 2}
            className="h-7 px-2"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-xs font-medium px-2">{tableConfig.columns} cols</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={addColumn}
            className="h-7 px-2"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="ml-auto">
          <Settings className="w-4 h-4 mr-1" />
          Settings
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[300px]">
          <tbody>
            {tableConfig.cells.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx === 0 ? 'bg-muted/50' : ''}>
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn(
                      "border-r border-b last:border-r-0",
                      rowIdx === tableConfig.rows - 1 && "border-b-0"
                    )}
                  >
                    <Input
                      value={cell.value}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      placeholder={rowIdx === 0 ? `Header ${colIdx + 1}` : 'Cell'}
                      className={cn(
                        "h-9 border-none rounded-none focus:ring-2 focus:ring-inset focus:ring-primary",
                        rowIdx === 0 && "font-semibold bg-muted/30"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Students will fill in the table cells during the exam.
      </p>
    </div>
  );
};

export default TableEditor;
