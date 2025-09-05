import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  BookOpen, 
  CheckCircle, 
  Circle, 
  Eye, 
  EyeOff, 
  Bookmark, 
  Play, 
  BarChart3,
  Trophy,
  Target
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  content: string;
  answerKey: string;
  isSolved: boolean;
  isBookmarked: boolean;
}

interface Video {
  id: string;
  title: string;
  topic: string;
  duration: string;
  thumbnail: string;
}

const mockQuestions: Question[] = [
  {
    id: '1',
    title: 'Linear Equations and Graphing',
    topic: 'Algebra',
    difficulty: 'Easy',
    content: 'Solve for x: 2x + 5 = 17',
    answerKey: 'x = 6. First, subtract 5 from both sides: 2x = 12. Then divide by 2: x = 6.',
    isSolved: true,
    isBookmarked: false
  },
  {
    id: '2',
    title: 'Quadratic Formula Application',
    topic: 'Algebra',
    difficulty: 'Medium',
    content: 'Find the roots of x² - 5x + 6 = 0 using the quadratic formula.',
    answerKey: 'x = 2 or x = 3. Using the quadratic formula: x = (5 ± √(25-24))/2 = (5 ± 1)/2.',
    isSolved: false,
    isBookmarked: true
  },
  {
    id: '3',
    title: 'Trigonometric Identities',
    topic: 'Trigonometry',
    difficulty: 'Hard',
    content: 'Prove that sin²θ + cos²θ = 1 for any angle θ.',
    answerKey: 'This is a fundamental trigonometric identity. It can be proven using the Pythagorean theorem on the unit circle.',
    isSolved: false,
    isBookmarked: false
  },
  {
    id: '4',
    title: 'Statistical Mean and Median',
    topic: 'Statistics',
    difficulty: 'Easy',
    content: 'Find the mean and median of the dataset: 4, 7, 9, 10, 15, 12, 8',
    answerKey: 'Mean = 9.29, Median = 9. Mean = (4+7+8+9+10+12+15)/7. For median, arrange in order and find middle value.',
    isSolved: true,
    isBookmarked: false
  }
];

const mockVideos: Video[] = [
  {
    id: '1',
    title: 'Introduction to Quadratic Functions',
    topic: 'Algebra',
    duration: '12:30',
    thumbnail: '/placeholder.svg'
  },
  {
    id: '2',
    title: 'Solving Trigonometric Equations',
    topic: 'Trigonometry',
    duration: '18:45',
    thumbnail: '/placeholder.svg'
  },
  {
    id: '3',
    title: 'Data Analysis and Interpretation',
    topic: 'Statistics',
    duration: '15:20',
    thumbnail: '/placeholder.svg'
  }
];

const SubjectLearning = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get subject details from URL params
  const subjectTitle = searchParams.get('title') || 'Mathematics';
  const subjectLevel = searchParams.get('level') || 'MYP';
  const totalQuestions = parseInt(searchParams.get('questions') || '1200');
  
  // State management
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{ [key: string]: boolean }>({});

  // Calculate progress
  const solvedQuestions = questions.filter(q => q.isSolved).length;
  const progressPercentage = Math.round((solvedQuestions / totalQuestions) * 100);

  // Get unique topics from questions
  const topics = useMemo(() => {
    const uniqueTopics = [...new Set(questions.map(q => q.topic))];
    return uniqueTopics.sort();
  }, [questions]);

  // Filter questions based on current tab and filters
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // Filter by tab
    if (activeTab === 'solved') {
      filtered = filtered.filter(q => q.isSolved);
    } else if (activeTab === 'unsolved') {
      filtered = filtered.filter(q => !q.isSolved);
    } else if (activeTab === 'bookmarked') {
      filtered = filtered.filter(q => q.isBookmarked);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by topic
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(q => q.topic === selectedTopic);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [questions, activeTab, searchQuery, selectedTopic, selectedDifficulty]);

  // Handle question actions
  const toggleSolved = (questionId: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, isSolved: !q.isSolved } : q
    ));
    toast({
      title: "Question Updated",
      description: "Question status has been updated successfully.",
    });
  };

  const toggleBookmark = (questionId: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, isBookmarked: !q.isBookmarked } : q
    ));
  };

  const handleAnswerSubmit = (questionId: string) => {
    setSubmittedAnswers(prev => ({
      ...prev,
      [questionId]: true
    }));
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: true
    }));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/subjects')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Subjects
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{subjectTitle}</h1>
                <p className="text-muted-foreground">Level: {subjectLevel}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {progressPercentage}% Complete
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{solvedQuestions} of {totalQuestions} questions completed</span>
              <span>{totalQuestions - solvedQuestions} remaining</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Questions</span>
                  <span className="font-semibold">{totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed</span>
                  <span className="font-semibold text-green-600">{solvedQuestions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Remaining</span>
                  <span className="font-semibold text-orange-600">{totalQuestions - solvedQuestions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Accuracy</span>
                  <span className="font-semibold">87%</span>
                </div>
              </CardContent>
            </Card>

            {/* Videos Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Related Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockVideos.map(video => (
                    <div key={video.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                        <Play className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{video.topic} • {video.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    First 10 Questions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Circle className="w-4 h-4" />
                    25 Questions Streak
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Circle className="w-4 h-4" />
                    Perfect Week
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Search & Filter Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {topics.map(topic => (
                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Questions Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Questions</TabsTrigger>
                <TabsTrigger value="solved">Solved ({questions.filter(q => q.isSolved).length})</TabsTrigger>
                <TabsTrigger value="unsolved">Unsolved ({questions.filter(q => !q.isSolved).length})</TabsTrigger>
                <TabsTrigger value="bookmarked">Bookmarked ({questions.filter(q => q.isBookmarked).length})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <div className="space-y-4">
                  {filteredQuestions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No questions found matching your criteria.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredQuestions.map(question => (
                      <Card key={question.id} className="hover:shadow-md transition-shadow">
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg flex items-center gap-3">
                                    {question.isSolved ? (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-muted-foreground" />
                                    )}
                                    {question.title}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">{question.topic}</Badge>
                                    <Badge className={getDifficultyColor(question.difficulty)}>
                                      {question.difficulty}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBookmark(question.id);
                                  }}
                                >
                                  <Bookmark className={`w-4 h-4 ${question.isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                                </Button>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="prose prose-sm max-w-none">
                                  <p>{question.content}</p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleAnswer(question.id)}
                                    className="flex items-center gap-2"
                                  >
                                    {showAnswers[question.id] ? (
                                      <>
                                        <EyeOff className="w-4 h-4" />
                                        Hide Answer
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4" />
                                        Show Answer
                                      </>
                                    )}
                                  </Button>
                                  
                                  <Button
                                    variant={question.isSolved ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleSolved(question.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <Target className="w-4 h-4" />
                                    {question.isSolved ? 'Mark as Unsolved' : 'Mark as Solved'}
                                  </Button>
                                </div>
                                
                                {showAnswers[question.id] && (
                                  <div className="mt-4 p-4 bg-muted rounded-lg">
                                    <h4 className="font-semibold mb-2">Answer:</h4>
                                    <p className="text-sm">{question.answerKey}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectLearning;