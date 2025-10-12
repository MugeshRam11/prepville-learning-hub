import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Sparkles, BookOpen, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';

interface ParsedQuestion {
  subj: string;
  topic: string;
  qn: string;
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
  validating: boolean;
  syncing: boolean;
  completed: boolean;
  totalQuestions: number;
  syncedQuestions: number;
}

const BulkUploadForm = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    parsing: false,
    validating: false,
    syncing: false,
    completed: false,
    totalQuestions: 0,
    syncedQuestions: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const subjects = Array.from(new Set(parsedQuestions.map(q => q.subj)));

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

  const parseCSV = (file: File) => {
    setUploadStats(prev => ({ ...prev, parsing: true }));

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const questions = results.data as ParsedQuestion[];
        const validQuestions = questions.filter(q => 
          q.subj && q.topic && q.qn && q.answer && q.a && q.b && q.c && q.d
        );
        
        setParsedQuestions(validQuestions);
        setFilteredQuestions(validQuestions);
        setShowPreview(true);
        setUploadStats(prev => ({ 
          ...prev, 
          parsing: false, 
          totalQuestions: validQuestions.length 
        }));
        
        toast({
          title: "CSV Parsed",
          description: `${validQuestions.length} questions loaded successfully`,
        });
      },
      error: () => {
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file",
          variant: "destructive"
        });
        setUploadStats(prev => ({ ...prev, parsing: false }));
      }
    });
  };

  const syncToDatabase = async () => {
    if (parsedQuestions.length === 0) return;
    
    setUploadStats(prev => ({ ...prev, validating: true }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setUploadStats(prev => ({ ...prev, validating: false, syncing: true }));

    try {
      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        
        const questionData = {
          title: q.topic,
          question_text: q.qn,
          subject: q.subj.toLowerCase() as any,
          level: q.level || 'MYP',
          topic: q.topic,
          difficulty: q.difficulty || 'medium',
          answer_key: q.answer.toUpperCase(),
          is_published: true
        };

        const { error } = await supabase
          .from('subject_questions')
          .insert([questionData]);

        if (error) throw error;

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
      toast({
        title: "Sync Failed",
        description: "Failed to sync questions to database",
        variant: "destructive"
      });
      setUploadStats(prev => ({ ...prev, syncing: false }));
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterQuestions(query, selectedSubject);
  };

  const handleSubjectFilter = (subject: string) => {
    setSelectedSubject(subject);
    filterQuestions(searchQuery, subject);
  };

  const filterQuestions = (query: string, subject: string) => {
    let filtered = parsedQuestions;

    if (subject !== 'all') {
      filtered = filtered.filter(q => q.subj === subject);
    }

    if (query) {
      filtered = filtered.filter(q => 
        q.qn.toLowerCase().includes(query.toLowerCase()) ||
        q.topic.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredQuestions(filtered);
    setCurrentPage(0);
  };

  const exportCSV = () => {
    const csv = Papa.unparse(parsedQuestions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_export.csv';
    a.click();
  };

  const currentQuestion = filteredQuestions[currentPage];
  const nextQuestion = filteredQuestions[currentPage + 1];

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* LEFT PANEL: Upload & Preview */}
      <div className="space-y-6">
        {/* CSV Format Info */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              CSV Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="font-medium">Required columns: <code className="bg-muted px-2 py-1 rounded">subj,topic,qn,answer,a,b,c,d</code></p>
              <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                <div>Physics,Kinematics,"A car accelerates...",A,"6 m/s","3 m/s","2 m/s","9 m/s"</div>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>answer: A, B, C, or D</li>
                <li>Optional: level, difficulty</li>
                <li>UTF-8 encoding required</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Drop CSV file or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all
                ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                ${uploadedFile ? 'bg-primary/5' : ''}
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
                <div className="flex flex-col items-center space-y-3">
                  {uploadedFile ? (
                    <>
                      <CheckCircle2 className="h-12 w-12 text-primary" />
                      <div>
                        <p className="font-semibold">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="font-semibold">Drop CSV or click to upload</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        {showPreview && parsedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview ({filteredQuestions.length} questions)</CardTitle>
                <Button onClick={exportCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedSubject} onValueChange={handleSubjectFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(subj => (
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.slice(0, 10).map((q, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{q.subj}</TableCell>
                        <TableCell>{q.topic}</TableCell>
                        <TableCell className="max-w-xs truncate">{q.qn}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{q.answer}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredQuestions.length > 10 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Showing first 10 of {filteredQuestions.length} questions
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sync Button */}
        {parsedQuestions.length > 0 && !uploadStats.completed && (
          <Button 
            onClick={syncToDatabase}
            disabled={uploadStats.syncing || uploadStats.validating}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {uploadStats.syncing || uploadStats.validating ? (
              <>
                <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                Syncing {uploadStats.syncedQuestions}/{uploadStats.totalQuestions}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Sync {parsedQuestions.length} Questions to Database
              </>
            )}
          </Button>
        )}

        {uploadStats.completed && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Successfully synced {parsedQuestions.length} questions to portal
            </p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Book-Style Viewer */}
      <div className="space-y-6">
        {currentQuestion ? (
          <>
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Book Preview
                  </CardTitle>
                  <Badge variant="outline">
                    Page {currentPage + 1} of {filteredQuestions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Book Pages */}
                <div className="grid md:grid-cols-2 gap-4 perspective-1000">
                  {/* Left Page */}
                  <div className="bg-gradient-to-br from-background to-primary/5 rounded-2xl shadow-2xl p-8 border-2 border-primary/20 transform transition-all duration-500 hover:scale-[1.02]">
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <Badge className="bg-gradient-to-r from-primary to-accent">
                          {currentQuestion.subj}
                        </Badge>
                        <Badge variant="outline">{currentQuestion.topic}</Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-xl font-serif font-bold text-foreground leading-relaxed">
                          {currentQuestion.qn}
                        </h3>
                        
                        <div className="space-y-3 mt-6">
                          {['a', 'b', 'c', 'd'].map((option) => (
                            <div
                              key={option}
                              className={`
                                p-4 rounded-xl border-2 transition-all
                                ${currentQuestion.answer.toLowerCase() === option 
                                  ? 'bg-green-50 dark:bg-green-950/20 border-green-500 shadow-lg' 
                                  : 'bg-card border-border hover:border-primary/50'}
                              `}
                            >
                              <div className="flex items-start gap-3">
                                <span className="font-bold text-primary uppercase">
                                  {option.toUpperCase()}.
                                </span>
                                <span className="flex-1">
                                  {currentQuestion[option as keyof ParsedQuestion]}
                                </span>
                                {currentQuestion.answer.toLowerCase() === option && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Page */}
                  {nextQuestion && (
                    <div className="bg-gradient-to-br from-background to-accent/5 rounded-2xl shadow-2xl p-8 border-2 border-accent/20 transform transition-all duration-500 hover:scale-[1.02]">
                      <div className="space-y-6">
                        <div className="flex items-start justify-between">
                          <Badge className="bg-gradient-to-r from-primary to-accent">
                            {nextQuestion.subj}
                          </Badge>
                          <Badge variant="outline">{nextQuestion.topic}</Badge>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-xl font-serif font-bold text-foreground leading-relaxed">
                            {nextQuestion.qn}
                          </h3>
                          
                          <div className="space-y-3 mt-6">
                            {['a', 'b', 'c', 'd'].map((option) => (
                              <div
                                key={option}
                                className={`
                                  p-4 rounded-xl border-2 transition-all
                                  ${nextQuestion.answer.toLowerCase() === option 
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-500 shadow-lg' 
                                    : 'bg-card border-border hover:border-primary/50'}
                                `}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="font-bold text-primary uppercase">
                                    {option.toUpperCase()}.
                                  </span>
                                  <span className="flex-1">
                                    {nextQuestion[option as keyof ParsedQuestion]}
                                  </span>
                                  {nextQuestion.answer.toLowerCase() === option && (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 2))}
                    disabled={currentPage === 0}
                    variant="outline"
                    size="lg"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {currentPage + 1}-{Math.min(currentPage + 2, filteredQuestions.length)} of {filteredQuestions.length}
                    </span>
                  </div>

                  <Button
                    onClick={() => setCurrentPage(Math.min(filteredQuestions.length - 1, currentPage + 2))}
                    disabled={currentPage >= filteredQuestions.length - 1}
                    size="lg"
                  >
                    Next
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sync Progress */}
            {uploadStats.syncing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Syncing to database...</span>
                      <span className="text-muted-foreground">
                        {uploadStats.syncedQuestions}/{uploadStats.totalQuestions}
                      </span>
                    </div>
                    <Progress 
                      value={(uploadStats.syncedQuestions / uploadStats.totalQuestions) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="pt-12 pb-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Upload a CSV file to preview questions in book format
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BulkUploadForm;
