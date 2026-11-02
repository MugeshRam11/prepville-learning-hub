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
import { Upload, Download, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setErrorMsg(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('Please select a valid CSV file.');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    Papa.parse<ParsedRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        if (results.errors && results.errors.length > 0) {
          setErrorMsg(`CSV Parse Warning: ${results.errors[0].message}`);
        }

        const validRows = results.data.filter(
          (row) => row.topic && row.question_text
        );

        if (validRows.length === 0) {
          setErrorMsg('No valid rows found. Ensure the CSV contains at least "topic" and "question_text" columns.');
          setParsedData([]);
        } else {
          setParsedData(validRows);
          toast.success(`Parsed ${validRows.length} question(s) successfully.`);
        }
      },
      error: (err) => {
        setParsing(false);
        setErrorMsg(`Failed to parse file: ${err.message}`);
      }
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    setErrorMsg(null);

    try {
      let importedCount = 0;

      for (const row of parsedData) {
        const year = (row.myp_year && ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].includes(row.myp_year))
          ? row.myp_year
          : 'Year 4';

        const strand = (row.strand && ['Number', 'Algebra', 'Geometry and Trigonometry', 'Statistics and Probability'].includes(row.strand))
          ? row.strand
          : 'Algebra';

        const difficulty = (row.difficulty && ['easy', 'medium', 'hard'].includes(row.difficulty.toLowerCase()))
          ? row.difficulty.toLowerCase()
          : 'medium';

        const marks = Number(row.marks) > 0 ? Number(row.marks) : 1;

        // Insert question into question_bank
        const { data: qData, error: qErr } = await supabase
          .from('question_bank')
          .insert({
            programme: 'MYP',
            subject: 'mathematics',
            myp_year: year,
            strand: strand,
            topic: row.topic?.trim() || 'General Mathematics',
            subtopic: row.subtopic?.trim() || null,
            difficulty: difficulty,
            command_term: row.command_term?.trim() || 'Solve',
            question_text: row.question_text?.trim() || '',
            marks: marks,
            is_published: true,
            review_status: 'approved',
            question_type: 'single',
            answer_type: 'text_equation'
          })
          .select('id')
          .single();

        if (qErr) {
          console.warn('Error inserting question_bank row:', qErr.message);
          continue;
        }

        if (qData?.id && (row.answer_key || row.solution)) {
          // Insert protected answer key
          await supabase.from('question_answer_keys').insert({
            question_id: qData.id,
            answer_key: row.answer_key?.trim() || '',
            solution: row.solution?.trim() || ''
          });
        }

        importedCount++;
      }

      toast.success(`Successfully imported ${importedCount} of ${parsedData.length} questions.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(`Import failed: ${err.message || 'Unknown database error'}`);
      toast.error('Import failed. Please check table schema.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="w-5 h-5 text-indigo-600" />
            Bulk Import IB MYP Math Questions (CSV)
          </DialogTitle>
          <DialogDescription>
            Upload a standard CSV file to bulk import questions into the independent Question Bank.
            Answer keys and solutions are automatically stored in the protected answer table.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download Sample Button */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-800">
                Need the standard IB MYP Mathematics CSV structure?
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
                Supported columns: programme, subject, myp_year, strand, topic, difficulty, command_term, question_text, marks, answer_key, solution
              </div>
            </label>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">
                  Preview (First {Math.min(5, parsedData.length)} of {parsedData.length} records)
                </span>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {parsedData.length} Valid Row(s)
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden text-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Year</TableHead>
                      <TableHead>Strand</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Diff.</TableHead>
                      <TableHead>Command</TableHead>
                      <TableHead className="w-[40%]">Question</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.myp_year || 'Year 4'}</TableCell>
                        <TableCell>{row.strand || 'Algebra'}</TableCell>
                        <TableCell>{row.topic}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {row.difficulty || 'medium'}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.command_term || 'Solve'}</TableCell>
                        <TableCell className="truncate max-w-[280px]">
                          {row.question_text}
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
            disabled={parsedData.length === 0 || importing || parsing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${parsedData.length} Question(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
