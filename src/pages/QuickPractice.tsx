
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuizFilters from '@/components/quiz/QuizFilters';
import QuizGrid from '@/components/quiz/QuizGrid';

// Mock data for tests
const mockTests = [
  {
    id: 'speed-distance-time',
    title: 'Speed, Distance, Time',
    subject: 'Mathematics',
    topic: 'Number (Unit 1)',
    questions: 5,
    timeMinutes: 5,
    difficulty: 'Easy'
  },
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

        <QuizFilters
          searchTerm={searchTerm}
          selectedSubject={selectedSubject}
          selectedTopic={selectedTopic}
          onSearchChange={setSearchTerm}
          onSubjectChange={setSelectedSubject}
          onTopicChange={setSelectedTopic}
        />

        <QuizGrid
          tests={filteredTests}
          onStartTest={handleStartTest}
        />
      </main>
      <Footer />
    </div>
  );
};

export default QuickPractice;
