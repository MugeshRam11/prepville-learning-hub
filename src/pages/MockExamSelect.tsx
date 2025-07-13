
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Clock, FileText } from 'lucide-react';

const mockSubjects = {
  'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry', 'Graph Theory and Analysis', 'Graphs and Linear Equations'],
  'Science': ['Physics', 'Chemistry', 'Biology', 'Environmental Science'],
  'Language & Literature': ['Grammar', 'Composition', 'Literature Analysis', 'Creative Writing'],
  'Social Studies': ['History', 'Geography', 'Economics', 'Political Science'],
  'Computer Science': ['Programming', 'Data Structures', 'Algorithms', 'Database Systems']
};

const MockExamSelect = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  const handleSubjectChange = (subject: string) => {
    console.log('Subject selected:', subject);
    setSelectedSubject(subject);
    setSelectedTopic(''); // Reset topic when subject changes
  };

  const handleTopicChange = (topic: string) => {
    console.log('Topic selected:', topic);
    setSelectedTopic(topic);
  };

  const handleStartTest = () => {
    if (selectedSubject && selectedTopic) {
      navigate('/mock-exams/start', { 
        state: { subject: selectedSubject, topic: selectedTopic } 
      });
    }
  };

  const availableTopics = selectedSubject ? mockSubjects[selectedSubject as keyof typeof mockSubjects] || [] : [];
  console.log('Available topics:', availableTopics);
  console.log('Selected subject:', selectedSubject);

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
                        {Object.keys(mockSubjects).map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
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
                  {selectedSubject && selectedTopic && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-medium">Exam Details</span>
                      </div>
                      <div className="text-sm text-blue-600 space-y-1">
                        <p>• Subject: {selectedSubject}</p>
                        <p>• Topic: {selectedTopic}</p>
                        <p>• 8 comprehensive questions with sub-parts</p>
                        <p>• Mix of short and long-form answers</p>
                        <p>• No time limit - work at your own pace</p>
                        <p>• Auto-save every 30 seconds</p>
                      </div>
                    </div>
                  )}

                  {/* Start Button */}
                  <Button 
                    onClick={handleStartTest}
                    disabled={!selectedSubject || !selectedTopic}
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
