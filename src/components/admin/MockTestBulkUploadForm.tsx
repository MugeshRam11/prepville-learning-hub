import React, { useState, useMemo, useEffect } from 'react';
import { Upload, CheckCircle2, Download, Search, ChevronDown, ChevronRight, AlertCircle, Database, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import Papa from 'papaparse';
interface ParsedMockQuestion {
  subject: string;
  category: string;
  question_text: string;
  type: string;
  marks: number;
  question_image_url?: string;
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
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Question Bank states
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>('all');
  const [bankTopicFilter, setBankTopicFilter] = useState<string>('all');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('all');
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [loadingBank, setLoadingBank] = useState(false);
  const {
    toast
  } = useToast();

  // Load question bank on mount
  useEffect(() => {
    fetchQuestionBank();
  }, []);

  // Get unique subjects and categories
  const subjects = useMemo(() => Array.from(new Set(parsedQuestions.map(q => q.subject))).sort(), [parsedQuestions]);
  const categories = useMemo(() => {
    if (selectedSubject === 'all') {
      return Array.from(new Set(parsedQuestions.map(q => q.category))).sort();
    }
    return Array.from(new Set(parsedQuestions.filter(q => q.subject === selectedSubject).map(q => q.category))).sort();
  }, [parsedQuestions, selectedSubject]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = parsedQuestions;
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(q => q.subject === selectedSubject);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(query) || 
        q.category.toLowerCase().includes(query) || 
        q.subject.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [parsedQuestions, searchQuery, selectedSubject]);

  // Group questions by subject and category
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Record<string, ParsedMockQuestion[]>> = {};
    filteredQuestions.forEach(q => {
      if (!groups[q.subject]) {
        groups[q.subject] = {};
      }
      if (!groups[q.subject][q.category]) {
        groups[q.subject][q.category] = [];
      }
      groups[q.subject][q.category].push(q);
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
    setUploadStats(prev => ({
      ...prev,
      parsing: true,
      completed: false
    }));

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
      complete: results => {
        try {
          console.log('CSV Parse Results:', results);
          if (!results.data || results.data.length === 0) {
            toast({
              title: "Empty CSV file",
              description: "No data found in the CSV file",
              variant: "destructive"
            });
            setUploadStats(prev => ({
              ...prev,
              parsing: false
            }));
            return;
          }
          const requiredColumns = ['Subject', 'Category', 'Question', 'Type', 'Marks'];
          const headers = Object.keys(results.data[0] || {});
          console.log('CSV Headers:', headers);
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          if (missingColumns.length > 0) {
            toast({
              title: "Missing required columns",
              description: `Please include: ${missingColumns.join(', ')}`,
              variant: "destructive"
            });
            setUploadStats(prev => ({
              ...prev,
              parsing: false
            }));
            return;
          }
          const questions = results.data.map((row: any, index: number) => {
            const rawSubject = row.Subject?.trim() || 'Science';
            const question: ParsedMockQuestion = {
              subject: subjectMapping[rawSubject.toLowerCase()] || 'science',
              category: row.Category?.trim() || 'General',
              question_text: row.Question?.trim() || '',
              type: row.Type?.trim() || 'MCQ',
              marks: row.Marks ? parseInt(row.Marks) : 1,
              question_image_url: row.Image?.trim() || undefined
            };
            return question;
          }).filter(q => q.question_text && q.question_text.length > 0);
          console.log('Parsed questions before dedup:', questions.length);

          // Remove duplicates based on subject, category and question text
          const uniqueQuestions = questions.filter((q, index, self) => 
            index === self.findIndex(t => 
              t.subject === q.subject && 
              t.category === q.category && 
              t.question_text === q.question_text
            )
          );
          console.log('Unique questions:', uniqueQuestions.length);
          if (uniqueQuestions.length === 0) {
            toast({
              title: "No valid questions found",
              description: "Please check your CSV format and ensure Question column has values",
              variant: "destructive"
            });
            setUploadStats(prev => ({
              ...prev,
              parsing: false
            }));
            return;
          }
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
            description: error instanceof Error ? error.message : "Error processing CSV file",
            variant: "destructive"
          });
          setUploadStats(prev => ({
            ...prev,
            parsing: false
          }));
        }
      },
      error: error => {
        console.error('CSV error:', error);
        toast({
          title: "CSV parsing failed",
          description: error.message,
          variant: "destructive"
        });
        setUploadStats(prev => ({
          ...prev,
          parsing: false
        }));
      }
    });
  };
  const syncToDatabase = async () => {
    setUploadStats(prev => ({
      ...prev,
      syncing: true
    }));
    let synced = 0;
    try {
      // First, save questions to the persistent question bank
      const bankQuestions = parsedQuestions.map((q, index) => ({
        question_number: index + 1,
        question_text: q.question_text,
        has_sub_questions: false,
        marks: q.marks,
        answer_key: null,
        difficulty: 'medium' as any,
        category: q.category,
        subject: q.subject as any,
        topic: q.category,
        question_image_url: q.question_image_url,
        is_active: true
      }));

      // Save to question bank - check for duplicates manually
      for (const question of bankQuestions) {
        const { data: existing } = await supabase
          .from('mock_test_question_bank')
          .select('id')
          .eq('question_text', question.question_text)
          .eq('subject', question.subject)
          .eq('topic', question.topic)
          .single();
        
        if (!existing) {
          const { error: insertError } = await supabase
            .from('mock_test_question_bank')
            .insert(question);
          
          if (insertError) {
            console.error('Question bank insert error:', insertError);
          }
        }
      }

      // Group questions by subject and category to create/update mock tests
      const testGroups: Record<string, ParsedMockQuestion[]> = {};
      parsedQuestions.forEach(q => {
        const testKey = `${q.subject}-${q.category}`;
        if (!testGroups[testKey]) {
          testGroups[testKey] = [];
        }
        testGroups[testKey].push(q);
      });

      for (const [testKey, questions] of Object.entries(testGroups)) {
        const firstQuestion = questions[0];
        const testTitle = firstQuestion.category;
        
        // Check if test exists
        const {
          data: existingTest
        } = await supabase.from('mock_tests').select('id').eq('title', testTitle).eq('subject', firstQuestion.subject as any).single();
        
        let testId: string;
        if (existingTest) {
          testId = existingTest.id;
        } else {
          // Create new mock test
          const {
            data: newTest,
            error: testError
          } = await supabase.from('mock_tests').insert({
            title: testTitle,
            subject: firstQuestion.subject as any,
            topic: firstQuestion.category,
            is_published: false
          }).select().single();
          if (testError) throw testError;
          testId = newTest.id;
        }

        // Insert questions
        const questionsToInsert = questions.map((q, idx) => ({
          mock_test_id: testId,
          question_number: idx + 1,
          question_text: q.question_text,
          answer_key: null,
          category: q.type,
          difficulty: 'medium' as any,
          has_sub_questions: false,
          marks: q.marks,
          question_image_url: q.question_image_url,
          word_limit: q.type === 'Descriptive' ? 200 : undefined
        }));
        
        const {
          error: questionsError
        } = await supabase.from('mock_questions').insert(questionsToInsert);
        if (questionsError) throw questionsError;
        
        synced += questions.length;
        setUploadStats(prev => ({
          ...prev,
          syncedQuestions: synced
        }));
      }
      setUploadStats(prev => ({
        ...prev,
        syncing: false,
        completed: true
      }));
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
      setUploadStats(prev => ({
        ...prev,
        syncing: false
      }));
    }
  };
  const exportCSV = () => {
    const csv = Papa.unparse(filteredQuestions);
    const blob = new Blob([csv], {
      type: 'text/csv'
    });
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

  // Question Bank functions
  const fetchQuestionBank = async () => {
    setLoadingBank(true);
    try {
      const {
        data,
        error
      } = await supabase.from('mock_test_question_bank').select('*').eq('is_active', true).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setBankQuestions(data || []);
    } catch (error) {
      console.error('Error fetching question bank:', error);
      toast({
        title: "Failed to load question bank",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoadingBank(false);
    }
  };
  const filteredBankQuestions = useMemo(() => {
    let filtered = bankQuestions;
    if (bankSubjectFilter !== 'all') {
      filtered = filtered.filter(q => q.subject === bankSubjectFilter);
    }
    if (bankTopicFilter !== 'all') {
      filtered = filtered.filter(q => q.topic === bankTopicFilter);
    }
    if (bankCategoryFilter !== 'all') {
      filtered = filtered.filter(q => q.category === bankCategoryFilter);
    }
    if (bankSearchQuery.trim()) {
      const query = bankSearchQuery.toLowerCase();
      filtered = filtered.filter(q => q.question_text.toLowerCase().includes(query) || q.topic?.toLowerCase().includes(query) || q.subject?.toLowerCase().includes(query));
    }
    return filtered;
  }, [bankQuestions, bankSearchQuery, bankSubjectFilter, bankTopicFilter, bankCategoryFilter]);
  const bankTopics = useMemo(() => Array.from(new Set(bankQuestions.map(q => q.topic).filter(Boolean))).sort(), [bankQuestions]);
  const bankCategories = useMemo(() => Array.from(new Set(bankQuestions.map(q => q.category).filter(Boolean))).sort(), [bankQuestions]);
  const toggleBankSelection = (id: string) => {
    const newSelected = new Set(selectedBankIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBankIds(newSelected);
  };
  const loadSelectedFromBank = () => {
    const selected = bankQuestions.filter(q => selectedBankIds.has(q.id));

    // Convert bank questions to parsed format
    const converted: ParsedMockQuestion[] = selected.map(q => ({
      subject: q.subject,
      category: q.category || 'General',
      question_text: q.question_text,
      type: 'MCQ',
      marks: q.marks || 1,
      question_image_url: q.question_image_url
    }));
    setParsedQuestions(prev => [...prev, ...converted]);
    setSelectedBankIds(new Set());
    toast({
      title: "Questions loaded",
      description: `Added ${selected.length} question(s) from bank`
    });
  };
  return <div className="space-y-6">
      {/* Upload Section */}
      <Card className="shadow-md">
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
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}>
            {!uploadedFile ? <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-upload" />
                <Button asChild>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    Select CSV File
                  </label>
                </Button>
              </div> : <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                <div>
                  <p className="text-lg font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedQuestions.length} questions parsed
                  </p>
                </div>
                {uploadStats.parsing && <div className="space-y-2">
                    <Progress value={50} className="w-full" />
                    <p className="text-sm text-muted-foreground">Parsing CSV...</p>
                  </div>}
              </div>}
          </div>

          {uploadStats.syncing && <div className="mt-4 space-y-2">
              <Progress value={uploadStats.syncedQuestions / uploadStats.totalQuestions * 100} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Syncing: {uploadStats.syncedQuestions} / {uploadStats.totalQuestions} questions
              </p>
            </div>}
        </CardContent>
      </Card>

      {/* Question Bank Loader Section */}
      <Card className="shadow-md">
        <CardHeader>
          
          <CardDescription>
            Use existing saved questions from the persistent mock test bank
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search by subject, topic, or keyword..." value={bankSearchQuery} onChange={e => setBankSearchQuery(e.target.value)} className="pl-10" />
              </div>
              
              <Select value={bankSubjectFilter} onValueChange={setBankSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                  <SelectItem value="language_literature">Language & Literature</SelectItem>
                  <SelectItem value="social_studies">Social Studies</SelectItem>
                </SelectContent>
              </Select>

              <Select value={bankTopicFilter} onValueChange={setBankTopicFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {bankTopics.map(topic => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={bankCategoryFilter} onValueChange={setBankCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {bankCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Selection info and action button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedBankIds.size} of {filteredBankQuestions.length} selected
                {bankQuestions.length > 0 && <span className="ml-2">• {bankQuestions.length} total in bank</span>}
              </div>
              <Button onClick={loadSelectedFromBank} disabled={selectedBankIds.size === 0} size="sm">
                Load Selected Questions ({selectedBankIds.size})
              </Button>
            </div>

            {/* Scrollable Question List */}
            <ScrollArea className="h-[400px] border rounded-lg bg-card">
              {loadingBank ? <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading questions...</p>
                </div> : filteredBankQuestions.length === 0 ? <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No questions found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bankQuestions.length === 0 ? 'Upload CSV files to populate your question bank' : 'Try adjusting your filters'}
                  </p>
                </div> : <div className="p-4 space-y-2">
                  {filteredBankQuestions.map(question => <div key={question.id} className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedBankIds.has(question.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`} onClick={() => toggleBankSelection(question.id)}>
                      <div className="flex items-start gap-3">
                        <Checkbox checked={selectedBankIds.has(question.id)} onCheckedChange={() => toggleBankSelection(question.id)} onClick={e => e.stopPropagation()} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 mb-2">
                            {question.question_text}
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline" className="text-xs">
                              {question.subject}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {question.topic}
                            </Badge>
                            {question.category && <Badge className="text-xs">{question.category}</Badge>}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={e => {
                    e.stopPropagation();
                    toggleBankSelection(question.id);
                    if (!selectedBankIds.has(question.id)) {
                      const newSet = new Set(selectedBankIds);
                      newSet.add(question.id);
                      setSelectedBankIds(newSet);
                      setTimeout(() => loadSelectedFromBank(), 100);
                    }
                  }} className="flex-shrink-0">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Questions Preview */}
      {parsedQuestions.length > 0 && <Card>
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
                <Button onClick={syncToDatabase} disabled={uploadStats.syncing || uploadStats.completed} size="sm">
                  {uploadStats.completed ? 'Synced' : 'Sync to Database'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search questions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {Object.entries(groupedQuestions).map(([subject, categories]) => <div key={subject} className="border rounded-lg">
                  <div className="bg-muted/50 p-4 font-medium flex items-center justify-between">
                    <span className="capitalize">{subject}</span>
                    <Badge variant="secondary">
                      {Object.values(categories).flat().length} questions
                    </Badge>
                  </div>
                  
                  {Object.entries(categories).map(([category, questions]) => {
              const groupKey = `${subject}-${category}`;
              const isExpanded = expandedGroups.has(groupKey);
              return <Collapsible key={groupKey} open={isExpanded} onOpenChange={() => toggleGroup(groupKey)}>
                        <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30 flex items-center justify-between border-t">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium">{category}</span>
                          </div>
                          <Badge>{questions.length} questions</Badge>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="space-y-2 p-4 bg-background">
                            {questions.map((q, idx) => <div key={idx} className="border rounded p-3 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="font-medium flex-1">{q.question_text}</p>
                                  <div className="flex gap-2 items-center flex-shrink-0">
                                    <Badge variant="outline">{q.type}</Badge>
                                    <Badge variant="secondary">{q.marks} marks</Badge>
                                  </div>
                                </div>
                                {q.question_image_url && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <span className="text-xs">📎</span> {q.question_image_url}
                                  </div>
                                )}
                              </div>)}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>;
            })}
                </div>)}
            </div>
          </CardContent>
        </Card>}
    </div>;
};
export default MockTestBulkUploadForm;