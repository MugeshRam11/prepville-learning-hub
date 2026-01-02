import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CommandTermsSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const CommandTermsSearch = ({ searchQuery, onSearchChange }: CommandTermsSearchProps) => {
  return (
    <div className="relative max-w-md w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search command terms..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 h-12 bg-card border-border focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
};
