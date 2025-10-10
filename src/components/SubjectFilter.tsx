
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Subject {
  title: string;
  description: string;
  topics: string[];
  questions: number;
  videos: number;
  level: string;
  color: string;
  category: string;
}

interface SubjectFilterProps {
  subjects: Subject[];
}

const SubjectFilter = ({ subjects }: SubjectFilterProps) => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const topics = useMemo(() => {
    const allTopics = subjects.flatMap(subject => subject.topics);
    const uniqueTopics = [...new Set(allTopics)];
    return uniqueTopics.sort();
  }, [subjects]);

  // Filter subjects based on selected filters
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      const matchesTopic = selectedTopic === 'all' || subject.topics.includes(selectedTopic);
      const matchesSearch = searchQuery === '' || 
        subject.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesTopic && matchesSearch;
    });
  }, [subjects, selectedTopic, searchQuery]);

  const clearFilters = () => {
    setSelectedTopic('all');
    setSearchQuery('');
  };

  const handleStartLearning = (subject: Subject) => {
    const params = new URLSearchParams({
      title: subject.title,
      level: subject.level,
      questions: subject.questions.toString(),
      videos: subject.videos.toString(),
      topics: subject.topics.join(',')
    });
    navigate(`/subject-learning?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Topic Filter */}
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select Topic" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSubjects.length} of {subjects.length} subjects
            </p>
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Results */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.map((subject, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {subject.level}
                </Badge>
                <div className={`w-3 h-3 rounded-full ${subject.color}`} />
              </div>
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                {subject.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {subject.description}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {subject.topics.map((topic, topicIndex) => (
                    <Badge key={topicIndex} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{subject.questions} Questions</span>
                  <span>{subject.videos} Videos</span>
                </div>
                
                <Button 
                  className="w-full mt-4 group-hover:bg-blue-600 transition-colors"
                  onClick={() => handleStartLearning(subject)}
                >
                  Start Learning
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredSubjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No subjects found matching your criteria.</p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubjectFilter;
