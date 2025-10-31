import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Download, Database, Search, Filter, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type SubjectType = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'computer_science' | 'english' | 'history' | 'economics';

interface ParsedQuestion {
  subject: SubjectType;
  topic: string;
  level: string;
  difficulty: string;
  title: string;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  answer_key: string;
  explanation?: string;
  xp_reward?: number;
}

interface UploadStats {
  parsing: boolean;
  syncing: boolean;
  completed: boolean;
  total: number;
  processed: number;
}

const SubjectBulkUploadForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    parsing: false,
    syncing: false,
    completed: false,
    total: 0,
    processed: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Question bank state
  const [questionBank, setQuestionBank] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [bankSearchTerm, setBankSearchTerm] = useState('');

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(parsedQuestions.map(q => q.subject));
    return ['all', ...Array.from(subjects)];
  }, [parsedQuestions]);

  const uniqueTopics = useMemo(() => {
    const topics = new Set(parsedQuestions.map(q => q.topic));
    return ['all', ...Array.from(topics)];
  }, [parsedQuestions]);

  const filteredQuestions = useMemo(() => {
    return parsedQuestions.filter(q => {
      const matchesSearch = searchTerm === '' ||
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject === 'all' || q.subject === selectedSubject;
      const matchesTopic = selectedTopic === 'all' || q.topic === selectedTopic;
      return matchesSearch && matchesSubject && matchesTopic;
    });
  }, [parsedQuestions, searchTerm, selectedSubject, selectedTopic]);

  const groupedQuestions = useMemo(() => {
    const groups: Record<string, ParsedQuestion[]> = {};
    filteredQuestions.forEach(q => {
      const key = `${q.subject} - ${q.topic}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return groups;
  }, [filteredQuestions]);

  useEffect(() => {
    fetchQuestionBank();
  }, []);

  const fetchQuestionBank = async () => {
    setLoadingBank(true);
    try {
      const { data, error } = await supabase
        .from('subject_questions')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestionBank(data || []);
      toast.success(`Loaded ${data?.length || 0} questions from bank`);
    } catch (error: any) {
      console.error('Error fetching question bank:', error);
      toast.error('Failed to load question bank');
    } finally {
      setLoadingBank(false);
    }
  };

  const filteredBankQuestions = useMemo(() => {
    return questionBank.filter(q =>
      bankSearchTerm === '' ||
      q.question_text.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(bankSearchTerm.toLowerCase())
    );
  }, [questionBank, bankSearchTerm]);

  const toggleBankSelection = (id: string) => {
    const newSet = new Set(selectedBankIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBankIds(newSet);
  };

  const loadSelectedFromBank = () => {
    const selected = questionBank.filter(q => selectedBankIds.has(q.id));
    const formatted = selected.map(q => ({
      subject: q.subject as SubjectType,
      topic: q.topic,
      level: q.level,
      difficulty: q.difficulty,
      title: q.title,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      answer_key: q.answer_key,
      explanation: q.explanation,
      xp_reward: q.xp_reward || 10
    }));
    
    setParsedQuestions(prev => [...prev, ...formatted]);
    setSelectedBankIds(new Set());
    toast.success(`Loaded ${formatted.length} questions from bank`);
  };

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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      parseCSV(droppedFile);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setUploadStats({ parsing: true, syncing: false, completed: false, total: 0, processed: 0 });
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[];
          
          // Validate required columns
          const requiredColumns = ['subject', 'topic', 'level', 'difficulty', 'title', 'question_text', 'answer_key'];
          const firstRow = rows[0];
          const missingColumns = requiredColumns.filter(col => !(col in firstRow));
          
          if (missingColumns.length > 0) {
            toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
            setUploadStats({ parsing: false, syncing: false, completed: false, total: 0, processed: 0 });
            return;
          }

          // Map and clean data
          const questions: ParsedQuestion[] = rows.map(row => ({
            subject: (row.subject?.trim() || 'mathematics') as SubjectType,
            topic: row.topic?.trim() || '',
            level: row.level?.trim() || 'intermediate',
            difficulty: row.difficulty?.trim() || 'medium',
            title: row.title?.trim() || '',
            question_text: row.question_text?.trim() || '',
            option_a: row.option_a?.trim() || undefined,
            option_b: row.option_b?.trim() || undefined,
            option_c: row.option_c?.trim() || undefined,
            option_d: row.option_d?.trim() || undefined,
            answer_key: row.answer_key?.trim() || '',
            explanation: row.explanation?.trim() || undefined,
            xp_reward: parseInt(row.xp_reward) || 10
          })).filter(q => q.question_text && q.answer_key);

          // Remove duplicates based on question text
          const uniqueQuestions = questions.reduce((acc: ParsedQuestion[], current) => {
            const exists = acc.find(q => q.question_text === current.question_text);
            if (!exists) acc.push(current);
            return acc;
          }, []);

          setParsedQuestions(uniqueQuestions);
          setUploadStats({ 
            parsing: false, 
            syncing: false, 
            completed: true, 
            total: uniqueQuestions.length, 
            processed: uniqueQuestions.length 
          });
          
          toast.success(`Parsed ${uniqueQuestions.length} questions successfully!`);
        } catch (error) {
          console.error('Parse error:', error);
          toast.error('Failed to parse CSV file');
          setUploadStats({ parsing: false, syncing: false, completed: false, total: 0, processed: 0 });
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Failed to read CSV file');
        setUploadStats({ parsing: false, syncing: false, completed: false, total: 0, processed: 0 });
      }
    });
  };

  const syncToDatabase = async () => {
    if (parsedQuestions.length === 0) {
      toast.error('No questions to sync');
      return;
    }

    setUploadStats(prev => ({ ...prev, syncing: true, processed: 0 }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let processed = 0;
      const batchSize = 10;

      for (let i = 0; i < parsedQuestions.length; i += batchSize) {
        const batch = parsedQuestions.slice(i, i + batchSize);
        const insertData = batch.map(q => ({
          subject: q.subject,
          topic: q.topic,
          level: q.level,
          difficulty: q.difficulty,
          title: q.title,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          answer_key: q.answer_key,
          explanation: q.explanation,
          xp_reward: q.xp_reward || 10,
          is_published: true,
          created_by: user.id
        }));

        const { error } = await supabase
          .from('subject_questions')
          .insert(insertData);

        if (error) throw error;

        processed += batch.length;
        setUploadStats(prev => ({ ...prev, processed }));
      }

      toast.success(`Successfully synced ${processed} questions to database!`);
      setUploadStats(prev => ({ ...prev, syncing: false, completed: true }));
      
      // Refresh question bank
      fetchQuestionBank();
      
      // Clear parsed questions
      setParsedQuestions([]);
      setFile(null);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync: ${error.message}`);
      setUploadStats(prev => ({ ...prev, syncing: false }));
    }
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filteredQuestions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subject-questions-${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Question Bank Loader */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Load from Question Bank
          </CardTitle>
          <CardDescription>
            Browse and select existing questions from the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search question bank..."
                value={bankSearchTerm}
                onChange={(e) => setBankSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              onClick={fetchQuestionBank} 
              disabled={loadingBank}
              variant="outline"
            >
              {loadingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-4">
            {loadingBank ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBankQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No questions found</p>
            ) : (
              <div className="space-y-2">
                {filteredBankQuestions.map((q) => (
                  <div 
                    key={q.id} 
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleBankSelection(q.id)}
                  >
                    <Checkbox 
                      checked={selectedBankIds.has(q.id)}
                      onCheckedChange={() => toggleBankSelection(q.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{q.subject}</Badge>
                        <Badge variant="secondary">{q.topic}</Badge>
                        <Badge>{q.difficulty}</Badge>
                      </div>
                      <p className="text-sm font-medium">{q.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{q.question_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedBankIds.size} selected
            </span>
            <Button 
              onClick={loadSelectedFromBank}
              disabled={selectedBankIds.size === 0}
            >
              Load Selected ({selectedBankIds.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Upload a CSV file with subject questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Choose a CSV file</span> or drag and drop
              </Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-muted-foreground">
                CSV with columns: subject, topic, level, difficulty, title, question_text, answer_key, etc.
              </p>
            </div>
          </div>

          {uploadStats.parsing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Parsing CSV...</span>
                <span>{uploadStats.processed}/{uploadStats.total}</span>
              </div>
              <Progress value={(uploadStats.processed / uploadStats.total) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parsed Questions Preview */}
      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parsed Questions ({parsedQuestions.length})</CardTitle>
                <CardDescription>Review and sync to database</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  onClick={syncToDatabase} 
                  disabled={uploadStats.syncing}
                  size="sm"
                >
                  {uploadStats.syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing... ({uploadStats.processed}/{parsedQuestions.length})
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Sync to Database
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {uniqueSubjects.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>
                ))}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                {uniqueTopics.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Topics' : t}</option>
                ))}
              </select>
            </div>

            {/* Grouped Questions */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {Object.entries(groupedQuestions).map(([groupKey, questions]) => (
                  <Collapsible
                    key={groupKey}
                    open={expandedGroups[groupKey]}
                    onOpenChange={(open) => setExpandedGroups(prev => ({ ...prev, [groupKey]: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-accent/50 rounded-lg hover:bg-accent">
                      <div className="flex items-center gap-2">
                        {expandedGroups[groupKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium">{groupKey}</span>
                        <Badge variant="secondary">{questions.length}</Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {questions.map((q, idx) => (
                        <div key={idx} className="ml-6 p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge>{q.difficulty}</Badge>
                              <Badge variant="outline">{q.level}</Badge>
                            </div>
                          </div>
                          <p className="font-medium text-sm mb-2">{q.title}</p>
                          <p className="text-sm text-muted-foreground mb-2">{q.question_text}</p>
                          {q.option_a && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className={q.answer_key === 'A' ? 'text-green-600 font-medium' : ''}>A) {q.option_a}</div>
                              <div className={q.answer_key === 'B' ? 'text-green-600 font-medium' : ''}>B) {q.option_b}</div>
                              <div className={q.answer_key === 'C' ? 'text-green-600 font-medium' : ''}>C) {q.option_c}</div>
                              <div className={q.answer_key === 'D' ? 'text-green-600 font-medium' : ''}>D) {q.option_d}</div>
                            </div>
                          )}
                          {!q.option_a && (
                            <div className="text-xs text-green-600 font-medium">Answer: {q.answer_key}</div>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubjectBulkUploadForm;