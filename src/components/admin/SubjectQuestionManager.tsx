import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BookOpen,
  CheckCircle,
  Circle,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubjectQuestion {
  id: string;
  title: string;
  question_text: string;
  question_image_url?: string;
  subject: string;
  topic: string;
  level: string;
  difficulty: string;
  answer_key: string;
  explanation?: string;
  hints?: string[];
  tags?: string[];
  is_published: boolean;
  created_at: string;
}

const SUBJECTS = [
  'mathematics',
  'physics', 
  'chemistry',
  'biology',
  'english',
  'history',
  'economics',
  'computer_science'
];

const LEVELS = ['MYP', 'IBDP', 'IGCSE', 'A-Level'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const SubjectQuestionManager = () => {
  const [questions, setQuestions] = useState<SubjectQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SubjectQuestion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    question_text: '',
    question_image_url: '',
    subject: '',
    topic: '',
    level: '',
    difficulty: '',
    answer_key: '',
    explanation: '',
    hints: '',
    tags: '',
    is_published: false
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      question_text: '',
      question_image_url: '',
      subject: '',
      topic: '',
      level: '',
      difficulty: '',
      answer_key: '',
      explanation: '',
      hints: '',
      tags: '',
      is_published: false
    });
    setEditingQuestion(null);
  };

  const handleSubmit = async () => {
    try {
      const questionData = {
        title: formData.title,
        question_text: formData.question_text,
        question_image_url: formData.question_image_url || null,
        subject: formData.subject as any,
        topic: formData.topic,
        level: formData.level,
        difficulty: formData.difficulty,
        answer_key: formData.answer_key,
        explanation: formData.explanation || null,
        hints: formData.hints ? formData.hints.split('\n').filter(Boolean) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        is_published: formData.is_published
      };

      let error;
      if (editingQuestion) {
        ({ error } = await supabase
          .from('subject_questions')
          .update(questionData)
          .eq('id', editingQuestion.id));
      } else {
        ({ error } = await supabase
          .from('subject_questions')
          .insert(questionData));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Question ${editingQuestion ? 'updated' : 'created'} successfully`,
      });

      resetForm();
      setIsDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingQuestion ? 'update' : 'create'} question`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (question: SubjectQuestion) => {
    setFormData({
      title: question.title,
      question_text: question.question_text,
      question_image_url: question.question_image_url || '',
      subject: question.subject,
      topic: question.topic,
      level: question.level,
      difficulty: question.difficulty,
      answer_key: question.answer_key,
      explanation: question.explanation || '',
      hints: question.hints ? question.hints.join('\n') : '',
      tags: question.tags ? question.tags.join(', ') : '',
      is_published: question.is_published
    });
    setEditingQuestion(question);
    setIsDialogOpen(true);
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subject_questions')
        .update({ is_published: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Question ${!currentStatus ? 'published' : 'unpublished'} successfully`,
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: "Failed to update question status",
        variant: "destructive",
      });
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subject_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         question.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         question.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || question.subject === filterSubject;
    const matchesLevel = filterLevel === 'all' || question.level === filterLevel;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
    
    return matchesSearch && matchesSubject && matchesLevel && matchesDifficulty;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subject Questions Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Question Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Question title"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    placeholder="Topic name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="question_text">Question Text</Label>
                <Textarea
                  id="question_text"
                  value={formData.question_text}
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  placeholder="Enter the question text..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="question_image_url">Question Image URL (optional)</Label>
                <Input
                  id="question_image_url"
                  value={formData.question_image_url}
                  onChange={(e) => setFormData({...formData, question_image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(difficulty => (
                        <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="answer_key">Answer Key</Label>
                <Textarea
                  id="answer_key"
                  value={formData.answer_key}
                  onChange={(e) => setFormData({...formData, answer_key: e.target.value})}
                  placeholder="Enter the correct answer and explanation..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="explanation">Detailed Explanation (optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  placeholder="Provide a detailed explanation of the solution..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="hints">Hints (optional, one per line)</Label>
                <Textarea
                  id="hints"
                  value={formData.hints}
                  onChange={(e) => setFormData({...formData, hints: e.target.value})}
                  placeholder="Hint 1&#10;Hint 2&#10;Hint 3"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({...formData, is_published: checked})}
                />
                <Label>Publish immediately</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingQuestion ? 'Update Question' : 'Create Question'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {SUBJECTS.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {DIFFICULTIES.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="grid gap-4">
        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No questions found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map(question => (
            <Card key={question.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <HelpCircle className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">{question.title}</h3>
                      <Badge variant={question.is_published ? "default" : "secondary"}>
                        {question.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-3 line-clamp-2">{question.question_text}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">{question.subject.replace('_', ' ')}</Badge>
                      <Badge variant="outline">{question.level}</Badge>
                      <Badge variant="outline">{question.topic}</Badge>
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                    </div>
                    
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {question.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(question.created_at).toLocaleDateString()}
                      {question.hints && question.hints.length > 0 && (
                        <span> • {question.hints.length} hints</span>
                      )}
                      {question.explanation && <span> • Has explanation</span>}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(question)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(question.id, question.is_published)}
                    >
                      {question.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQuestion(question.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SubjectQuestionManager;