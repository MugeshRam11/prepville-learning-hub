import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search as SearchIcon, Check, ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SUBJECT_DB_TO_DISPLAY, getUnits, getTopics } from '@/data/topicTree';

interface TopicSelectorProps {
  subject: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ subject, value, onChange, placeholder = 'Select topic...' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [creating, setCreating] = useState(false);

  const displaySubject = SUBJECT_DB_TO_DISPLAY[subject] || subject;
  const units = useMemo(() => getUnits(displaySubject), [displaySubject]);

  useEffect(() => {
    if (!subject) return;
    const fetchCustom = async () => {
      const { data } = await supabase
        .from('custom_topics')
        .select('topic, unit')
        .eq('subject', subject);
      if (data) setCustomTopics(data.map((d: any) => d.topic));
    };
    fetchCustom();
  }, [subject]);

  const grouped = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const unit of units) {
      const topics = getTopics(displaySubject, unit);
      if (topics.length) result[unit] = topics;
    }
    if (customTopics.length > 0) {
      result['Custom Topics'] = customTopics;
    }
    return result;
  }, [displaySubject, units, customTopics]);

  const filteredGrouped = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, items] of Object.entries(grouped)) {
      const matches = items.filter(i => i.toLowerCase().includes(q) || group.toLowerCase().includes(q));
      if (matches.length) result[group] = matches;
    }
    return result;
  }, [grouped, search]);

  const noResults = Object.keys(filteredGrouped).length === 0;

  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('custom_topics').insert({
        subject,
        unit: newUnit.trim() || 'Custom',
        topic: newTopic.trim(),
      });
      if (error) throw error;
      setCustomTopics(prev => [...prev, newTopic.trim()]);
      onChange(newTopic.trim());
      setNewTopic('');
      setNewUnit('');
      setShowCreateForm(false);
      setOpen(false);
      setSearch('');
      toast.success(`Topic "${newTopic.trim()}" created!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create topic');
    } finally {
      setCreating(false);
    }
  };

  const hasTopics = Object.keys(grouped).length > 0 || subject;

  if (!hasTopics) {
    return (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g., Algebra, Force & Motion" />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0 overflow-hidden" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search topics..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto overscroll-contain" style={{ scrollBehavior: 'smooth' }}>
          <div className="p-1">
            {Object.entries(filteredGrouped).map(([unit, topics]) => (
              <div key={unit}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">{unit}</div>
                {topics.map((topic) => (
                  <button key={topic} onClick={() => { onChange(topic); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left pl-6">
                    <Check className={`h-3.5 w-3.5 ${value === topic ? 'opacity-100' : 'opacity-0'}`} />
                    {topic}
                  </button>
                ))}
              </div>
            ))}

            {noResults && !showCreateForm && (
              <div className="px-3 py-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No topics found for "{search}"</p>
                <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(true); setNewTopic(search); }}
                  className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Create "{search}"
                </Button>
              </div>
            )}

            {!noResults && !showCreateForm && (
              <div className="border-t border-border mt-1 pt-1">
                <button onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left text-primary">
                  <Plus className="h-3.5 w-3.5" /> Create new topic
                </button>
              </div>
            )}

            {showCreateForm && (
              <div className="border-t border-border mt-1 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Create New Topic</p>
                <Input placeholder="Unit (optional, e.g. Unit 6: Calculus)"
                  value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Topic name *"
                  value={newTopic} onChange={(e) => setNewTopic(e.target.value)} className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateTopic} disabled={!newTopic.trim() || creating} className="flex-1">
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCreateForm(false); setNewTopic(''); setNewUnit(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TopicSelector;
