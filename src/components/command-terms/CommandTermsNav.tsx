import { motion } from 'framer-motion';
import { 
  Calculator, 
  Lightbulb, 
  LineChart, 
  Brain, 
  ClipboardList,
  LucideIcon
} from 'lucide-react';
import { CommandTermCategory } from '@/data/commandTerms';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  Calculator,
  Lightbulb,
  LineChart,
  Brain,
  ClipboardList
};

interface CommandTermsNavProps {
  categories: CommandTermCategory[];
  activeCategory: string | null;
}

export const CommandTermsNav = ({ categories, activeCategory }: CommandTermsNavProps) => {
  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="hidden lg:block sticky top-24 w-64 shrink-0">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Quick Navigation
        </h3>
        <ul className="space-y-1">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon] || Calculator;
            const isActive = activeCategory === category.id;
            
            return (
              <li key={category.id}>
                <button
                  onClick={() => scrollToCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <IconComponent className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{category.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
