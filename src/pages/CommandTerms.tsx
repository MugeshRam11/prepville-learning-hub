import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CommandTermsHero } from '@/components/command-terms/CommandTermsHero';
import { CommandTermsSearch } from '@/components/command-terms/CommandTermsSearch';
import { CommandTermsFilter } from '@/components/command-terms/CommandTermsFilter';
import { CommandTermsNav } from '@/components/command-terms/CommandTermsNav';
import { CommandTermCategorySection } from '@/components/command-terms/CommandTermCategory';
import { CommandTermCard } from '@/components/command-terms/CommandTermCard';
import { commandTermsData, searchTerms } from '@/data/commandTerms';

const CommandTerms = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scrolledCategory, setScrolledCategory] = useState<string | null>(null);

  // Track which category is currently in view
  useEffect(() => {
    const handleScroll = () => {
      const categories = commandTermsData.map(c => c.id);
      for (const categoryId of categories) {
        const element = document.getElementById(categoryId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setScrolledCategory(categoryId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter categories and terms based on search and category filter
  const filteredData = useMemo(() => {
    if (searchQuery) {
      const results = searchTerms(searchQuery);
      return results;
    }

    if (activeCategory) {
      return commandTermsData.filter(c => c.id === activeCategory);
    }

    return commandTermsData;
  }, [searchQuery, activeCategory]);

  const isSearching = searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 pt-24">
        <CommandTermsHero />

        {/* Search and Filter Bar */}
        <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-lg py-4 mb-8 -mx-4 px-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-7xl mx-auto">
            <CommandTermsSearch 
              searchQuery={searchQuery} 
              onSearchChange={setSearchQuery} 
            />
            <CommandTermsFilter 
              categories={commandTermsData}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8 max-w-7xl mx-auto">
          {/* Sticky Navigation */}
          {!isSearching && (
            <CommandTermsNav 
              categories={commandTermsData}
              activeCategory={scrolledCategory}
            />
          )}

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {isSearching ? (
              // Search Results
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-6">
                  Found {(filteredData as any[]).length} result{(filteredData as any[]).length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(filteredData as any[]).map((term, index) => (
                    <CommandTermCard
                      key={term.id}
                      term={term}
                      categoryColor={
                        commandTermsData.find(c => c.id === term.category)?.color || 'hsl(211 100% 50%)'
                      }
                      index={index}
                    />
                  ))}
                </div>
                {(filteredData as any[]).length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <p className="text-muted-foreground">
                      No command terms found matching your search.
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              // Category Sections
              <div className="space-y-16">
                {(filteredData as typeof commandTermsData).map((category, index) => (
                  <CommandTermCategorySection
                    key={category.id}
                    category={category}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CommandTerms;
