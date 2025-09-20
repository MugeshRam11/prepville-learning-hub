
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MockExamSelect = () => {
  const navigate = useNavigate();
  const [mockTests, setMockTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTests();
  }, []);

  const fetchMockTests = async () => {
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMockTests(data || []);
      
      // Extract unique subjects
      const uniqueSubjects = [...new Set(data?.map(test => test.subject) || [])];
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching mock tests:', error);
      toast.error('Failed to load mock tests');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectLabel = (subject) => {
    const labels = {
      'mathematics': 'Mathematics',
      'science': 'Science', 
      'language_literature': 'Language & Literature',
      'social_studies': 'Social Studies',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology'
    };
    return labels[subject] || subject;
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    setSelectedTopic('');
    setSelectedTest(null);
    
    // Filter tests by subject to get available topics
    const subjectTests = mockTests.filter(test => test.subject === subject);
    const topics = [...new Set(subjectTests.map(test => test.topic))];
    setAvailableTopics(topics);
  };

  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
    
    // Find the test that matches subject and topic
    const matchingTest = mockTests.find(test => 
      test.subject === selectedSubject && test.topic === topic
    );
    setSelectedTest(matchingTest);
  };

  const handleStartTest = () => {
    if (selectedTest) {
      navigate('/mock-exams/start', { 
        state: { 
          testId: selectedTest.id,
          subject: getSubjectLabel(selectedTest.subject), 
          topic: selectedTest.topic,
          title: selectedTest.title
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
          <div className="text-lg">Loading mock tests...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-blue-50 to-slate-50">
        {/* Hero Section */}
        <section className="py-16">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-slate-800">
                Mock Exam Selection
              </h1>
              <p className="text-xl text-slate-600">
                Choose your subject and topic to begin your comprehensive mock examination experience.
              </p>
            </div>

            {/* Selection Card */}
            <div className="max-w-2xl mx-auto">
              <Card className="shadow-lg border-0">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl flex items-center justify-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    Select Your Mock Exam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Subject Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Subject *
                    </label>
                    <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Choose a subject" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {getSubjectLabel(subject)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Topic Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      Topic *
                    </label>
                    <Select 
                      value={selectedTopic} 
                      onValueChange={handleTopicChange}
                      disabled={!selectedSubject}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder={selectedSubject ? "Choose a topic" : "Select subject first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {availableTopics.map((topic) => (
                          <SelectItem key={topic} value={topic}>
                            {topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Exam Info */}
                  {selectedTest && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-medium">Exam Details</span>
                      </div>
                      <div className="text-sm text-blue-600 space-y-1">
                        <p>• Test: {selectedTest.title}</p>
                        <p>• Subject: {getSubjectLabel(selectedTest.subject)}</p>
                        <p>• Topic: {selectedTest.topic}</p>
                        <p>• Total Questions: {selectedTest.total_questions}</p>
                        <p>• No time limit - work at your own pace</p>
                        <p>• Auto-save every 30 seconds</p>
                      </div>
                    </div>
                  )}

                  {/* Start Button */}
                  <Button 
                    onClick={handleStartTest}
                    disabled={!selectedTest}
                    className="w-full h-12 text-lg font-medium"
                    size="lg"
                  >
                    Start Mock Test
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MockExamSelect;
