import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, FileText, Database, Upload, Eye, Edit, Trash2, CheckCircle2, Sparkles, ChevronDown, Archive, ArchiveRestore } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
const AdminMockTests = () => {
  const navigate = useNavigate();
  const [mockTests, setMockTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAIUpload, setShowAIUpload] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    fetchMockTests();

    // Subscribe to realtime changes on mock_tests table
    const mockTestsChannel = supabase.channel('admin_mock_tests_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'mock_tests'
    }, () => {
      console.log('[AdminMockTests] mock_tests changed, refetching...');
      fetchMockTests();
    }).subscribe();

    // Subscribe to mock_questions for accurate question counts
    const mockQuestionsChannel = supabase.channel('admin_mock_questions_sync').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'mock_questions'
    }, () => {
      console.log('[AdminMockTests] mock_questions changed, refetching...');
      fetchMockTests();
    }).subscribe();

    return () => {
      supabase.removeChannel(mockTestsChannel);
      supabase.removeChannel(mockQuestionsChannel);
    };
  }, [showArchived]);
  useEffect(() => {
    filterTests();
  }, [mockTests, searchTerm, subjectFilter]);
  const fetchMockTests = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('is_archived', showArchived)
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
  const filterTests = () => {
    let filtered = mockTests;
    if (searchTerm) {
      filtered = filtered.filter(test => test.title.toLowerCase().includes(searchTerm.toLowerCase()) || test.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(test => test.subject === subjectFilter);
    }
    setFilteredTests(filtered);
  };
  const handleDelete = async (testId: string) => {
    try {
      // Check if this test has any student attempts
      const { data: attempts, error: attemptCheckError } = await supabase
        .from('test_attempts')
        .select('id')
        .eq('test_id', testId)
        .limit(1);

      if (attemptCheckError) {
        toast.error(`Cannot check test usage: ${attemptCheckError.message}`);
        return;
      }

      if (attempts && attempts.length > 0) {
        toast.error(
          'This mock test has student submissions and cannot be deleted. Use "Archive" to hide it instead.',
          { duration: 6000 }
        );
        return;
      }

      if (!confirm('This mock test has no student submissions. Delete it permanently?')) return;

      // Safe to delete — remove child records in correct order
      const { error: sessErr } = await supabase.from('exam_sessions').delete().eq('test_id', testId);
      if (sessErr) {
        toast.error(`Failed to clean exam sessions: ${sessErr.message}`);
        return;
      }

      const { error: actErr } = await supabase.from('admin_exam_actions').delete().eq('test_id', testId);
      if (actErr) {
        toast.error(`Failed to clean admin actions: ${actErr.message}`);
        return;
      }

      // Delete the mock test (cascades to mock_questions → mock_sub_questions, mock_test_sections)
      const { error } = await supabase.from('mock_tests').delete().eq('id', testId);
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        return;
      }

      toast.success('Mock test deleted successfully');
      fetchMockTests();
    } catch (error: any) {
      console.error('Error deleting mock test:', error);
      toast.error(`Unexpected error: ${error?.message || 'Failed to delete mock test'}`);
    }
  };

  const handleArchive = async (testId: string, currentlyArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('mock_tests')
        .update({ is_archived: !currentlyArchived, is_published: false })
        .eq('id', testId);

      if (error) {
        toast.error(`Archive failed: ${error.message}`);
        return;
      }

      toast.success(currentlyArchived ? 'Mock test restored from archive' : 'Mock test archived successfully');
      fetchMockTests();
    } catch (error: any) {
      console.error('Error archiving mock test:', error);
      toast.error(`Unexpected error: ${error?.message || 'Failed to archive'}`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTests(filteredTests.map(test => test.id));
    } else {
      setSelectedTests([]);
    }
  };
  const handleSelectTest = (testId: string, checked: boolean) => {
    if (checked) {
      setSelectedTests([...selectedTests, testId]);
    } else {
      setSelectedTests(selectedTests.filter(id => id !== testId));
    }
  };
  const handleDeleteSelected = async () => {
    if (selectedTests.length === 0) return;

    const { data: attemptTests } = await supabase
      .from('test_attempts')
      .select('test_id')
      .in('test_id', selectedTests);

    const testsWithAttempts = new Set((attemptTests || []).map(a => a.test_id));
    const safeToDelete = selectedTests.filter(id => !testsWithAttempts.has(id));
    const blocked = selectedTests.filter(id => testsWithAttempts.has(id));

    if (blocked.length > 0 && safeToDelete.length === 0) {
      toast.error(`All ${blocked.length} selected test(s) have student submissions and cannot be deleted. Archive them instead.`, { duration: 6000 });
      return;
    }

    const msg = blocked.length > 0
      ? `${safeToDelete.length} test(s) can be deleted. ${blocked.length} test(s) have submissions and will be skipped. Continue?`
      : `Delete ${safeToDelete.length} mock test(s)? This cannot be undone.`;

    if (!confirm(msg)) return;

    try {
      await supabase.from('exam_sessions').delete().in('test_id', safeToDelete);
      await supabase.from('admin_exam_actions').delete().in('test_id', safeToDelete);

      const { error } = await supabase.from('mock_tests').delete().in('id', safeToDelete);
      if (error) {
        toast.error(`Bulk delete failed: ${error.message}`);
        return;
      }

      const message = blocked.length > 0
        ? `${safeToDelete.length} test(s) deleted. ${blocked.length} skipped (have submissions).`
        : `${safeToDelete.length} mock test(s) deleted successfully`;
      toast.success(message);
      setSelectedTests([]);
      fetchMockTests();
    } catch (error: any) {
      console.error('Error deleting mock tests:', error);
      toast.error(`Unexpected error: ${error?.message || 'Failed to delete mock tests'}`);
    }
  };
  const togglePublished = async (testId, currentStatus) => {
    try {
      const {
        error
      } = await supabase.from('mock_tests').update({
        is_published: !currentStatus
      }).eq('id', testId);
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
      const {
        error
      } = await supabase.from('mock_tests').update({
        is_published: true
      }).eq('is_published', false);
      if (error) throw error;
      toast.success('All tests published successfully');
      fetchMockTests();
    } catch (error) {
      console.error('Error publishing all tests:', error);
      toast.error('Failed to publish tests');
    }
  };
  const getSubjectColor = (subject: string) => {
    const colors = {
      'mathematics': 'bg-blue-500',
      'physics': 'bg-red-500',
      'chemistry': 'bg-teal-500',
      'biology': 'bg-green-500',
      'science': 'bg-emerald-500',
      'language_literature': 'bg-purple-500',
      'social_studies': 'bg-amber-500'
    };
    return colors[subject] || 'bg-primary';
  };
  const formatSubjectName = (subject: string) => {
    const formatted = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase().replace('_', ' ');
    return `MYP ${formatted}`;
  };
  if (loading) {
    return <div className="min-h-screen flex">
        <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading mock tests...</div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab="mock-tests" onTabChange={() => {}} />
      
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mock Tests Management</h1>
                <p className="text-gray-600 mt-1">Create and manage mock examination content</p>
              </div>
              <div className="flex gap-3">
                {selectedTests.length > 0 && <Button onClick={handleDeleteSelected} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedTests.length})
                  </Button>}
                {mockTests.filter(t => !t.is_published).length > 0 && <Button onClick={publishAllTests} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Publish All ({mockTests.filter(t => !t.is_published).length})
                  </Button>}
                
                <Button onClick={() => navigate('/admin/mock-tests/create')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Mock Test
                </Button>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Checkbox checked={filteredTests.length > 0 && selectedTests.length === filteredTests.length} onCheckedChange={handleSelectAll} />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Search by title or topic..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-300" />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-64 bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Filter by Subject" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* AI Upload Section */}
          {showAIUpload && <div className="mb-8">
              <QuestionUploadCard mode="mock" onSuccess={() => {
            toast.success('Mock test uploaded successfully!');
            setShowAIUpload(false);
            fetchMockTests();
          }} />
            </div>}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Published Tests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {mockTests.filter(t => t.is_published).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Draft Tests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {mockTests.filter(t => !t.is_published).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Mock Tests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{mockTests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mock Tests Grid */}
          {filteredTests.length === 0 ? <Card className="bg-white border border-gray-200">
              <CardContent className="py-16 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">No mock tests found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search or create a new mock test</p>
              </CardContent>
            </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map(test => <Card key={test.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                  <CardContent className="p-6">
                    {/* Header with checkbox and badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedTests.includes(test.id)} onCheckedChange={checked => handleSelectTest(test.id, checked as boolean)} />
                        <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700">
                          MYP
                        </Badge>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(test.subject)}`} />
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {formatSubjectName(test.subject)}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{test.topic}</p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-white border-gray-300">
                        {test.topic}
                      </Badge>
                      <Badge variant={test.is_published ? "default" : "secondary"} className={`rounded-full px-3 py-1 text-xs font-normal ${test.is_published ? 'bg-green-100 text-green-700 border-green-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                        {test.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{test.total_questions || 0} Questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">0 Videos</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button onClick={() => navigate(`/admin/mock-tests/view/${test.id}`)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {!test.is_archived && (
                        <Button onClick={() => navigate(`/admin/mock-tests/edit/${test.id}`)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      <Button
                        onClick={() => handleArchive(test.id, test.is_archived)}
                        variant="outline"
                        size="sm"
                        className={test.is_archived ? "border-green-300 text-green-600 hover:bg-green-50" : "border-amber-300 text-amber-600 hover:bg-amber-50"}
                        title={test.is_archived ? "Restore from archive" : "Archive this test"}
                      >
                        {test.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => handleDelete(test.id)} variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" title="Delete permanently">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </div>
      </div>
    </div>;
};
export default AdminMockTests;