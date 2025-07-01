
import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock data for tests
const mockTests = [
  {
    id: 'algebra-basics',
    title: 'Algebra Basics',
    subject: 'Mathematics',
    topic: 'Algebra',
    questions: 8,
    timeMinutes: 6,
    difficulty: 'Easy'
  },
  {
    id: 'geometry-intro',
    title: 'Introduction to Geometry',
    subject: 'Mathematics',
    topic: 'Geometry',
    questions: 10,
    timeMinutes: 8,
    difficulty: 'Medium'
  },
  {
    id: 'physics-motion',
    title: 'Laws of Motion',
    subject: 'Physics',
    topic: 'Mechanics',
    questions: 7,
    timeMinutes: 5,
    difficulty: 'Medium'
  },
  {
    id: 'chemistry-atoms',
    title: 'Atomic Structure',
    subject: 'Chemistry',
    topic: 'Atoms & Molecules',
    questions: 9,
    timeMinutes: 7,
    difficulty: 'Hard'
  },
  {
    id: 'biology-cells',
    title: 'Cell Biology Fundamentals',
    subject: 'Biology',
    topic: 'Cell Biology',
    questions: 6,
    timeMinutes: 5,
    difficulty: 'Easy'
  },
  {
    id: 'calculus-limits',
    title: 'Limits and Continuity',
    subject: 'Mathematics',
    topic: 'Calculus',
    questions: 10,
    timeMinutes: 8,
    difficulty: 'Hard'
  }
];

const subjects = ['All Subjects', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];

const topicsBySubject = {
  'Mathematics': ['All Topics', 'Algebra', 'Geometry', 'Calculus', 'Statistics'],
  'Physics': ['All Topics', 'Mechanics', 'Thermodynamics', 'Electricity', 'Optics'],
  'Chemistry': ['All Topics', 'Atoms & Molecules', 'Chemical Reactions', 'Organic Chemistry'],
  'Biology': ['All Topics', 'Cell Biology', 'Evolution', 'Genetics', 'Ecology']
};

const QuickPractice = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const navigate = useNavigate();

  const filteredTests = mockTests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = selectedSubject === 'All Subjects' || test.subject === selectedSubject;
    const matchesToopic = selectedTopic === 'All Topics' || test.topic === selectedTopic;
    
    return matchesSearch && matchesSubject && matchesToopic;
  });

  const handleStartTest = (testId: string) => {
    navigate(`/quiz/${testId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Quick Practice Tests
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose from our collection of quick MCQ tests to practice specific topics and improve your skills.
              </p>
            </div>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="py-8 bg-white border-b">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tests by title, topic, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-4">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={selectedTopic} 
                  onValueChange={setSelectedTopic}
                  disabled={selectedSubject === 'All Subjects'}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSubject !== 'All Subjects' && 
                     topicsBySubject[selectedSubject as keyof typeof topicsBySubject]?.map(topic => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Test Cards Grid */}
        <section className="py-12">
          <div className="container">
            <div className="mb-6">
              <p className="text-muted-foreground">
                Showing {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => (
                <Card key={test.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-xs">
                        {test.subject}
                      </Badge>
                      <Badge className={`text-xs ${getDifficultyColor(test.difficulty)}`}>
                        {test.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{test.topic}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          {test.questions} Questions
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {test.timeMinutes} mins
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => handleStartTest(test.id)}
                      >
                        Start Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTests.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No tests found matching your criteria.
                </p>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter options.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default QuickPractice;
