import { motion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';

export const CommandTermsHero = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center mb-12"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
        <Sparkles className="h-4 w-4" />
        <span>MYP Mathematics Reference</span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
        Command Terms
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Master the 27 official IB MYP Mathematics command terms. Understanding these terms 
        is essential for interpreting exam questions correctly and providing appropriate responses.
      </p>

      <div className="flex items-center justify-center gap-6 mt-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>27 Command Terms</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>5 Categories</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Interactive Cards</span>
        </div>
      </div>
    </motion.div>
  );
};
