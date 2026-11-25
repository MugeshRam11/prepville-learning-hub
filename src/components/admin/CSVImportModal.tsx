import { practiceQuestion } from '@/lib/practiceQuestion';
import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, CheckCircle, AlertCircle, FileText, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateMathExpression } from '@/lib/canonicalMath';
import { renderFinalText } from '@/lib/renderFinalText';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  programme?: string;
  subject?: string;
  myp_year?: string;
  strand?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  command_term?: string;
  question_text?: string;
  marks?: string | number;
  answer_key?: string;
  solution?: string;
}

interface RowValidationResult {
  rowNumber: number;
  data: ParsedRow;
  isValid: boolean;
  errors: string[];
}

const VALID_YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
const VALID_STRANDS = ['Number', 'Algebra', 'Geometry and Trigonometry', 'Statistics and Probability'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<RowValidationResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const sampleCsvContent = `programme,subject,myp_year,strand,topic,difficulty,command_term,question_text,marks,answer_key,solution
MYP,mathematics,Year 4,Algebra,Linear Equations,medium,Solve,Solve for $x$: $3x + 7 = 22$,2,5,"Step 1: Subtract 7: $3x = 15$. Step 2: Divide by 3: $x = 5$."
MYP,mathematics,Year 5,Geometry and Trigonometry,Right-angled Triangles,hard,Calculate,"In triangle $ABC$ with $\\angle B = 90^\\circ$, $AB = 6\\text{ cm}$ and $BC = 8\\text{ cm}$. Calculate the length of hypotenuse $AC$.",3,10,"By Pythagorean theorem: $AC^2 = 6^2 + 8^2 = 36 + 64 = 100 \\implies AC = 10\\text{ cm}$."
MYP,mathematics,Year 3,Number,Fractions and Percentages,easy,Simplify,"Simplify $\\frac{14}{28}$ to its lowest terms.",1,1/2,"Divide numerator and denominator by 14 to get $\\frac{1}{2}$."`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prepville_myp_math_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Sample template downloaded');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    setValidatedRows([]);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setGlobalError('Please select a valid CSV file.');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    Papa.parse<ParsedRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        const rows = results.data || [];
        if (rows.length === 0) {
          setGlobalError('The CSV file contains no data rows.');
          setValidatedRows([]);
          return;
        }

        const seenQuestions = new Set<string>();
        const validations: RowValidationResult[] = rows.map((row, index) => {
          const rowErrors = results.errors.filter(err => err.row === index || err.row === undefined).map(err => err.message);
          if (row.programme?.trim() !== 'MYP' || row.subject?.trim() !== 'mathematics') rowErrors.push('Expected MYP mathematics');
          if (!Number.isInteger(Number(row.marks)) || Number(row.marks) < 1) rowErrors.push('Expected positive whole marks');
          if (!row.answer_key?.trim()) rowErrors.push('Missing answer_key');
          const rowNum = index + 2; // header is row 1

          // 1. Mandatory Question Text
          const qText = row.question_text?.trim();
          if (!qText) {
            rowErrors.push('Missing question_text');
          } else if (seenQuestions.has(qText.toLowerCase())) {
            rowErrors.push('Duplicate question text in this CSV');
          } else {
            seenQuestions.add(qText.toLowerCase());

            // 1b. Mathematical syntax validation for question_text
            const qMathCheck = validateMathExpression(qText);
            if (!qMathCheck.isValid) {
              rowErrors.push(`Math syntax error in question_text: ${qMathCheck.errors.join(', ')}`);
            }
          }

          // 1c. Mathematical syntax validation for answer_key
          const aKey = row.answer_key?.trim();
          if (aKey) {
            const aCheck = validateMathExpression(aKey);
            if (!aCheck.isValid) {
              rowErrors.push(`Math syntax error in answer_key: ${aCheck.errors.join(', ')}`);
            }
          }

          // 1d. Mathematical syntax validation for solution
          const sol = row.solution?.trim();
          if (sol) {
            const solCheck = validateMathExpression(sol);
            if (!solCheck.isValid) {
              rowErrors.push(`Math syntax error in solution: ${solCheck.errors.join(', ')}`);
            }
          }

          // 2. Topic
          if (!row.topic?.trim()) {
            rowErrors.push('Missing topic');
          }

          // 3. Strict MYP Year validation (no silent fallback)
          const year = row.myp_year?.trim();
          if (!year || !VALID_YEARS.includes(year)) {
            rowErrors.push(`Invalid myp_year: "${year || ''}". Must be one of: ${VALID_YEARS.join(', ')}`);
          }

          // 4. Strict Strand validation
          const strand = row.strand?.trim();
          if (!strand || !VALID_STRANDS.includes(strand)) {
            rowErrors.push(`Invalid strand: "${strand || ''}". Must be one of: ${VALID_STRANDS.join(', ')}`);
          }

          // 5. Difficulty
          const diff = row.difficulty?.trim().toLowerCase();
          if (diff && !VALID_DIFFICULTIES.includes(diff)) {
            rowErrors.push(`Invalid difficulty: "${diff}". Must be easy, medium, or hard`);
          }

          return {
            rowNumber: rowNum,
            data: row,
            isValid: rowErrors.length === 0,
            errors: rowErrors
          };
        });

        setValidatedRows(validations);
        const validCount = validations.filter((v) => v.isValid).length;
        const invalidCount = validations.length - validCount;

        if (invalidCount > 0) {
          toast.warning(`Parsed ${validations.length} rows: ${validCount} valid, ${invalidCount} invalid.`);
        } else {
          toast.success(`Parsed ${validCount} question(s) successfully. Ready for review import.`);
        }
      },
      error: (err) => {
        setParsing(false);
        setGlobalError(`Failed to parse CSV file: ${err.message}`);
      }
    });
  };

  const validRows = validatedRows.filter((r) => r.isValid);
  const invalidRows = validatedRows.filter((r) => !r.isValid);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setGlobalError(null);

    try {
      let importedCount = 0;

      const batch = crypto.randomUUID();
      const errors: string[] = [];
      let duplicates = invalidRows.filter(row => row.errors.some(message => message.includes('Duplicate'))).length;
      let rejected = invalidRows.length - duplicates;
      for (const item of validRows) {
        const row = item.data;
        const { error } = await supabase.rpc('save_bank_question', {
          p_batch: batch, p_question: practiceQuestion.parse({ ...row, programme: row.programme?.trim(), subject: row.subject?.trim(),
            strand: row.strand?.trim(), myp_year: row.myp_year?.trim(), marks: Number(row.marks),
            difficulty: row.difficulty?.trim().toLowerCase() || 'medium', question_type: 'single',
            answer_type: 'text_equation', review_status: 'review_pending', is_published: false })
        });
        if (error) {
          if (error.code === '23505') duplicates++;
          else rejected++;
          errors.push('Row ' + item.rowNumber + ': ' + error.message);
        } else importedCount++;
      }
      const summary = 'Batch ' + batch + ' · Imported ' + importedCount + ' · Rejected ' + rejected + ' · Duplicates ' + duplicates;
      setGlobalError([summary, ...errors].join(' | '));
      toast.info(summary);
      onSuccess();
    } catch (err: any) {
      setGlobalError(`Import failed: ${err.message || 'Unknown database error'}`);
      toast.error('Import failed. Please check table constraints.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="w-5 h-5 text-indigo-600" />
            Bulk Import IB MYP Math Questions (CSV)
          </DialogTitle>
          <DialogDescription>
            Import questions into the canonical Question Bank. Imported questions are safely set to
            <strong> Review Pending</strong> (unpublished) until verified by an educator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download Template Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-800">
                Official PrepVille IB MYP Mathematics CSV Template
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-100/50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download Template
            </Button>
          </div>

          {/* Upload Input */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-sm font-semibold text-slate-700">
                {file ? file.name : 'Click to select or drag and drop your CSV file'}
              </div>
              <div className="text-xs text-muted-foreground">
                Strictly validated: programme, subject, myp_year (Year 1–5), strand, topic, difficulty, question_text, answer_key
              </div>
            </label>
          </div>

          {/* Global Parse Error */}
          {globalError && (
            <div className="flex items-center gap-2 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Validation Status Badges */}
          {validatedRows.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  {validRows.length} Valid Row(s)
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    {invalidRows.length} Invalid Row(s) (Excluded)
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Review Queue Target: <strong>Review Pending</strong>
              </span>
            </div>
          )}

          {/* Invalid Rows Error Breakdown */}
          {invalidRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Row Validation Errors ({invalidRows.length} rejected)
              </div>
              <div className="border border-rose-200 rounded-lg max-h-36 overflow-y-auto bg-rose-50/40 text-xs p-2 space-y-1 font-mono">
                {invalidRows.map((inv) => (
                  <div key={inv.rowNumber} className="text-rose-900 flex items-start gap-2">
                    <span className="font-bold shrink-0">Row {inv.rowNumber}:</span>
                    <span>{inv.errors.join('; ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid Rows Preview Table */}
          {validRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Preview Eligible Rows (Showing first {Math.min(5, validRows.length)} of {validRows.length})
              </div>

              <div className="border rounded-lg overflow-hidden text-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Row</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Strand</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Diff.</TableHead>
                      <TableHead className="w-[45%]">Question Text</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validRows.slice(0, 5).map((r) => (
                      <TableRow key={r.rowNumber}>
                        <TableCell className="font-mono">{r.rowNumber}</TableCell>
                        <TableCell className="font-semibold">{r.data.myp_year}</TableCell>
                        <TableCell>{r.data.strand}</TableCell>
                        <TableCell>{r.data.topic}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {r.data.difficulty || 'medium'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="font-serif text-slate-800 line-clamp-2">
                            {renderFinalText(r.data.question_text || '')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
          <Button variant="ghost" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing || parsing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${validRows.length} Valid Question(s) for Review`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportModal;
