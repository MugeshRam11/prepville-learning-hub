
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface QuizFiltersProps {
  searchTerm: string;
  selectedSubject: string;
  selectedTopic: string;
  onSearchChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onTopicChange: (value: string) => void;
}

const subjects = ['All Subjects', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];

const topicsBySubject = {
  'Mathematics': ['All Topics', 'Algebra', 'Geometry', 'Calculus', 'Statistics'],
  'Physics': ['All Topics', 'Mechanics', 'Thermodynamics', 'Electricity', 'Optics'],
  'Chemistry': ['All Topics', 'Atoms & Molecules', 'Chemical Reactions', 'Organic Chemistry'],
  'Biology': ['All Topics', 'Cell Biology', 'Evolution', 'Genetics', 'Ecology']
};

const QuizFilters = ({
  searchTerm,
  selectedSubject,
  selectedTopic,
  onSearchChange,
  onSubjectChange,
  onTopicChange
}: QuizFiltersProps) => {
  return (
    <section className="py-8 bg-white border-b">
      <div className="container">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tests by title, topic, or subject..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-4">
            <Select value={selectedSubject} onValueChange={onSubjectChange}>
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
              onValueChange={onTopicChange}
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
  );
};

export default QuizFilters;
