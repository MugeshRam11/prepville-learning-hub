import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

export interface PracticeFiltersState {
  search: string;
  topic: string;
  difficulty: string;
  questionType: string;
  status: string;
}

interface PracticeFiltersProps {
  filters: PracticeFiltersState;
  onFilterChange: (filters: PracticeFiltersState) => void;
  topics: string[];
  questionTypes: string[];
}

const PracticeFilters: React.FC<PracticeFiltersProps> = ({
  filters,
  onFilterChange,
  topics,
  questionTypes
}) => {
  const updateFilter = (key: keyof PracticeFiltersState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      topic: 'all',
      difficulty: 'all',
      questionType: 'all',
      status: 'all'
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.topic !== 'all' || 
    filters.difficulty !== 'all' || 
    filters.questionType !== 'all' || 
    filters.status !== 'all';

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search questions by title or keyword..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        {/* Topic Filter */}
        <Select value={filters.topic} onValueChange={(v) => updateFilter('topic', v)}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {topics.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty Filter */}
        <Select value={filters.difficulty} onValueChange={(v) => updateFilter('difficulty', v)}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        {/* Question Type Filter */}
        <Select value={filters.questionType} onValueChange={(v) => updateFilter('questionType', v)}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {questionTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
            <SelectItem value="attempted">Attempted</SelectItem>
            <SelectItem value="unsolved">Unsolved</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 gap-1.5 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default PracticeFilters;
