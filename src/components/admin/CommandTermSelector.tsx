import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { commandTermsData, getAllTerms } from '@/data/commandTerms';

interface CommandTermSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  calculation: 'bg-blue-100 text-blue-800 border-blue-200',
  reasoning: 'bg-purple-100 text-purple-800 border-purple-200',
  visual: 'bg-green-100 text-green-800 border-green-200',
  thinking: 'bg-pink-100 text-pink-800 border-pink-200',
  identification: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const CommandTermSelector: React.FC<CommandTermSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const allTerms = getAllTerms();
  const selectedTerm = allTerms.find(t => t.term.toUpperCase() === value?.toUpperCase());

  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Command Term">
          {selectedTerm && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={CATEGORY_COLORS[selectedTerm.category]}>
                {selectedTerm.term.toUpperCase()}
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="none">
          <span className="text-muted-foreground">No command term</span>
        </SelectItem>
        {commandTermsData.map((category) => (
          <React.Fragment key={category.id}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
              {category.name}
            </div>
            {category.terms.map((term) => (
              <SelectItem key={term.id} value={term.term.toUpperCase()}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={CATEGORY_COLORS[term.category]}>
                      {term.term.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {term.definition}
                  </span>
                </div>
              </SelectItem>
            ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CommandTermSelector;
