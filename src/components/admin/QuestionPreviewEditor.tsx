import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, X, Edit2, Trash2, Save, ChevronDown, ChevronUp, AlertCircle, Image as ImageIcon, BarChart3 } from 'lucide-react';

interface SubQuestion {
  label: string;
  text: string;
  marks: number;
  answer?: string;
}

interface ParsedQuestion {
  question_number: number;
  question_text: string;
  question_image_url?: string | null;
  marks: number;
  has_sub_questions: boolean;
  has_diagram?: boolean;
  diagram_description?: string;
  sub_questions?: SubQuestion[];
  difficulty?: string;
  category?: string;
  correct_answer?: string;
}

interface QuestionPreviewEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ParsedQuestion[];
  metadata?: {
    title?: string;
    subject?: string;
    topic?: string;
  };
  onConfirm: (questions: ParsedQuestion[], metadata: any) => void;
  onCancel: () => void;
  mode: 'quick' | 'mock';
}

const QuestionPreviewEditor: React.FC<QuestionPreviewEditorProps> = ({
  open,
  onOpenChange,
  questions: initialQuestions,
  metadata: initialMetadata,
  onConfirm,
  onCancel,
  mode
}) => {
  const [questions, setQuestions] = useState<ParsedQuestion[]>(initialQuestions);
  const [metadata, setMetadata] = useState(initialMetadata || { title: '', subject: 'mathematics', topic: '' });
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set(initialQuestions.map((_, i) => i)));
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Sync state when props change
  React.useEffect(() => {
    setQuestions(initialQuestions);
    setSelectedQuestions(new Set(initialQuestions.map((_, i) => i)));
  }, [initialQuestions]);

  React.useEffect(() => {
    setMetadata(initialMetadata || { title: '', subject: 'mathematics', topic: '' });
  }, [initialMetadata]);

  const toggleQuestion = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateSubQuestion = (qIndex: number, sqIndex: number, field: keyof SubQuestion, value: any) => {
    const updated = [...questions];
    if (updated[qIndex].sub_questions) {
      updated[qIndex].sub_questions![sqIndex] = {
        ...updated[qIndex].sub_questions![sqIndex],
        [field]: value
      };
      setQuestions(updated);
    }
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    const newSelected = new Set<number>();
    selectedQuestions.forEach(i => {
      if (i < index) newSelected.add(i);
      else if (i > index) newSelected.add(i - 1);
    });
    setSelectedQuestions(newSelected);
  };

  const handleConfirm = () => {
    const selectedQs = questions
      .filter((_, i) => selectedQuestions.has(i))
      .map((q, i) => ({ ...q, question_number: i + 1 }));
    
    if (selectedQs.length === 0) {
      return;
    }
    
    onConfirm(selectedQs, metadata);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(questions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const validSubjects = ['mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            Review Extracted Questions ({selectedQuestions.size}/{questions.length} selected)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Metadata Section */}
          <Card className="flex-shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Test Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 py-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Title</label>
                <Input
                  value={metadata.title || ''}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Test title"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Subject</label>
                <Select
                  value={metadata.subject || 'mathematics'}
                  onValueChange={(v) => setMetadata({ ...metadata, subject: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {validSubjects.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Topic</label>
                <Input
                  value={metadata.topic || ''}
                  onChange={(e) => setMetadata({ ...metadata, topic: e.target.value })}
                  placeholder="Topic"
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selection Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
            {questions.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 ml-auto">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">No questions extracted</span>
              </div>
            )}
          </div>

          {/* Questions List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2 space-y-2">
              {questions.map((q, index) => (
                <Card
                  key={index}
                  className={`transition-all ${
                    selectedQuestions.has(index)
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border opacity-60'
                  }`}
                >
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedQuestions.has(index)}
                        onCheckedChange={() => toggleQuestion(index)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Q{q.question_number}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {q.marks} mark{q.marks !== 1 ? 's' : ''}
                          </Badge>
                          {q.difficulty && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                q.difficulty === 'easy' ? 'text-green-600' :
                                q.difficulty === 'hard' ? 'text-red-600' : 'text-amber-600'
                              }`}
                            >
                              {q.difficulty}
                            </Badge>
                          )}
                          {q.question_image_url && (
                            <Badge variant="outline" className="text-xs text-blue-600">
                              <ImageIcon className="w-3 h-3 mr-1" />
                              Image
                            </Badge>
                          )}
                          {q.has_diagram && (
                            <Badge variant="outline" className="text-xs text-purple-600">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Diagram
                            </Badge>
                          )}
                        </div>

                        {/* Diagram Description Inline */}
                        {q.has_diagram && q.diagram_description && (
                          <div className="mb-2 p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md">
                            <div className="flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                              <BarChart3 className="w-3 h-3" />
                              Diagram/Graph Description:
                            </div>
                            <p className="text-xs text-purple-600 dark:text-purple-400 whitespace-pre-wrap">
                              {q.diagram_description}
                            </p>
                          </div>
                        )}

                        {editingIndex === index ? (
                          <div className="space-y-2">
                            <Textarea
                              value={q.question_text}
                              onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                              className="text-sm min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={q.marks}
                                onChange={(e) => updateQuestion(index, 'marks', parseInt(e.target.value) || 1)}
                                className="w-20 h-8 text-sm"
                                placeholder="Marks"
                              />
                              <Select
                                value={q.difficulty || 'medium'}
                                onValueChange={(v) => updateQuestion(index, 'difficulty', v)}
                              >
                                <SelectTrigger className="w-28 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => setEditingIndex(null)}
                                className="h-8"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm line-clamp-2">{q.question_text}</p>
                        )}

                        {/* Sub-questions */}
                        {q.has_sub_questions && q.sub_questions && q.sub_questions.length > 0 && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(index)}
                              className="h-6 text-xs px-2"
                            >
                              {expandedQuestions.has(index) ? (
                                <ChevronUp className="w-3 h-3 mr-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 mr-1" />
                              )}
                              {q.sub_questions.length} sub-question(s)
                            </Button>

                            {expandedQuestions.has(index) && (
                              <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary/20 pl-3">
                                {q.sub_questions.map((sq, sqIndex) => (
                                  <div key={sqIndex} className="text-xs">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {sq.label}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        ({sq.marks} mark{sq.marks !== 1 ? 's' : ''})
                                      </span>
                                    </div>
                                    <p className="mt-1 text-muted-foreground">{sq.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteQuestion(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Image Preview */}
                    {q.question_image_url && expandedQuestions.has(index) && (
                      <div className="mt-3 ml-8">
                        <img
                          src={q.question_image_url}
                          alt={`Question ${q.question_number} image`}
                          className="max-w-xs max-h-40 rounded border object-contain"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No questions were extracted from the document.</p>
                  <p className="text-sm">Try uploading a clearer document or different format.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedQuestions.size === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionPreviewEditor;
