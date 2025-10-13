import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Filter, CheckCircle } from 'lucide-react';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_image_url?: string;
  has_sub_questions: boolean;
  marks: number;
  answer_key?: string;
  word_limit?: number;
  difficulty: string;
  category?: string;
  subject: string;
  topic: string;
  sub_questions?: any[];
}

interface QuestionBankSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectQuestions: (questions: any[]) => void;
  currentSubject?: string;
  currentTopic?: string;
}

const QuestionBankSelector = ({ 
  open, 
  onClose, 
  onSelectQuestions,
  currentSubject,
  currentTopic 
}: QuestionBankSelectorProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(currentSubject || 'all');
  const [topicFilter, setTopicFilter] = useState(currentTopic || 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [topics, setTopics] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchQuestions();
    }
  }, [open]);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, subjectFilter, topicFilter, categoryFilter]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data: questionsData, error } = await supabase
        .from('mock_test_question_bank')
        .select(`
          *,
          sub_questions:mock_test_sub_question_bank(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuestions(questionsData || []);

      // Extract unique topics and categories
      const uniqueTopics = [...new Set(questionsData?.map(q => q.topic) || [])];
      const uniqueCategories = [...new Set(questionsData?.map(q => q.category).filter(Boolean) || [])];
      
      setTopics(uniqueTopics);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to fetch questions from bank');
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(q => q.subject === subjectFilter);
    }

    if (topicFilter !== 'all') {
      filtered = filtered.filter(q => q.topic === topicFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(q => q.category === categoryFilter);
    }

    setFilteredQuestions(filtered);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const handleConfirm = () => {
    const selected = questions.filter(q => selectedIds.has(q.id));
    
    // Transform to match the expected format
    const transformed = selected.map((q, index) => ({
      id: Date.now() + index,
      question_number: index + 1,
      question_text: q.question_text,
      question_image_url: q.question_image_url || '',
      has_sub_questions: q.has_sub_questions,
      marks: q.marks,
      answer_key: q.answer_key || '',
      word_limit: q.word_limit?.toString() || '',
      difficulty: q.difficulty,
      category: q.category || '',
      sub_questions: q.sub_questions?.map((sq: any) => ({
        id: Date.now() + Math.random(),
        sub_question_label: sq.sub_question_label,
        sub_question_text: sq.sub_question_text,
        sub_question_image_url: sq.sub_question_image_url || '',
        marks: sq.marks,
        answer_key: sq.answer_key || '',
        word_limit: sq.word_limit?.toString() || ''
      })) || []
    }));

    onSelectQuestions(transformed);
    onClose();
    toast.success(`${selected.length} question(s) loaded from bank`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Load Questions from Bank</DialogTitle>
          <DialogDescription>
            Select questions from your persistent question bank to add to this mock test
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
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

            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedIds.size === filteredQuestions.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} of {filteredQuestions.length} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {questions.length} total questions in bank
              </Badge>
              <Button 
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                size="sm"
              >
                Load Selected Questions ({selectedIds.size})
              </Button>
            </div>
          </div>

          {/* Questions List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No questions found</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(question.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleSelection(question.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(question.id)}
                        onCheckedChange={() => toggleSelection(question.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium line-clamp-2">{question.question_text}</p>
                          {selectedIds.has(question.id) && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline">{question.subject}</Badge>
                          <Badge variant="secondary">{question.topic}</Badge>
                          {question.category && <Badge>{question.category}</Badge>}
                          <Badge variant="outline">{question.marks} mark(s)</Badge>
                          {question.has_sub_questions && (
                            <Badge variant="default">
                              {question.sub_questions?.length || 0} sub-questions
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
            >
              Load {selectedIds.size} Question(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionBankSelector;
