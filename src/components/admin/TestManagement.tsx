import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import TestEditor from '@/components/admin/TestEditor';

const TestManagement = () => {
  const [tests, setTests] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('tests');
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTest, setEditingTest] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, typeFilter, difficultyFilter, activeTab]);

  const fetchData = async () => {
    try {
      // Fetch tests
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select(`
          *,
          topics (name)
        `)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      // Fetch topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('name');

      if (topicsError) throw topicsError;

      setTests(testsData || []);
      setTopics(topicsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch test data');
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = tests;

    // Filter by active tab first
    if (activeTab === 'quick') {
      filtered = filtered.filter(test => test.test_type === 'quick_test');
    } else if (activeTab === 'practice') {
      filtered = filtered.filter(test => test.test_type === 'topic_practice');
    } else if (activeTab === 'mock') {
      filtered = filtered.filter(test => test.test_type === 'mock_test');
    }

    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(test => test.test_type === typeFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(test => test.difficulty_level === difficultyFilter);
    }

    setFilteredTests(filtered);
  };

  const handleCreateTest = () => {
    setEditingTest(null);
    setShowEditor(true);
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    setShowEditor(true);
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast.success('Test deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Failed to delete test');
    }
  };

  const toggleTestStatus = async (testId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_active: !currentStatus })
        .eq('id', testId);

      if (error) throw error;

      toast.success(`Test ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      console.error('Error updating test status:', error);
      toast.error('Failed to update test status');
    }
  };

  const getTestTypeBadge = (type) => {
    const variants = {
      'quick_test': 'default',
      'topic_practice': 'secondary',
      'mock_test': 'destructive'
    };
    return variants[type] || 'outline';
  };

  const getDifficultyBadge = (difficulty) => {
    const variants = {
      'easy': 'secondary',
      'medium': 'default',
      'hard': 'destructive'
    };
    return variants[difficulty] || 'outline';
  };

  if (showEditor) {
    return (
      <TestEditor
        test={editingTest}
        topics={topics}
        onClose={() => setShowEditor(false)}
        onSave={() => {
          setShowEditor(false);
          fetchData();
        }}
      />
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading tests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Management</h1>
          <p className="text-gray-600">Create and manage practice tests</p>
        </div>
        <Button onClick={handleCreateTest}>
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="tests">All Tests</TabsTrigger>
          <TabsTrigger value="quick">Quick Tests</TabsTrigger>
          <TabsTrigger value="practice">Topic Practice</TabsTrigger>
          <TabsTrigger value="mock">Mock Tests</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="quick_test">Quick Test</SelectItem>
                    <SelectItem value="topic_practice">Topic Practice</SelectItem>
                    <SelectItem value="mock_test">Mock Test</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <div className="flex space-x-1">
                      <Badge variant={getTestTypeBadge(test.test_type)}>
                        {test.test_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={getDifficultyBadge(test.difficulty_level)}>
                      {test.difficulty_level}
                    </Badge>
                    <Badge variant={test.is_active ? 'default' : 'secondary'}>
                      {test.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {test.description || 'No description provided'}
                  </p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>Topic: {test.topics?.name || 'No topic'}</div>
                    <div>Questions: {test.total_questions || 0}</div>
                    <div>Time Limit: {test.time_limit_minutes || 0} minutes</div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditTest(test)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTest(test.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTestStatus(test.id, test.is_active)}
                    >
                      {test.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestManagement;
