import { motion } from 'framer-motion';
import { 
  Calculator, 
  Lightbulb, 
  LineChart, 
  Brain, 
  ClipboardList,
  LucideIcon
} from 'lucide-react';
import { CommandTermCard } from './CommandTermCard';
import { CommandTermCategory as CategoryType } from '@/data/commandTerms';

const iconMap: Record<string, LucideIcon> = {
  Calculator,
  Lightbulb,
  LineChart,
  Brain,
  ClipboardList
};

interface CommandTermCategoryProps {
  category: CategoryType;
  index: number;
}

export const CommandTermCategorySection = ({ category, index }: CommandTermCategoryProps) => {
  const IconComponent = iconMap[category.icon] || Calculator;

  return (
    <motion.section
      id={category.id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="scroll-mt-24"
    >
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <IconComponent 
            className="h-6 w-6" 
            style={{ color: category.color }}
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {category.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {category.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.terms.map((term, termIndex) => (
          <CommandTermCard
            key={term.id}
            term={term}
            categoryColor={category.color}
            index={termIndex}
          />
        ))}
      </div>
    </motion.section>
  );
};
