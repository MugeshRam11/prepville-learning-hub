import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Search, FileText, Database, Eye, Edit, Trash2,
  CheckCircle2, Archive, ArchiveRestore
} from 'lucide-react';

const AdminTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [filteredTests, setFilteredTests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchTests();
    const channel = supabase.channel('admin_practice_tests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_tests' }, () => fetchTests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showArchived]);

  useEffect(() => {
    let filtered = tests;
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.topic.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(t => t.subject === subjectFilter);
    }
    setFilteredTests(filtered);
  }, [tests, searchTerm, subjectFilter]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('exam_type', 'PRACTICE' as any)
        .eq('is_archived', showArchived)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching practice tests:', error);
      toast.error('Failed to fetch practice tests');
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('mock_tests').update({ is_published: !currentStatus }).eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Practice question ${!currentStatus ? 'published' : 'set to draft'}`);
    fetchTests();
  };

  const publishAll = async () => {
    const { error } = await supabase.from('mock_tests')
      .update({ is_published: true })
      .eq('exam_type', 'PRACTICE' as any)
      .eq('is_published', false);
    if (error) { toast.error('Failed to publish all'); return; }
    toast.success('All practice questions published');
    fetchTests();
  };

  const handleArchive = async (id: string, currentlyArchived: boolean) => {
    const { error } = await supabase.from('mock_tests')
      .update({ is_archived: !currentlyArchived, is_published: false })
      .eq('id', id);
    if (error) { toast.error('Archive failed'); return; }
    toast.success(currentlyArchived ? 'Restored from archive' : 'Archived successfully');
    fetchTests();
  };

  const handleDelete = async (id: string) => {
    const { data: attempts } = await supabase.from('test_attempts').select('id').eq('test_id', id).limit(1);
    if (attempts && attempts.length > 0) {
      toast.error('Has student submissions — archive instead.', { duration: 5000 });
      return;
    }
    if (!confirm('Delete this practice question permanently?')) return;
    await supabase.from('exam_sessions').delete().eq('test_id', id);
    await supabase.from('admin_exam_actions').delete().eq('test_id', id);
    const { error } = await supabase.from('mock_tests').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Deleted successfully');
    fetchTests();
  };

  const handleDeleteSelected = async () => {
    if (selectedTests.length === 0) return;
    const { data: attemptTests } = await supabase.from('test_attempts').select('test_id').in('test_id', selectedTests);
    const blocked = new Set((attemptTests || []).map(a => a.test_id));
    const safe = selectedTests.filter(id => !blocked.has(id));
    if (safe.length === 0) { toast.error('All selected have submissions — archive instead.'); return; }
    if (!confirm(`Delete ${safe.length} practice question(s)?`)) return;
    await supabase.from('exam_sessions').delete().in('test_id', safe);
    await supabase.from('admin_exam_actions').delete().in('test_id', safe);
    const { error } = await supabase.from('mock_tests').delete().in('id', safe);
    if (error) { toast.error('Bulk delete failed'); return; }
    toast.success(`${safe.length} deleted${blocked.size > 0 ? `, ${blocked.size} skipped` : ''}`);
    setSelectedTests([]);
    fetchTests();
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTests(checked ? filteredTests.map(t => t.id) : []);
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      mathematics: 'bg-blue-500', physics: 'bg-red-500', chemistry: 'bg-teal-500',
      biology: 'bg-green-500', science: 'bg-emerald-500',
      language_literature: 'bg-purple-500', social_studies: 'bg-amber-500'
    };
    return colors[subject] || 'bg-primary';
  };

  const formatSubjectName = (subject: string) =>
    `MYP ${subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' ')}`;

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <AdminSidebar activeTab="tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading practice questions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab="tests" onTabChange={() => {}} />
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {showArchived ? 'Archived Practice Questions' : 'Practice Questions'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {showArchived ? 'View and restore archived practice questions' : 'Create and manage practice questions with sub-questions and interactive answer types'}
                </p>
              </div>
              <div className="flex gap-3">
                {selectedTests.length > 0 && (
                  <Button onClick={handleDeleteSelected} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedTests.length})
                  </Button>
                )}
                {tests.filter(t => !t.is_published).length > 0 && (
                  <Button onClick={publishAll} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Publish All ({tests.filter(t => !t.is_published).length})
                  </Button>
                )}
                <Button
                  onClick={() => { setShowArchived(!showArchived); setSelectedTests([]); }}
                  variant="outline"
                  className={showArchived ? "border-amber-600 text-amber-600 hover:bg-amber-50" : "border-gray-300 hover:bg-gray-50"}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {showArchived ? 'Show Active' : 'Show Archived'}
                </Button>
                <Button onClick={() => navigate('/admin/practice/create')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Practice Question
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={filteredTests.length > 0 && selectedTests.length === filteredTests.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by title or topic..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-300"
                />
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Published</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{tests.filter(t => t.is_published).length}</p>
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
                    <p className="text-sm font-medium text-gray-600">Drafts</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{tests.filter(t => !t.is_published).length}</p>
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
                    <p className="text-sm font-medium text-gray-600">Total Practice Questions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{tests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grid */}
          {filteredTests.length === 0 ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="py-16 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">No practice questions found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search or create a new practice question</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map(test => (
                <Card key={test.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedTests.includes(test.id)}
                          onCheckedChange={checked => {
                            if (checked) setSelectedTests([...selectedTests, test.id]);
                            else setSelectedTests(selectedTests.filter(id => id !== test.id));
                          }}
                        />
                        <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700">Practice</Badge>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(test.subject)}`} />
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{formatSubjectName(test.subject)}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{test.topic}</p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-white border-gray-300">
                        {test.topic}
                      </Badge>
                      <Badge
                        variant={test.is_published ? "default" : "secondary"}
                        className={`rounded-full px-3 py-1 text-xs font-normal cursor-pointer ${
                          test.is_published
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}
                        onClick={() => togglePublished(test.id, test.is_published)}
                      >
                        {test.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{test.total_questions || 0} Questions</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button onClick={() => navigate(`/admin/mock-tests/view/${test.id}`)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      {!test.is_archived && (
                        <Button onClick={() => navigate(`/admin/mock-tests/edit/${test.id}`)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      )}
                      <Button
                        onClick={() => handleArchive(test.id, test.is_archived)}
                        variant="outline" size="sm"
                        className={test.is_archived ? "border-green-300 text-green-600 hover:bg-green-50" : "border-amber-300 text-amber-600 hover:bg-amber-50"}
                        title={test.is_archived ? "Restore" : "Archive"}
                      >
                        {test.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => handleDelete(test.id)} variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTests;
