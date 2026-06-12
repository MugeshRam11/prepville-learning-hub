import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertCircle } from 'lucide-react';

interface TableCell {
  value: string;
  editable: boolean;
  correct?: string;
}

interface TableRow {
  cells: TableCell[];
}

interface TableConfig {
  headers: string[];
  rows: TableRow[];
  tableType?: string;
}

interface TableValue {
  [rowIndex: number]: {
    [cellIndex: number]: string;
  };
}

interface ValidationResult {
  isComplete: boolean;
  isCorrect: boolean;
  totalEditable: number;
  answered: number;
  correct: number;
  incorrect: number;
  cellResults: Map<string, 'correct' | 'incorrect' | 'unanswered'>;
}

interface TableAnswerValidatorProps {
  tableConfig: TableConfig;
  tableValue: TableValue;
  showResults?: boolean;
  onValidationComplete?: (result: ValidationResult) => void;
}

// Normalize answer for comparison (handle fractions, decimals, etc.)
const normalizeAnswer = (value: string): string => {
  if (!value) return '';
  
  let normalized = value.trim().toLowerCase();
  
  // Remove common formatting
  normalized = normalized.replace(/\s+/g, '');
  normalized = normalized.replace(/,/g, '');
  
  // Handle fractions like "1/2" = 0.5
  const fractionMatch = normalized.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, denom] = fractionMatch;
    normalized = (parseInt(num) / parseInt(denom)).toString();
  }
  
  // Try parsing as number for decimal comparison
  const asNumber = parseFloat(normalized);
  if (!isNaN(asNumber)) {
    // Round to 6 decimal places to handle floating point issues
    normalized = asNumber.toFixed(6).replace(/\.?0+$/, '');
  }
  
  return normalized;
};

// Compare two answers with tolerance for numerical values
const answersMatch = (studentAnswer: string, correctAnswer: string): boolean => {
  if (!correctAnswer) return true; // No correct answer defined = accept anything
  if (!studentAnswer) return false;
  
  const normStudent = normalizeAnswer(studentAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);
  
  // Exact match first
  if (normStudent === normCorrect) return true;
  
  // Numeric comparison with tolerance
  const numStudent = parseFloat(normStudent);
  const numCorrect = parseFloat(normCorrect);
  
  if (!isNaN(numStudent) && !isNaN(numCorrect)) {
    const tolerance = Math.abs(numCorrect) * 0.001; // 0.1% tolerance
    return Math.abs(numStudent - numCorrect) <= Math.max(tolerance, 0.0001);
  }
  
  return false;
};

export const validateTableAnswers = (
  tableConfig: TableConfig,
  tableValue: TableValue
): ValidationResult => {
  const cellResults = new Map<string, 'correct' | 'incorrect' | 'unanswered'>();
  let totalEditable = 0;
  let answered = 0;
  let correct = 0;
  let incorrect = 0;

  tableConfig.rows.forEach((row, rowIdx) => {
    row.cells.forEach((cell, cellIdx) => {
      if (cell.editable) {
        totalEditable++;
        const cellKey = `${rowIdx}-${cellIdx}`;
        const studentAnswer = tableValue?.[rowIdx]?.[cellIdx] || '';
        
        if (!studentAnswer.trim()) {
          cellResults.set(cellKey, 'unanswered');
        } else {
          answered++;
          if (answersMatch(studentAnswer, cell.correct || '')) {
            correct++;
            cellResults.set(cellKey, 'correct');
          } else {
            incorrect++;
            cellResults.set(cellKey, 'incorrect');
          }
        }
      }
    });
  });

  return {
    isComplete: answered === totalEditable,
    isCorrect: correct === totalEditable && totalEditable > 0,
    totalEditable,
    answered,
    correct,
    incorrect,
    cellResults
  };
};

const TableAnswerValidator: React.FC<TableAnswerValidatorProps> = ({
  tableConfig,
  tableValue,
  showResults = false,
  onValidationComplete
}) => {
  const validation = useMemo(() => {
    const result = validateTableAnswers(tableConfig, tableValue);
    onValidationComplete?.(result);
    return result;
  }, [tableConfig, tableValue, onValidationComplete]);

  if (!showResults) return null;

  const getScorePercentage = () => {
    if (validation.totalEditable === 0) return 0;
    return Math.round((validation.correct / validation.totalEditable) * 100);
  };

  const getScoreColor = () => {
    const pct = getScorePercentage();
    if (pct >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (pct >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className={`p-3 rounded-lg border ${getScoreColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {validation.isCorrect ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : validation.isComplete ? (
            <X className="w-5 h-5 text-red-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          )}
          <div>
            <p className="font-medium text-sm">
              {validation.isCorrect 
                ? 'All answers correct!' 
                : validation.isComplete 
                  ? 'Some answers incorrect' 
                  : 'Incomplete answers'}
            </p>
            <p className="text-xs opacity-80">
              {validation.answered}/{validation.totalEditable} cells answered
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Check className="w-3 h-3 text-green-600" />
            {validation.correct}
          </Badge>
          {validation.incorrect > 0 && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <X className="w-3 h-3 text-red-600" />
              {validation.incorrect}
            </Badge>
          )}
          <Badge className={`text-xs ${validation.isCorrect ? 'bg-green-600' : ''}`}>
            {getScorePercentage()}%
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default TableAnswerValidator;
