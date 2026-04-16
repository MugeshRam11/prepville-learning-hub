import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, X, Search, Check } from 'lucide-react';
import {
  TOPIC_TREE,
  getSubjects,
  getUnits,
  getTopics,
  getSubtopics,
  SUBJECT_DB_TO_DISPLAY,
  SUBJECT_DISPLAY_TO_DB,
} from '@/data/topicTree';

export interface TopicFilterState {
  subject: string;
  unit: string;
  topic: string;
  subtopic: string;
  pathway: string;
}

interface TopicHierarchyFilterProps {
  value: TopicFilterState;
  onChange: (value: TopicFilterState) => void;
  /** If true, shows DB enum keys; otherwise display names */
  useDbKeys?: boolean;
  /** Compact chip mode vs full bar */
  variant?: 'bar' | 'chips';
  className?: string;
}

// ─── Searchable Dropdown ─────────────────────────────────────
interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  grouped?: Record<string, string[]>;
  disabled?: boolean;
}

const FilterDropdown = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select...',
  grouped,
  disabled,
}: FilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return grouped ? undefined : options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search, grouped]);

  const filteredGrouped = useMemo(() => {
    if (!grouped || !search) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, items] of Object.entries(grouped)) {
      const matches = items.filter(
        (i) => i.toLowerCase().includes(q) || group.toLowerCase().includes(q)
      );
      if (matches.length) result[group] = matches;
    }
    return result;
  }, [grouped, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="justify-between min-w-[140px] max-w-[220px] h-9 text-sm font-normal"
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto">
          <div className="p-1">
            {/* All option */}
            <button
              onClick={() => { onSelect(''); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
            >
              <Check className={`h-3.5 w-3.5 ${!value ? 'opacity-100' : 'opacity-0'}`} />
              <span className="text-muted-foreground">All {label}</span>
            </button>

            {/* Grouped rendering */}
            {(filteredGrouped || grouped) && !filtered
              ? Object.entries(filteredGrouped || grouped || {}).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">
                      {group}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item}
                        onClick={() => { onSelect(item); setOpen(false); setSearch(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left pl-6"
                      >
                        <Check className={`h-3.5 w-3.5 ${value === item ? 'opacity-100' : 'opacity-0'}`} />
                        {item}
                      </button>
                    ))}
                  </div>
                ))
              : (filtered || options).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { onSelect(opt); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
                  >
                    <Check className={`h-3.5 w-3.5 ${value === opt ? 'opacity-100' : 'opacity-0'}`} />
                    {opt}
                  </button>
                ))}

            {((filtered && filtered.length === 0) ||
              (filteredGrouped && Object.keys(filteredGrouped).length === 0)) && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No results found</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Main Component ──────────────────────────────────────────
const TopicHierarchyFilter = ({
  value,
  onChange,
  useDbKeys = false,
  variant = 'bar',
  className = '',
}: TopicHierarchyFilterProps) => {
  const subjects = getSubjects();

  const displaySubject = useMemo(() => {
    if (!value.subject) return '';
    return useDbKeys ? (SUBJECT_DB_TO_DISPLAY[value.subject] || value.subject) : value.subject;
  }, [value.subject, useDbKeys]);

  const units = useMemo(() => getUnits(displaySubject), [displaySubject]);

  // Build grouped topics: unit → topics
  const topicsByUnit = useMemo(() => {
    if (!displaySubject) return {};
    const result: Record<string, string[]> = {};
    for (const unit of units) {
      result[unit] = getTopics(displaySubject, unit);
    }
    return result;
  }, [displaySubject, units]);

  const allTopics = useMemo(() => Object.values(topicsByUnit).flat(), [topicsByUnit]);

  // Find which unit the selected topic belongs to
  const topicUnit = useMemo(() => {
    if (!value.topic) return '';
    for (const [unit, topics] of Object.entries(topicsByUnit)) {
      if (topics.includes(value.topic)) return unit;
    }
    return '';
  }, [value.topic, topicsByUnit]);

  const subtopics = useMemo(
    () => (displaySubject && topicUnit && value.topic ? getSubtopics(displaySubject, topicUnit, value.topic) : []),
    [displaySubject, topicUnit, value.topic]
  );

  const handleSubjectChange = useCallback(
    (s: string) => {
      const dbKey = useDbKeys ? (SUBJECT_DISPLAY_TO_DB[s] || s) : s;
      onChange({ subject: dbKey, unit: '', topic: '', subtopic: '', pathway: '' });
    },
    [onChange, useDbKeys]
  );

  const handleUnitChange = useCallback(
    (u: string) => onChange({ ...value, unit: u, topic: '', subtopic: '' }),
    [onChange, value]
  );

  const handleTopicChange = useCallback(
    (t: string) => onChange({ ...value, topic: t, subtopic: '' }),
    [onChange, value]
  );

  const handleSubtopicChange = useCallback(
    (st: string) => onChange({ ...value, subtopic: st }),
    [onChange, value]
  );

  const handlePathwayChange = useCallback(
    (p: string) => onChange({ ...value, pathway: value.pathway === p ? '' : p }),
    [onChange, value]
  );

  const activeFilters = [
    value.subject && (displaySubject),
    value.unit,
    value.topic,
    value.subtopic,
    value.pathway,
  ].filter(Boolean);

  const clearAll = () => onChange({ subject: '', unit: '', topic: '', subtopic: '', pathway: '' });

  if (variant === 'chips') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <FilterDropdown
          label="Subject"
          value={displaySubject}
          options={subjects}
          onSelect={handleSubjectChange}
          placeholder="Subject"
        />

        {displaySubject && (
          <FilterDropdown
            label="Unit"
            value={value.unit}
            options={units}
            onSelect={handleUnitChange}
            placeholder="Unit"
          />
        )}

        {displaySubject && (
          <FilterDropdown
            label="Topic"
            value={value.topic}
            options={allTopics}
            onSelect={handleTopicChange}
            placeholder="Topic"
            grouped={topicsByUnit}
          />
        )}

        {value.topic && subtopics.length > 0 && (
          <FilterDropdown
            label="Subtopic"
            value={value.subtopic}
            options={subtopics}
            onSelect={handleSubtopicChange}
            placeholder="Subtopic"
          />
        )}

        {/* Pathway toggle */}
        <div className="flex gap-1">
          <Badge
            variant={value.pathway === 'standard' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => handlePathwayChange('standard')}
          >
            Standard
          </Badge>
          <Badge
            variant={value.pathway === 'extended' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => handlePathwayChange('extended')}
          >
            Extended
          </Badge>
        </div>

        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>
    );
  }

  // Bar variant
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="Subject"
          value={displaySubject}
          options={subjects}
          onSelect={handleSubjectChange}
          placeholder="All Subjects"
        />

        <FilterDropdown
          label="Unit"
          value={value.unit}
          options={units}
          onSelect={handleUnitChange}
          placeholder="All Units"
          disabled={!displaySubject}
        />

        <FilterDropdown
          label="Topic"
          value={value.topic}
          options={allTopics}
          onSelect={handleTopicChange}
          placeholder="All Topics"
          grouped={topicsByUnit}
          disabled={!displaySubject}
        />

        {subtopics.length > 0 && (
          <FilterDropdown
            label="Subtopic"
            value={value.subtopic}
            options={subtopics}
            onSelect={handleSubtopicChange}
            placeholder="All Subtopics"
          />
        )}

        {/* Pathway toggle */}
        <div className="flex gap-1 ml-1">
          <Badge
            variant={value.pathway === 'standard' ? 'default' : 'outline'}
            className="cursor-pointer text-xs px-3 py-1"
            onClick={() => handlePathwayChange('standard')}
          >
            Standard
          </Badge>
          <Badge
            variant={value.pathway === 'extended' ? 'default' : 'outline'}
            className="cursor-pointer text-xs px-3 py-1"
            onClick={() => handlePathwayChange('extended')}
          >
            Extended
          </Badge>
        </div>

        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs">
            <X className="h-3 w-3 mr-1" /> Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.subject && (
            <Badge variant="secondary" className="text-xs gap-1">
              {displaySubject}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSubjectChange('')} />
            </Badge>
          )}
          {value.unit && (
            <Badge variant="secondary" className="text-xs gap-1">
              {value.unit}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleUnitChange('')} />
            </Badge>
          )}
          {value.topic && (
            <Badge variant="secondary" className="text-xs gap-1">
              {value.topic}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleTopicChange('')} />
            </Badge>
          )}
          {value.subtopic && (
            <Badge variant="secondary" className="text-xs gap-1">
              {value.subtopic}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSubtopicChange('')} />
            </Badge>
          )}
          {value.pathway && (
            <Badge variant="secondary" className="text-xs gap-1">
              {value.pathway}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handlePathwayChange('')} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicHierarchyFilter;
