
import React from 'react';
import QuizCard from './QuizCard';

interface QuizTest {
  id: string;
  title: string;
  subject: string;
  topic: string;
  questions: number;
  timeMinutes: number;
  difficulty: string;
}

interface QuizGridProps {
  tests: QuizTest[];
  onStartTest: (testId: string) => void;
}

const QuizGrid = ({ tests, onStartTest }: QuizGridProps) => {
  return (
    <section className="py-12">
      <div className="container">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {tests.length} test{tests.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <QuizCard
              key={test.id}
              test={test}
              onStartTest={onStartTest}
            />
          ))}
        </div>

        {tests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No tests found matching your criteria.
            </p>
            <p className="text-muted-foreground">
              Try adjusting your search or filter options.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default QuizGrid;
