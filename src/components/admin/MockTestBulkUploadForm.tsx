import React, { useState, useMemo } from 'react';
import { Upload, CheckCircle2, Download, Search, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
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

interface ParsedMockQuestion {
  test_name: string;
  subject: string;
  section: string;
  question_number: number;
  question_text: string;
  correct_answer: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty?: string;
  time_limit?: number;
}

interface UploadStats {
  parsing: boolean;
  syncing: boolean;
  completed: boolean;
  totalQuestions: number;
  syncedQuestions: number;
}

const MockTestBulkUploadForm = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedMockQuestion[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    parsing: false,
    syncing: false,
    completed: false,
    totalQuestions: 0,
    syncedQuestions: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Get unique test names and subjects
  const testNames = useMemo(() => 
    Array.from(new Set(parsedQuestions.map(q => q.test_name))).sort(),
    [parsedQuestions]
  );

  const subjects = useMemo(() => {
    if (selectedTest === 'all') {
      return Array.from(new Set(parsedQuestions.map(q => q.subject))).sort();
    }
    return Array.from(new Set(
      parsedQuestions.filter(q => q.test_name === selectedTest).map(q => q.subject)
    )).sort();
  }, [parsedQuestions, selectedTest]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = parsedQuestions;

    if (selectedTest !== 'all') {
      filtered = filtered.filter(q => q.test_name === selectedTest);
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(q => q.subject === selectedSubject);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(query) ||
        q.test_name.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [parsedQuestions, searchQuery, selectedTest, selectedSubject]);

  // Group questions by test and subject
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Record<string, ParsedMockQuestion[]>> = {};
    
    filteredQuestions.forEach(q => {
      if (!groups[q.test_name]) {
        groups[q.test_name] = {};
      }
      if (!groups[q.test_name][q.subject]) {
        groups[q.test_name][q.subject] = [];
      }
      groups[q.test_name][q.subject].push(q);
    });

    return groups;
  }, [filteredQuestions]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      parseCSV(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      parseCSV(file);
    }
  };

  const parseCSV = async (file: File) => {
    setUploadStats(prev => ({ ...prev, parsing: true, completed: false }));

    // Subject mapping to database enum values
    const subjectMapping: Record<string, string> = {
      'math': 'mathematics',
      'mathematics': 'mathematics',
      'maths': 'mathematics',
      'physics': 'physics',
      'chemistry': 'chemistry',
      'biology': 'biology',
      'science': 'science',
      'social_studies': 'social_studies',
      'social studies': 'social_studies',
      'language_literature': 'language_literature',
      'language & literature': 'language_literature',
      'english': 'language_literature'
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const requiredColumns = ['test_name', 'subject', 'question_text', 'correct_answer', 'option_a', 'option_b', 'option_c', 'option_d'];
          const headers = Object.keys(results.data[0] || {});
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));

          if (missingColumns.length > 0) {
            toast({
              title: "Missing required columns",
              description: `Please include: ${missingColumns.join(', ')}`,
              variant: "destructive"
            });
            setUploadStats(prev => ({ ...prev, parsing: false }));
            return;
          }

          const questions = results.data.map((row: any, index: number) => ({
            test_name: row.test_name?.trim() || 'Unnamed Test',
            subject: subjectMapping[row.subject?.trim()?.toLowerCase() || 'science'] || 'science',
            section: row.section?.trim() || 'General',
            question_number: row.question_number ? parseInt(row.question_number) : index + 1,
            question_text: row.question_text?.trim() || '',
            correct_answer: row.correct_answer?.trim()?.toUpperCase() || 'A',
            option_a: row.option_a?.trim() || '',
            option_b: row.option_b?.trim() || '',
            option_c: row.option_c?.trim() || '',
            option_d: row.option_d?.trim() || '',
            difficulty: row.difficulty?.trim() || 'medium',
            time_limit: row.time_limit ? parseInt(row.time_limit) : 60
          })).filter(q => q.question_text);

          // Remove duplicates
          const uniqueQuestions = questions.filter((q, index, self) =>
            index === self.findIndex(t => 
              t.test_name === q.test_name && 
              t.question_text === q.question_text
            )
          );

          setParsedQuestions(uniqueQuestions);
          setUploadStats({
            parsing: false,
            syncing: false,
            completed: false,
            totalQuestions: uniqueQuestions.length,
            syncedQuestions: 0
          });

          toast({
            title: "CSV parsed successfully",
            description: `Found ${uniqueQuestions.length} unique questions`
          });
        } catch (error) {
          console.error('Parse error:', error);
          toast({
            title: "Parsing failed",
            description: "Error processing CSV file",
            variant: "destructive"
          });
          setUploadStats(prev => ({ ...prev, parsing: false }));
        }
      },
      error: (error) => {
        console.error('CSV error:', error);
        toast({
          title: "CSV parsing failed",
          description: error.message,
          variant: "destructive"
        });
        setUploadStats(prev => ({ ...prev, parsing: false }));
      }
    });
  };

  const syncToDatabase = async () => {
    setUploadStats(prev => ({ ...prev, syncing: true }));
    let synced = 0;

    try {
      // First, save questions to the persistent question bank
      const bankQuestions = parsedQuestions.map(q => ({
        question_number: q.question_number,
        question_text: q.question_text,
        has_sub_questions: false,
        marks: 1,
        answer_key: q.correct_answer,
        difficulty: (q.difficulty || 'medium') as any,
        category: q.section,
        subject: q.subject as any,
        topic: q.test_name,
        is_active: true
      }));

      // Save to question bank (ignore duplicates)
      const { error: bankError } = await supabase
        .from('mock_test_question_bank')
        .upsert(bankQuestions, { 
          onConflict: 'question_text',
          ignoreDuplicates: true 
        });

      if (bankError && bankError.code !== '23505') {
        console.error('Question bank save error:', bankError);
      }

      // Group questions by test to create/update mock tests
      const testGroups: Record<string, ParsedMockQuestion[]> = {};
      parsedQuestions.forEach(q => {
        if (!testGroups[q.test_name]) {
          testGroups[q.test_name] = [];
        }
        testGroups[q.test_name].push(q);
      });

      for (const [testName, questions] of Object.entries(testGroups)) {
        // Check if test exists
        const { data: existingTest } = await supabase
          .from('mock_tests')
          .select('id')
          .eq('title', testName)
          .single();

        let testId: string;

        if (existingTest) {
          testId = existingTest.id;
        } else {
          // Create new mock test - use first question's subject and section as defaults
          const firstQuestion = questions[0];
          const { data: newTest, error: testError } = await supabase
            .from('mock_tests')
            .insert({
              title: testName,
              subject: firstQuestion.subject as any,
              topic: firstQuestion.section || 'General',
              is_published: false
            })
            .select()
            .single();

          if (testError) throw testError;
          testId = newTest.id;
        }

        // Insert questions
        const questionsToInsert = questions.map(q => ({
          mock_test_id: testId,
          subject: q.subject,
          section: q.section,
          question_number: q.question_number,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d
        }));

        const { error: questionsError } = await supabase
          .from('mock_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;

        synced += questions.length;
        setUploadStats(prev => ({ ...prev, syncedQuestions: synced }));
      }

      setUploadStats(prev => ({ ...prev, syncing: false, completed: true }));
      toast({
        title: "Sync completed",
        description: `Successfully synced ${synced} questions to database`
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive"
      });
      setUploadStats(prev => ({ ...prev, syncing: false }));
    }
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filteredQuestions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock-test-export-${Date.now()}.csv`;
    a.click();
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Mock Test CSV
          </CardTitle>
          <CardDescription>
            Drag and drop or click to upload a CSV file with mock test questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            {!uploadedFile ? (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <Button asChild>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    Select CSV File
                  </label>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                <div>
                  <p className="text-lg font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedQuestions.length} questions parsed
                  </p>
                </div>
                {uploadStats.parsing && (
                  <div className="space-y-2">
                    <Progress value={50} className="w-full" />
                    <p className="text-sm text-muted-foreground">Parsing CSV...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {uploadStats.syncing && (
            <div className="mt-4 space-y-2">
              <Progress 
                value={(uploadStats.syncedQuestions / uploadStats.totalQuestions) * 100} 
                className="w-full" 
              />
              <p className="text-sm text-muted-foreground text-center">
                Syncing: {uploadStats.syncedQuestions} / {uploadStats.totalQuestions} questions
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Preview */}
      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parsed Mock Test Questions</CardTitle>
                <CardDescription>
                  Review and filter questions before syncing to database
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  onClick={syncToDatabase}
                  disabled={uploadStats.syncing || uploadStats.completed}
                  size="sm"
                >
                  {uploadStats.completed ? 'Synced' : 'Sync to Database'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tests</SelectItem>
                  {testNames.map(test => (
                    <SelectItem key={test} value={test}>{test}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {Object.entries(groupedQuestions).map(([testName, subjects]) => (
                <div key={testName} className="border rounded-lg">
                  <div className="bg-muted/50 p-4 font-medium flex items-center justify-between">
                    <span>{testName}</span>
                    <Badge variant="secondary">
                      {Object.values(subjects).flat().length} questions
                    </Badge>
                  </div>
                  
                  {Object.entries(subjects).map(([subject, questions]) => {
                    const groupKey = `${testName}-${subject}`;
                    const isExpanded = expandedGroups.has(groupKey);
                    
                    return (
                      <Collapsible key={groupKey} open={isExpanded} onOpenChange={() => toggleGroup(groupKey)}>
                        <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30 flex items-center justify-between border-t">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium">{subject}</span>
                          </div>
                          <Badge>{questions.length} questions</Badge>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="space-y-2 p-4 bg-background">
                            {questions.map((q, idx) => (
                              <div key={idx} className="border rounded p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium">Q{q.question_number}: {q.question_text}</p>
                                  <Badge variant="outline">{q.difficulty}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className={q.correct_answer === 'A' ? 'text-success font-medium' : ''}>
                                    A) {q.option_a}
                                  </div>
                                  <div className={q.correct_answer === 'B' ? 'text-success font-medium' : ''}>
                                    B) {q.option_b}
                                  </div>
                                  <div className={q.correct_answer === 'C' ? 'text-success font-medium' : ''}>
                                    C) {q.option_c}
                                  </div>
                                  <div className={q.correct_answer === 'D' ? 'text-success font-medium' : ''}>
                                    D) {q.option_d}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MockTestBulkUploadForm;
