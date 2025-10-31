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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BookOpen,
  CheckCircle,
  Circle,
  HelpCircle,
  Upload,
  X,
  FileText,
  PenTool
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QuestionUploadCard from './QuestionUploadCard';

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
  const [uploading, setUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
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
    setUploadedImageUrl('');
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `question-images/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('study-materials')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('study-materials')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      setFormData(prev => ({ ...prev, question_image_url: publicUrl }));
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      uploadImage(file);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImageUrl('');
    setFormData(prev => ({ ...prev, question_image_url: '' }));
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
    setUploadedImageUrl(question.question_image_url || '');
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
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg text-muted-foreground">Loading questions...</div>
    </div>;
  }

  const publishedCount = questions.filter(q => q.is_published).length;
  const unpublishedCount = questions.filter(q => !q.is_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Subject Questions Management</h2>
          <p className="text-gray-600 mt-1">Create and manage subject-specific questions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="ai-upload" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  AI Document Parser
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 mt-4">
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
                <Label>Question Image (optional)</Label>
                <div className="space-y-3">
                  {/* Upload Section */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload Image'}
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      Max 5MB, JPG/PNG/GIF
                    </span>
                  </div>
                  
                  {/* URL Input as Alternative */}
                  <div className="relative">
                    <Input
                      placeholder="Or paste image URL here..."
                      value={formData.question_image_url}
                      onChange={(e) => setFormData({...formData, question_image_url: e.target.value})}
                    />
                  </div>
                  
                  {/* Preview uploaded image */}
                  {(uploadedImageUrl || formData.question_image_url) && (
                    <div className="relative">
                      <img 
                        src={uploadedImageUrl || formData.question_image_url} 
                        alt="Question preview" 
                        className="max-w-full h-32 object-contain border rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeUploadedImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
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
              </TabsContent>

              <TabsContent value="ai-upload" className="mt-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">AI Document Parser</h3>
                    <p className="text-sm text-blue-700">
                      Upload documents (PDF, Word, CSV, Images) and let AI extract questions automatically.
                      Supports text extraction, OCR, and image recognition.
                    </p>
                  </div>
                  
                  <QuestionUploadCard 
                    mode="quick" 
                    onSuccess={(data) => {
                      fetchQuestions();
                      setIsDialogOpen(false);
                    }} 
                  />
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published Questions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{publishedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unpublished Questions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{unpublishedCount}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Circle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{questions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Questions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-300"
              />
            </div>
            
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="bg-gray-50 border-gray-300">
                <SelectValue placeholder="All Subjects" />
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
              <SelectTrigger className="bg-gray-50 border-gray-300">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="bg-gray-50 border-gray-300">
                <SelectValue placeholder="All Difficulties" />
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

      {/* Questions Grid */}
      {filteredQuestions.length === 0 ? (
        <Card className="bg-white border border-gray-200">
          <CardContent className="py-16 text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">No questions found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or create a new question</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestions.map((question) => (
            <Card key={question.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
              <CardContent className="p-6">
                {/* Header with icon and badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-primary" />
                    </div>
                    <Badge 
                      variant={question.is_published ? "default" : "secondary"}
                      className={question.is_published ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}
                    >
                      {question.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                    {question.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {question.question_text}
                  </p>
                </div>

                {/* Image Preview */}
                {question.question_image_url && (
                  <div className="mb-4">
                    <img 
                      src={question.question_image_url} 
                      alt="Question" 
                      className="w-full h-32 object-cover border rounded-lg"
                    />
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-white border-gray-300 capitalize">
                    {question.subject.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-white border-gray-300">
                    {question.level}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal bg-white border-gray-300">
                    {question.topic}
                  </Badge>
                </div>

                {/* Difficulty Badge */}
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <Badge className={getDifficultyColor(question.difficulty)}>
                    {question.difficulty}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(question)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-300 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => togglePublished(question.id, question.is_published)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-300 hover:bg-gray-50"
                  >
                    {question.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    onClick={() => deleteQuestion(question.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectQuestionManager;