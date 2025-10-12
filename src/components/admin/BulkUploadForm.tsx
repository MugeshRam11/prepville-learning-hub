import React, { useState, useMemo } from 'react';
import { Upload, CheckCircle2, Download, Search, ChevronDown, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Papa from 'papaparse';

interface ParsedQuestion {
  subject: string;
  topic: string;
  question: string;
  answer: string;
  a: string;
  b: string;
  c: string;
  d: string;
  level?: string;
  difficulty?: string;
}

interface UploadStats {
  parsing: boolean;
  syncing: boolean;
  completed: boolean;
  totalQuestions: number;
  syncedQuestions: number;
}

const BulkUploadForm = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    parsing: false,
    syncing: false,
    completed: false,
    totalQuestions: 0,
    syncedQuestions: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedQuestion, setSelectedQuestion] = useState<ParsedQuestion | null>(null);
  const { toast } = useToast();

  // Get unique subjects and topics
  const subjects = useMemo(() => 
    Array.from(new Set(parsedQuestions.map(q => q.subject))).sort(),
    [parsedQuestions]
  );

  const topics = useMemo(() => {
    if (selectedSubject === 'all') {
      return Array.from(new Set(parsedQuestions.map(q => q.topic))).sort();
    }
    return Array.from(new Set(
      parsedQuestions.filter(q => q.subject === selectedSubject).map(q => q.topic)
    )).sort();
  }, [parsedQuestions, selectedSubject]);

  // Filter questions based on search and filters
  const filteredQuestions = useMemo(() => {
    let filtered = parsedQuestions;

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(q => q.subject === selectedSubject);
    }

    if (selectedTopic !== 'all') {
      filtered = filtered.filter(q => q.topic === selectedTopic);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query) ||
        q.a?.toLowerCase().includes(query) ||
        q.b?.toLowerCase().includes(query) ||
        q.c?.toLowerCase().includes(query) ||
        q.d?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [parsedQuestions, searchQuery, selectedSubject, selectedTopic]);

  // Group questions by subject and topic
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Record<string, ParsedQuestion[]>> = {};
    
    filteredQuestions.forEach(q => {
      if (!groups[q.subject]) {
        groups[q.subject] = {};
      }
      if (!groups[q.subject][q.topic]) {
        groups[q.subject][q.topic] = [];
      }
      groups[q.subject][q.topic].push(q);
    });

    return groups;
  }, [filteredQuestions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      parseCSV(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      parseCSV(file);
    }
  };

  // Map common subject names to valid database enum values
  const mapSubjectToEnum = (subject: string): string | null => {
    const subjectMap: Record<string, string> = {
      'algebra': 'mathematics',
      'geometry': 'mathematics',
      'calculus': 'mathematics',
      'trigonometry': 'mathematics',
      'statistics': 'mathematics',
      'math': 'mathematics',
      'maths': 'mathematics',
      'bio': 'biology',
      'chem': 'chemistry',
      'phys': 'physics',
      'cs': 'computer_science',
      'computing': 'computer_science',
      'it': 'computer_science',
      'econ': 'economics'
    };

    const normalized = subject.toLowerCase().trim();
    
    // Check if it's already a valid subject
    const validSubjects = ['mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'economics', 'computer_science'];
    if (validSubjects.includes(normalized)) {
      return normalized;
    }
    
    // Try to map to valid subject
    return subjectMap[normalized] || null;
  };

  const parseCSV = async (file: File) => {
    setUploadStats(prev => ({ ...prev, parsing: true }));

    try {
      // Read with proper encoding
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(arrayBuffer);

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().trim(),
        complete: (results) => {
          const rawData = results.data as any[];
          
          // Validate required columns
          const firstRow = rawData[0] || {};
          const requiredColumns = ['subject', 'topic', 'question', 'answer', 'a', 'b', 'c', 'd'];
          const missingColumns = requiredColumns.filter(col => !(col in firstRow));

          if (missingColumns.length > 0) {
            throw new Error(
              `⚠️ Missing required columns: ${missingColumns.join(', ')}\n\nExpected format: subject | topic | question | answer | a | b | c | d`
            );
          }

          // Parse and clean questions
          const invalidSubjects: string[] = [];
          const questions: ParsedQuestion[] = rawData
            .map(row => {
              const originalSubject = String(row.subject || '').trim();
              const mappedSubject = mapSubjectToEnum(originalSubject);
              
              if (!mappedSubject && originalSubject) {
                invalidSubjects.push(originalSubject);
              }
              
              return {
                subject: mappedSubject || originalSubject,
                topic: String(row.topic || '').trim(),
                question: String(row.question || '').trim(),
                answer: String(row.answer || '').trim().toUpperCase(),
                a: String(row.a || '').trim(),
                b: String(row.b || '').trim(),
                c: String(row.c || '').trim(),
                d: String(row.d || '').trim(),
                level: row.level?.trim() || 'MYP',
                difficulty: row.difficulty?.trim() || 'medium'
              };
            })
            .filter(q => q.subject && q.topic && q.question && q.answer);

          if (invalidSubjects.length > 0) {
            const uniqueInvalid = Array.from(new Set(invalidSubjects));
            throw new Error(
              `⚠️ Invalid subjects found: ${uniqueInvalid.join(', ')}\n\nValid subjects: mathematics, physics, chemistry, biology, english, history, economics, computer_science\n\nNote: Common variations like "algebra", "geometry" are auto-mapped to "mathematics"`
            );
          }

          // Remove duplicates
          const uniqueQuestions = Array.from(
            new Map(questions.map(q => [`${q.subject}-${q.topic}-${q.question}`, q])).values()
          );

          setParsedQuestions(uniqueQuestions);
          setUploadStats(prev => ({ 
            ...prev, 
            parsing: false, 
            totalQuestions: uniqueQuestions.length 
          }));
          
          toast({
            title: "CSV Parsed Successfully",
            description: `${uniqueQuestions.length} questions loaded (${rawData.length - uniqueQuestions.length} duplicates removed)`,
          });
        },
        error: (error: Error) => {
          throw error;
        }
      });
    } catch (error) {
      console.error('CSV parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : 
        "⚠️ Error reading file. Please ensure the CSV is UTF-8 encoded and follows the format:\nsubject | topic | question | answer | a | b | c | d";
      
      toast({
        title: "Parse Error",
        description: errorMessage,
        variant: "destructive"
      });
      setUploadStats(prev => ({ ...prev, parsing: false }));
    }
  };

  const syncToDatabase = async () => {
    if (parsedQuestions.length === 0) return;
    
    setUploadStats(prev => ({ ...prev, syncing: true }));

    try {
      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        
        const questionData = {
          title: q.topic,
          question_text: q.question,
          subject: q.subject.toLowerCase() as any,
          level: q.level || 'MYP',
          topic: q.topic,
          difficulty: q.difficulty || 'medium',
          answer_key: q.answer,
          option_a: q.a,
          option_b: q.b,
          option_c: q.c,
          option_d: q.d,
          is_published: true
        };

        const { error } = await supabase
          .from('subject_questions')
          .insert([questionData]);

        if (error) {
          console.error('Database insert error:', error);
          throw new Error(error.message || 'Unknown database error');
        }

        setUploadStats(prev => ({ 
          ...prev, 
          syncedQuestions: i + 1 
        }));
      }

      setUploadStats(prev => ({ 
        ...prev, 
        syncing: false, 
        completed: true 
      }));

      toast({
        title: "✅ Sync Complete",
        description: `${parsedQuestions.length} questions synced to database`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setUploadStats(prev => ({ ...prev, syncing: false }));
    }
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filteredQuestions.map(q => ({
      subject: q.subject,
      topic: q.topic,
      question: q.question,
      answer: q.answer,
      a: q.a,
      b: q.b,
      c: q.c,
      d: q.d,
      level: q.level,
      difficulty: q.difficulty
    })));
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const getAnswerClass = (option: string, correctAnswer: string) => {
    return option === correctAnswer 
      ? 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-400' 
      : 'bg-muted border-border';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Required columns: <code className="text-xs bg-muted px-2 py-1 rounded">subject | topic | question | answer | a | b | c | d</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
              ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
              ${uploadedFile ? 'bg-primary/5 border-primary' : ''}
            `}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="flex flex-col items-center space-y-4">
                {uploadedFile ? (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-primary" />
                    <div>
                      <p className="font-semibold text-base">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(uploadedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-16 w-16 text-muted-foreground" />
                    <p className="font-medium text-muted-foreground">Drop CSV file here, or click to upload</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {uploadStats.parsing && (
            <div className="mt-4">
              <Progress value={50} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">Parsing CSV...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Display */}
      {parsedQuestions.length > 0 && (
        <>
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Questions ({filteredQuestions.length} of {parsedQuestions.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={exportCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Filtered
                  </Button>
                  {!uploadStats.completed && (
                    <Button 
                      onClick={syncToDatabase}
                      disabled={uploadStats.syncing}
                      size="sm"
                    >
                      {uploadStats.syncing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                          Syncing {uploadStats.syncedQuestions}/{uploadStats.totalQuestions}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Sync to Database
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedSubject} onValueChange={(val) => { setSelectedSubject(val); setSelectedTopic('all'); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(subj => (
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map(topic => (
                      <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {uploadStats.completed && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✅ Successfully synced {parsedQuestions.length} questions to database
                  </p>
                </div>
              )}

              {/* Grouped Questions */}
              <div className="space-y-4">
                {Object.keys(groupedQuestions).length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No questions match your filters</p>
                  </div>
                ) : (
                  Object.entries(groupedQuestions).map(([subject, topicGroups]) => (
                    <div key={subject} className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="default">{subject}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({Object.values(topicGroups).reduce((acc, qs) => acc + qs.length, 0)} questions)
                        </span>
                      </h3>
                      
                      {Object.entries(topicGroups).map(([topic, questions]) => {
                        const groupKey = `${subject}-${topic}`;
                        const isExpanded = expandedGroups.has(groupKey);
                        
                        return (
                          <Collapsible key={groupKey} open={isExpanded} onOpenChange={() => toggleGroup(groupKey)}>
                            <Card className="overflow-hidden">
                              <CollapsibleTrigger className="w-full">
                                <CardHeader className="cursor-pointer hover:bg-accent transition-colors py-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {isExpanded ? (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                      )}
                                      <CardTitle className="text-base">{topic}</CardTitle>
                                    </div>
                                    <Badge variant="secondary">{questions.length} questions</Badge>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent>
                                <CardContent className="pt-0 space-y-3">
                                  {questions.map((q, idx) => (
                                    <Card 
                                      key={idx} 
                                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                                      onClick={() => setSelectedQuestion(q)}
                                    >
                                      <div className="space-y-3">
                                        <p className="font-medium text-sm">{q.question}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className={`p-2 rounded border text-sm ${getAnswerClass('A', q.answer)}`}>
                                            <span className="font-semibold">A:</span> {q.a}
                                          </div>
                                          <div className={`p-2 rounded border text-sm ${getAnswerClass('B', q.answer)}`}>
                                            <span className="font-semibold">B:</span> {q.b}
                                          </div>
                                          <div className={`p-2 rounded border text-sm ${getAnswerClass('C', q.answer)}`}>
                                            <span className="font-semibold">C:</span> {q.c}
                                          </div>
                                          <div className={`p-2 rounded border text-sm ${getAnswerClass('D', q.answer)}`}>
                                            <span className="font-semibold">D:</span> {q.d}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            Answer: {q.answer}
                                          </Badge>
                                          {q.difficulty && (
                                            <Badge variant="outline" className="text-xs">
                                              {q.difficulty}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BulkUploadForm;