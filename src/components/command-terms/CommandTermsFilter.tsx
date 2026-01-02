import { motion } from 'framer-motion';
import { 
  Calculator, 
  Lightbulb, 
  LineChart, 
  Brain, 
  ClipboardList,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandTermCategory } from '@/data/commandTerms';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  Calculator,
  Lightbulb,
  LineChart,
  Brain,
  ClipboardList
};

interface CommandTermsFilterProps {
  categories: CommandTermCategory[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export const CommandTermsFilter = ({ 
  categories, 
  activeCategory, 
  onCategoryChange 
}: CommandTermsFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={activeCategory === null ? "default" : "outline"}
        size="sm"
        onClick={() => onCategoryChange(null)}
        className="rounded-full"
      >
        All Terms
      </Button>
      
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon] || Calculator;
        const isActive = activeCategory === category.id;
        
        return (
          <motion.div
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "rounded-full gap-2",
                isActive && "shadow-md"
              )}
              style={isActive ? { backgroundColor: category.color } : undefined}
            >
              <IconComponent className="h-4 w-4" />
              <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};
