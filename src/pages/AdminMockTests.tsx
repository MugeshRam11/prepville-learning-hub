
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, FileText, Database, Upload, Download, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import MockTestCard from '@/components/mock-exam/MockTestCard';

const AdminMockTests = () => {
  const navigate = useNavigate();
  const [mockTests, setMockTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const testsPerPage = 10;

  // Question Bank State
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankSubjectFilter, setBankSubjectFilter] = useState('all');
  const [bankTopicFilter, setBankTopicFilter] = useState('all');
  const [bankCategoryFilter, setBankCategoryFilter] = useState('all');
  const [selectedBankIds, setSelectedBankIds] = useState(new Set());
  const [loadingBank, setLoadingBank] = useState(false);
  const [syncedQuestions, setSyncedQuestions] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced

  useEffect(() => {
    fetchMockTests();
    fetchQuestionBank();
  }, []);

  useEffect(() => {
    filterTests();
  }, [mockTests, searchTerm, subjectFilter]);

  const fetchMockTests = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMockTests(data || []);
    } catch (error) {
      console.error('Error fetching mock tests:', error);
      toast.error('Failed to fetch mock tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionBank = async () => {
    setLoadingBank(true);
    try {
      const { data, error } = await supabase
        .from('mock_test_question_bank')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBankQuestions(data || []);
    } catch (error) {
      console.error('Error fetching question bank:', error);
      toast.error('Failed to fetch question bank');
    } finally {
      setLoadingBank(false);
    }
  };

  const filterTests = () => {
    let filtered = mockTests;

    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.topic.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(test => test.subject === subjectFilter);
    }

    setFilteredTests(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDelete = async (testId) => {
    if (!confirm('Are you sure you want to delete this mock test? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('mock_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast.success('Mock test deleted successfully');
      fetchMockTests();
    } catch (error) {
      console.error('Error deleting mock test:', error);
      toast.error('Failed to delete mock test');
    }
  };

  const togglePublished = async (testId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('mock_tests')
        .update({ is_published: !currentStatus })
        .eq('id', testId);

      if (error) throw error;

      toast.success(`Mock test ${!currentStatus ? 'published' : 'unpublished'} successfully`);
      fetchMockTests();
    } catch (error) {
      console.error('Error updating mock test:', error);
      toast.error('Failed to update mock test');
    }
  };

  const publishAllTests = async () => {
    try {
      const { error } = await supabase
        .from('mock_tests')
        .update({ is_published: true })
        .eq('is_published', false);

      if (error) throw error;

      toast.success('All tests published successfully');
      fetchMockTests();
    } catch (error) {
      console.error('Error publishing all tests:', error);
      toast.error('Failed to publish tests');
    }
  };

  const getSubjectLabel = (subject) => {
    const labels = {
      'mathematics': 'Mathematics',
      'science': 'Science',
      'language_literature': 'Language & Literature',
      'social_studies': 'Social Studies',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology'
    };
    return labels[subject] || subject;
  };

  // Question Bank Filtering
  const bankTopics = useMemo(() => {
    const topics = new Set(bankQuestions.map(q => q.topic));
    return Array.from(topics).filter(Boolean);
  }, [bankQuestions]);

  const bankCategories = useMemo(() => {
    const categories = new Set(bankQuestions.map(q => q.category));
    return Array.from(categories).filter(Boolean);
  }, [bankQuestions]);

  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter(q => {
      const matchesSearch = !bankSearchQuery || 
        q.question_text.toLowerCase().includes(bankSearchQuery.toLowerCase()) ||
        q.topic.toLowerCase().includes(bankSearchQuery.toLowerCase());
      
      const matchesSubject = bankSubjectFilter === 'all' || q.subject === bankSubjectFilter;
      const matchesTopic = bankTopicFilter === 'all' || q.topic === bankTopicFilter;
      const matchesCategory = bankCategoryFilter === 'all' || q.category === bankCategoryFilter;

      return matchesSearch && matchesSubject && matchesTopic && matchesCategory;
    });
  }, [bankQuestions, bankSearchQuery, bankSubjectFilter, bankTopicFilter, bankCategoryFilter]);

  const toggleBankSelection = (questionId) => {
    setSelectedBankIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const loadSelectedFromBank = () => {
    const selected = bankQuestions.filter(q => selectedBankIds.has(q.id));
    setSyncedQuestions(prev => [...prev, ...selected]);
    setSelectedBankIds(new Set());
    setShowQuestionBank(false);
    setSyncStatus('idle');
    toast.success(`Loaded ${selected.length} questions from bank`);
  };

  const syncToDatabase = async () => {
    if (syncedQuestions.length === 0) {
      toast.error('No questions to sync');
      return;
    }

    setSyncStatus('syncing');
    try {
      // Group by topic/test name
      const groupedByTopic = syncedQuestions.reduce((acc, q) => {
        if (!acc[q.topic]) acc[q.topic] = [];
        acc[q.topic].push(q);
        return acc;
      }, {});

      for (const [topic, questions] of Object.entries(groupedByTopic)) {
        const topicQuestions = questions as any[];
        // Create or find mock test
        const { data: existingTest } = await supabase
          .from('mock_tests')
          .select('id')
          .eq('topic', topic)
          .eq('subject', topicQuestions[0].subject)
          .single();

        let testId = existingTest?.id;

        if (!testId) {
          const { data: newTest, error: testError } = await supabase
            .from('mock_tests')
            .insert({
              title: `${getSubjectLabel(topicQuestions[0].subject)} - ${topic}`,
              subject: topicQuestions[0].subject,
              topic: topic,
              is_published: false,
              total_questions: topicQuestions.length
            })
            .select('id')
            .single();

          if (testError) throw testError;
          testId = newTest.id;
        }

        // Insert questions
        const questionsToInsert = topicQuestions.map(q => ({
          mock_test_id: testId,
          question_number: q.question_number,
          question_text: q.question_text,
          answer_key: q.answer_key,
          category: q.category,
          difficulty: q.difficulty,
          has_sub_questions: q.has_sub_questions || false,
          marks: q.marks || 1,
          question_image_url: q.question_image_url
        }));

        const { error: questionsError } = await supabase
          .from('mock_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      setSyncStatus('synced');
      toast.success('Questions synced to database successfully');
      fetchMockTests();
      
      setTimeout(() => {
        setSyncedQuestions([]);
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error syncing to database:', error);
      toast.error('Failed to sync questions');
      setSyncStatus('idle');
    }
  };

  const exportCSV = () => {
    if (syncedQuestions.length === 0) {
      toast.error('No questions to export');
      return;
    }

    const headers = ['subject', 'test_name', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
    const rows = syncedQuestions.map(q => [
      q.subject,
      q.topic,
      q.question_text,
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      q.answer_key
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock_questions_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  // Pagination logic
  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading mock tests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
      <div className="flex-1 ml-64 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Mock Tests Management</h1>
            <p className="text-muted-foreground">Create and manage mock examination content</p>
          </div>
          <div className="flex gap-2">
            {mockTests.filter(t => !t.is_published).length > 0 && (
              <Button 
                onClick={publishAllTests}
                variant="default"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Publish All Tests ({mockTests.filter(t => !t.is_published).length})
              </Button>
            )}
            <Button 
              onClick={() => setShowQuestionBank(!showQuestionBank)} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {showQuestionBank ? 'Hide' : 'Load from'} Question Bank
            </Button>
            <Button onClick={() => navigate('/admin/mock-test-bulk-upload')} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Bulk Upload CSV
            </Button>
            <Button onClick={() => navigate('/admin/mock-tests/create')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Mock Test
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mock Tests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockTests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published Tests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockTests.filter(t => t.is_published).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Tests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockTests.filter(t => !t.is_published).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Question Bank</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bankQuestions.length}</div>
              <p className="text-xs text-muted-foreground">Total questions</p>
            </CardContent>
          </Card>
        </div>

        {/* Load from Question Bank Section */}
        {showQuestionBank && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>📚 Load from Question Bank</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Use existing saved questions from the persistent mock test bank</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by subject, topic, or keyword..."
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={bankSubjectFilter} onValueChange={setBankSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bankTopicFilter} onValueChange={setBankTopicFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {bankTopics.map(topic => (
                      <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={bankCategoryFilter} onValueChange={setBankCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {bankCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Info */}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{selectedBankIds.size} of {filteredBankQuestions.length} selected</span>
                <Button 
                  onClick={loadSelectedFromBank}
                  disabled={selectedBankIds.size === 0}
                  className="flex items-center gap-2"
                >
                  Load Selected Questions ({selectedBankIds.size})
                </Button>
              </div>

              {/* Question List */}
              <ScrollArea className="h-[400px] rounded-md border">
                {loadingBank ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-muted-foreground">Loading questions...</p>
                  </div>
                ) : filteredBankQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center p-6">
                    <p className="text-muted-foreground mb-2">No questions found</p>
                    <p className="text-sm text-muted-foreground">Upload CSV files to populate your question bank</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {filteredBankQuestions.map(question => (
                      <div 
                        key={question.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedBankIds.has(question.id)}
                          onCheckedChange={() => toggleBankSelection(question.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2 mb-2">{question.question_text}</p>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{getSubjectLabel(question.subject)}</Badge>
                            <Badge variant="secondary" className="text-xs">{question.topic}</Badge>
                            {question.category && <Badge variant="default" className="text-xs">{question.category}</Badge>}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedBankIds(new Set([question.id]));
                            loadSelectedFromBank();
                          }}
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Synced Questions Display */}
        {syncedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Parsed Mock Test Questions
                    {syncStatus === 'synced' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {syncStatus === 'idle' && <XCircle className="w-5 h-5 text-orange-600" />}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Review and filter questions before syncing to database</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportCSV} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                  <Button 
                    onClick={syncToDatabase}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center gap-2"
                  >
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync to Database'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Group by topic */}
                {Object.entries(syncedQuestions.reduce((acc: Record<string, any[]>, q: any) => {
                  if (!acc[q.topic]) acc[q.topic] = [];
                  acc[q.topic].push(q);
                  return acc;
                }, {})).map(([topic, questions]) => {
                  const topicQuestions = questions as any[];
                  return (
                  <div key={topic} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{topic}</h3>
                      <Badge className="text-xs">{topicQuestions.length} questions</Badge>
                    </div>
                    <div className="space-y-2">
                      {topicQuestions.map((q, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted/50 rounded">
                          <p className="line-clamp-1">{q.question_text}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{getSubjectLabel(q.subject)}</Badge>
                            {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )})}

              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by title or topic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="language_literature">Language & Literature</SelectItem>
                  <SelectItem value="social_studies">Social Studies</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mock Tests by Category */}
        <div className="space-y-8">
          {Object.keys(filteredTests.reduce((acc: Record<string, any[]>, test: any) => {
            const category = test.topic || 'General';
            if (!acc[category]) acc[category] = [];
            acc[category].push(test);
            return acc;
          }, {})).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No mock tests found</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(filteredTests.reduce((acc: Record<string, any[]>, test: any) => {
              const category = test.topic || 'General';
              if (!acc[category]) acc[category] = [];
              acc[category].push(test);
              return acc;
            }, {})).map(([category, tests]) => {
              const categoryTests = tests as any[];
              return (
              <Card key={category} className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                      <CardTitle className="text-xl">{category}</CardTitle>
                      <Badge variant="secondary">{categoryTests.length} test{categoryTests.length !== 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTests.map((test) => (
                      <MockTestCard
                        key={test.id}
                        test={test}
                        onEdit={(id) => navigate(`/admin/mock-tests/edit/${id}`)}
                        onView={(id) => navigate(`/admin/mock-tests/view/${id}`)}
                        onDelete={handleDelete}
                        onTogglePublish={togglePublished}
                        isAdmin={true}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminMockTests;
