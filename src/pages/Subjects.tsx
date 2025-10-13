import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SubjectFilter from '@/components/SubjectFilter';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const Subjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectsFromDB();
  }, []);

  const fetchSubjectsFromDB = async () => {
    try {
      setLoading(true);
      
      // Fetch all published questions
      const { data: questionsData, error } = await supabase
        .from('subject_questions')
        .select('subject, topic, level, difficulty')
        .eq('is_published', true);

      if (error) throw error;

      // Group and aggregate data
      const subjectMap = new Map<string, any>();
      
      questionsData?.forEach((q) => {
        const subjectKey = q.subject;
        const subjectTitle = formatSubjectTitle(q.subject, q.level);
        
        if (!subjectMap.has(subjectKey)) {
          subjectMap.set(subjectKey, {
            title: subjectTitle,
            description: getSubjectDescription(q.subject, q.level),
            questions: 0,
            videos: 0, // Will be populated when videos are added
            topics: new Set<string>(),
            level: q.level,
            color: getSubjectColor(q.subject),
            category: getSubjectCategory(q.subject)
          });
        }
        
        const subject = subjectMap.get(subjectKey)!;
        subject.questions++;
        subject.topics.add(q.topic);
      });

      // Convert to array and format
      const formattedSubjects = Array.from(subjectMap.values()).map(s => ({
        ...s,
        topics: Array.from(s.topics)
      }));

      setSubjects(formattedSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSubjectTitle = (subject: string, level: string): string => {
    const subjectNames: Record<string, string> = {
      'mathematics': 'Math',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology',
      'english': 'English',
      'history': 'History',
      'economics': 'Economics',
      'computer_science': 'Computer Science'
    };
    return `${level} ${subjectNames[subject] || subject}`;
  };

  const getSubjectDescription = (subject: string, level: string): string => {
    const descriptions: Record<string, string> = {
      'mathematics': 'Comprehensive mathematics curriculum',
      'physics': 'Physics principles and applications',
      'chemistry': 'Chemical reactions and properties',
      'biology': 'Life sciences and biological systems',
      'english': 'Language arts and literature',
      'history': 'Historical events and analysis',
      'economics': 'Economic theory and practice',
      'computer_science': 'Programming and computational thinking'
    };
    return descriptions[subject] || `${subject} for ${level} students`;
  };

  const getSubjectColor = (subject: string): string => {
    const colors: Record<string, string> = {
      'mathematics': 'bg-blue-500',
      'physics': 'bg-red-500',
      'chemistry': 'bg-teal-500',
      'biology': 'bg-emerald-500',
      'english': 'bg-purple-500',
      'history': 'bg-amber-500',
      'economics': 'bg-indigo-500',
      'computer_science': 'bg-cyan-500'
    };
    return colors[subject] || 'bg-gray-500';
  };

  const getSubjectCategory = (subject: string): string => {
    const categories: Record<string, string> = {
      'mathematics': 'Mathematics',
      'physics': 'Science',
      'chemistry': 'Science',
      'biology': 'Science',
      'english': 'Languages',
      'history': 'Humanities',
      'economics': 'Social Sciences',
      'computer_science': 'Technology'
    };
    return categories[subject] || 'Other';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading subjects...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                All Subjects at Your Fingertips
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Comprehensive curriculum coverage for MYP and IBDP students. Choose your subject and start mastering it today.
              </p>
              {subjects.length > 0 && (
                <p className="text-sm md:text-base text-muted-foreground/80 pt-2">
                  {subjects.length} subjects available with {subjects.reduce((sum, s) => sum + s.questions, 0)} practice questions
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Subjects with Filters */}
        <section className="py-16 bg-background">
          <div className="container">
            {subjects.length > 0 ? (
              <SubjectFilter subjects={subjects} />
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-4">
                  No subjects available yet. Upload questions via the admin panel to get started.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Subjects;
