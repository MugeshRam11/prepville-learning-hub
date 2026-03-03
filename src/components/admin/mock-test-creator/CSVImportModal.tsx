import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { genId, createSubQuestion } from './types';
import type { CreatorSection, CreatorQuestionGroup, CreatorSubQuestion } from './types';
import type { AnswerBlockType } from '../AnswerBlockTypeSelector';

interface CSVImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (sections: CreatorSection[]) => void;
}

const TYPE_MAP: Record<string, AnswerBlockType> = {
  'mcq': 'multiple_choice',
  'multiple_choice': 'multiple_choice',
  'text': 'text_equation',
  'numeric': 'text_equation',
  'equation': 'text_equation',
  'graph': 'graph_plot',
  'drag_drop': 'drag_drop',
  'image_drop': 'image_drop',
  'table': 'text_equation',
  'smart_math': 'smart_math',
  'arrange': 'arrange_order',
};

const CSVImportModal: React.FC<CSVImportModalProps> = ({ open, onClose, onImport }) => {
  const [preview, setPreview] = useState<CreatorSection[] | null>(null);
  const [fileName, setFileName] = useState('');

  const parseCSV = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          if (rows.length === 0) {
            toast.error('No data found in CSV');
            return;
          }

          // Group by Section → Q No → Part
          const sectionMap = new Map<string, Map<string, { stem: string; parts: any[] }>>();

          rows.forEach((row) => {
            const sectionTitle = (row['Section'] || row['section'] || 'Part A').trim();
            const qNo = (row['Q No'] || row['q_no'] || row['Question'] || '1').trim();
            const part = (row['Part'] || row['part'] || '').trim().toLowerCase();
            const type = (row['Type'] || row['type'] || 'text').trim().toLowerCase();
            const question = (row['Question Text'] || row['question'] || row['Question'] || '').trim();
            const optA = (row['Option A'] || row['option_a'] || '').trim();
            const optB = (row['Option B'] || row['option_b'] || '').trim();
            const optC = (row['Option C'] || row['option_c'] || '').trim();
            const optD = (row['Option D'] || row['option_d'] || '').trim();
            const correct = (row['Correct'] || row['correct'] || row['Answer'] || '').trim();
            const marks = parseInt(row['Marks'] || row['marks'] || '1') || 1;

            if (!sectionMap.has(sectionTitle)) sectionMap.set(sectionTitle, new Map());
            const qMap = sectionMap.get(sectionTitle)!;
            if (!qMap.has(qNo)) qMap.set(qNo, { stem: '', parts: [] });
            const qGroup = qMap.get(qNo)!;

            if (!part) {
              // No part = main question without sub-parts
              qGroup.stem = question;
              qGroup.parts.push({ label: '', type, question, optA, optB, optC, optD, correct, marks });
            } else {
              if (!qGroup.stem && qGroup.parts.length === 0) qGroup.stem = '';
              qGroup.parts.push({ label: part, type, question, optA, optB, optC, optD, correct, marks });
            }
          });

          // Convert to CreatorSection[]
          const sections: CreatorSection[] = [];
          let globalQNum = 1;

          sectionMap.forEach((qMap, sectionTitle) => {
            const section: CreatorSection = {
              id: genId(),
              title: sectionTitle,
              order: sections.length,
              questionGroups: [],
            };

            qMap.forEach((qData) => {
              const hasSubParts = qData.parts.some(p => p.label);
              const group: CreatorQuestionGroup = {
                id: genId(),
                number: globalQNum++,
                stem: hasSubParts ? (qData.stem || qData.parts[0]?.question || '') : (qData.parts[0]?.question || ''),
                stemImageUrl: '',
                marks: hasSubParts ? 0 : (qData.parts[0]?.marks || 1),
                difficulty: 'medium',
                commandTerm: '',
                category: '',
                diagramDescription: '',
                answerBlockType: TYPE_MAP[qData.parts[0]?.type] || 'text_equation',
                answerBlockConfig: {},
                answerKey: hasSubParts ? '' : (qData.parts[0]?.correct || ''),
                wordLimit: '',
                subQuestions: [],
              };

              if (hasSubParts) {
                group.subQuestions = qData.parts
                  .filter(p => p.label)
                  .map((p, idx) => ({
                    id: genId(),
                    label: p.label || String.fromCharCode(97 + idx),
                    text: p.question,
                    imageUrl: '',
                    marks: p.marks,
                    answerKey: p.correct,
                    wordLimit: '',
                    commandTerm: '',
                    answerBlockType: TYPE_MAP[p.type] || 'text_equation',
                    answerBlockConfig: {},
                  }));
              }

              section.questionGroups.push(group);
            });

            sections.push(section);
          });

          setPreview(sections);
          toast.success(`Parsed ${rows.length} rows into ${sections.length} sections`);
        } catch (err) {
          console.error('CSV parse error:', err);
          toast.error('Failed to parse CSV file');
        }
      },
      error: (err) => {
        toast.error(`CSV error: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      parseCSV(file);
    } else {
      toast.error('Please upload a CSV file');
    }
  }, [parseCSV]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCSV(file);
  }, [parseCSV]);

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setPreview(null); setFileName(''); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import from CSV / Google Sheet
          </DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: Section, Q No, Part, Type, Question Text, Option A–D, Correct, Marks
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed rounded-xl p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag & drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .csv files exported from Google Sheets
            </p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex gap-2">
                {preview.map(s => (
                  <Badge key={s.id} variant="secondary" className="text-xs">
                    {s.title}: {s.questionGroups.length} Q
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preview summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm max-h-60 overflow-y-auto">
              {preview.map(s => (
                <div key={s.id}>
                  <p className="font-bold">{s.title}</p>
                  {s.questionGroups.map(q => (
                    <p key={q.id} className="ml-4 text-muted-foreground">
                      Q{q.number}: {q.stem?.substring(0, 60) || '(empty)'}...
                      {q.subQuestions.length > 0 && ` [${q.subQuestions.length} parts]`}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setPreview(null); setFileName(''); }}>
                Re-upload
              </Button>
              <Button onClick={() => { onImport(preview); onClose(); setPreview(null); setFileName(''); }}>
                Import {preview.reduce((t, s) => t + s.questionGroups.length, 0)} Questions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportModal;
