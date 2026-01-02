import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CommandTerm } from '@/data/commandTerms';
import { cn } from '@/lib/utils';

interface CommandTermCardProps {
  term: CommandTerm;
  categoryColor: string;
  index: number;
}

export const CommandTermCard = ({ term, categoryColor, index }: CommandTermCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
          "border-l-4 bg-card"
        )}
        style={{ borderLeftColor: categoryColor }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 
              className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors"
            >
              {term.term}
            </h3>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </div>
          
          <AnimatePresence>
            {isExpanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {term.definition}
                </p>
              </motion.div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {term.definition}
              </p>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
