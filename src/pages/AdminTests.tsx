import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, FileText, Database, Edit, Trash2, CheckCircle2, Sparkles, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QuestionUploadCard from '@/components/admin/QuestionUploadCard';
const AdminTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAIUpload, setShowAIUpload] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  useEffect(() => {
    fetchTests();

    // Subscribe to realtime changes
    const channel = supabase.channel('admin_tests_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tests'
    }, () => {
      fetchTests();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, difficultyFilter]);
  const fetchTests = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('tests').select('*').eq('test_type', 'quick_test').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };
  const filterTests = () => {
    let filtered = tests;
    if (searchTerm) {
      filtered = filtered.filter(test => test.title.toLowerCase().includes(searchTerm.toLowerCase()) || test.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(test => test.difficulty_level === difficultyFilter);
    }
    setFilteredTests(filtered);
  };
  const handleDelete = async testId => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;
    try {
      const {
        error
      } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      toast.success('Test deleted successfully');
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
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
    if (!confirm(`Are you sure you want to delete ${selectedTests.length} test(s)? This action cannot be undone.`)) return;
    try {
      const {
        error
      } = await supabase.from('tests').delete().in('id', selectedTests);
      if (error) throw error;
      toast.success(`${selectedTests.length} test(s) deleted successfully`);
      setSelectedTests([]);
      fetchTests();
    } catch (error) {
      console.error('Error deleting tests:', error);
      toast.error('Failed to delete tests');
    }
  };
  const toggleActive = async (testId, currentStatus) => {
    try {
      const {
        error
      } = await supabase.from('tests').update({
        is_active: !currentStatus
      }).eq('id', testId);
      if (error) throw error;
      toast.success(`Test ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchTests();
    } catch (error) {
      console.error('Error updating test:', error);
      toast.error('Failed to update test');
    }
  };
  const activateAllTests = async () => {
    try {
      const {
        error
      } = await supabase.from('tests').update({
        is_active: true
      }).eq('is_active', false).eq('test_type', 'quick_test');
      if (error) throw error;
      toast.success('All tests activated successfully');
      fetchTests();
    } catch (error) {
      console.error('Error activating all tests:', error);
      toast.error('Failed to activate tests');
    }
  };
  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'easy': 'bg-green-500',
      'medium': 'bg-yellow-500',
      'hard': 'bg-red-500'
    };
    return colors[difficulty] || 'bg-primary';
  };
  if (loading) {
    return <div className="min-h-screen flex">
        <AdminSidebar activeTab="tests" onTabChange={() => {}} />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading tests...</div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar activeTab="tests" onTabChange={() => {}} />
      
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quick Tests Management</h1>
                <p className="text-gray-600 mt-1">Create and manage quick practice tests</p>
              </div>
              <div className="flex gap-3">
                {selectedTests.length > 0 && <Button onClick={handleDeleteSelected} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedTests.length})
                  </Button>}
                {tests.filter(t => !t.is_active).length > 0 && <Button onClick={activateAllTests} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Activate All ({tests.filter(t => !t.is_active).length})
                  </Button>}
                
                <Button onClick={() => navigate('/admin/quick-tests/create')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Test
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
                <Input placeholder="Search by title or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-300" />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-64 bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Filter by Difficulty" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* AI Upload Section */}
          {showAIUpload && <div className="mb-8">
              <QuestionUploadCard mode="quick" onSuccess={() => {
            toast.success('Test uploaded successfully!');
            setShowAIUpload(false);
            fetchTests();
          }} />
            </div>}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Tests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tests.filter(t => t.is_active).length}
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
                    <p className="text-sm font-medium text-gray-600">Inactive Tests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tests.filter(t => !t.is_active).length}
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
                    <p className="text-sm font-medium text-gray-600">Total Tests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{tests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tests Grid */}
          {filteredTests.length === 0 ? <Card className="bg-white border border-gray-200">
              <CardContent className="py-16 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">No tests found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search or create a new test</p>
              </CardContent>
            </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map(test => <Card key={test.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                  <CardContent className="p-6">
                    {/* Header with checkbox and badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedTests.includes(test.id)} onCheckedChange={checked => handleSelectTest(test.id, checked as boolean)} />
                        <Badge variant="secondary" className="text-xs font-medium bg-pink-100 text-pink-700">
                          Quick Test
                        </Badge>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getDifficultyColor(test.difficulty_level)}`} />
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {test.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{test.description || 'No description'}</p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-white border-gray-300">
                        {test.difficulty_level}
                      </Badge>
                      <Badge variant={test.is_active ? "default" : "secondary"} className={`rounded-full px-3 py-1 text-xs font-normal ${test.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {test.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{test.total_questions || 0} Questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{test.time_limit_minutes || 0} mins</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button onClick={() => toggleActive(test.id, test.is_active)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                        <Eye className="w-4 h-4 mr-1" />
                        {test.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button onClick={() => navigate(`/admin/question-builder?testId=${test.id}`)} variant="outline" size="sm" className="flex-1 border-gray-300 hover:bg-gray-50">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button onClick={() => handleDelete(test.id)} variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50">
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
export default AdminTests;