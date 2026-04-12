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

interface PracticeSet {
  id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: string;
  is_published: boolean;
  is_archived: boolean;
  created_at: string;
  question_count: number;
  sub_question_count: number;
  total_marks: number;
}

const AdminTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<PracticeSet[]>([]);
  const [filteredTests, setFilteredTests] = useState<PracticeSet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchTests();
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
      const { data: sets, error } = await supabase
        .from('practice_sets')
        .select('*')
        .eq('is_archived', showArchived)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch question/sub-question counts
      const enriched: PracticeSet[] = await Promise.all(
        (sets || []).map(async (ps: any) => {
          const { data: qs } = await supabase
            .from('practice_questions')
            .select('id')
            .eq('practice_set_id', ps.id);
          
          const qIds = (qs || []).map((q: any) => q.id);
          let subCount = 0;
          let totalMarks = 0;
          
          if (qIds.length > 0) {
            const { data: sqs } = await supabase
              .from('practice_sub_questions')
              .select('id, marks')
              .in('question_id', qIds);
            subCount = sqs?.length || 0;
            totalMarks = (sqs || []).reduce((s: number, sq: any) => s + (sq.marks || 0), 0);
          }

          return {
            id: ps.id,
            title: ps.title,
            subject: ps.subject,
            topic: ps.topic,
            difficulty: ps.difficulty,
            is_published: ps.is_published,
            is_archived: ps.is_archived,
            created_at: ps.created_at,
            question_count: qs?.length || 0,
            sub_question_count: subCount,
            total_marks: totalMarks,
          };
        })
      );

      setTests(enriched);
    } catch (error) {
      console.error('Error fetching practice sets:', error);
      toast.error('Failed to fetch practice sets');
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('practice_sets').update({ is_published: !currentStatus }).eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Practice set ${!currentStatus ? 'published' : 'set to draft'}`);
    fetchTests();
  };

  const handleArchive = async (id: string, currentlyArchived: boolean) => {
    const { error } = await supabase.from('practice_sets')
      .update({ is_archived: !currentlyArchived, is_published: false })
      .eq('id', id);
    if (error) { toast.error('Archive failed'); return; }
    toast.success(currentlyArchived ? 'Restored from archive' : 'Archived successfully');
    fetchTests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this practice set permanently? This will also delete all questions.')) return;
    const { error } = await supabase.from('practice_sets').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Deleted successfully');
    fetchTests();
  };

  const handleDeleteSelected = async () => {
    if (selectedTests.length === 0) return;
    if (!confirm(`Delete ${selectedTests.length} practice set(s)?`)) return;
    const { error } = await supabase.from('practice_sets').delete().in('id', selectedTests);
    if (error) { toast.error('Bulk delete failed'); return; }
    toast.success(`${selectedTests.length} deleted`);
    setSelectedTests([]);
    fetchTests();
  };

  const publishAll = async () => {
    const draftIds = tests.filter(t => !t.is_published).map(t => t.id);
    if (draftIds.length === 0) return;
    const { error } = await supabase.from('practice_sets').update({ is_published: true }).in('id', draftIds);
    if (error) { toast.error('Failed to publish all'); return; }
    toast.success('All practice sets published');
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
    subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' ');

  const getDifficultyBadge = (d: string) => {
    if (d === 'easy') return 'bg-green-100 text-green-700';
    if (d === 'hard') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <AdminSidebar activeTab="tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading practice sets...</div>
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
                  {showArchived ? 'Archived Practice Sets' : 'Practice Sets'}
                </h1>
                <p className="text-gray-600 mt-1">
                  Create and manage practice sets with sub-questions and interactive answer types
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
                  Create Practice Set
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
                    <p className="text-sm font-medium text-gray-600">Total Practice Sets</p>
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
                <p className="text-lg text-gray-600">No practice sets found</p>
                <p className="text-sm text-gray-500 mt-2">Create a new practice set to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map(test => (
                <Card key={test.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedTests.includes(test.id)}
                          onCheckedChange={checked => {
                            if (checked) setSelectedTests([...selectedTests, test.id]);
                            else setSelectedTests(selectedTests.filter(id => id !== test.id));
                          }}
                        />
                        <Badge className={`text-xs capitalize ${getDifficultyBadge(test.difficulty)}`}>
                          {test.difficulty}
                        </Badge>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getSubjectColor(test.subject)}`} />
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{test.title || 'Untitled'}</h3>
                      <p className="text-sm text-gray-600">{formatSubjectName(test.subject)} · {test.topic}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge
                        variant={test.is_published ? "default" : "secondary"}
                        className={`rounded-full px-3 py-1 text-xs cursor-pointer ${
                          test.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                        onClick={() => togglePublished(test.id, test.is_published)}
                      >
                        {test.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 pb-4 border-b border-gray-100">
                      <span>{test.sub_question_count} sub-questions</span>
                      <span>{test.total_marks} marks</span>
                    </div>

                    <div className="flex gap-2">
                      {!test.is_archived && (
                        <Button onClick={() => navigate(`/admin/practice/edit/${test.id}`)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
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
