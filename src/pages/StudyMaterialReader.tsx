import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Type,
  ArrowLeft,
  BookOpen,
  Clock,
} from 'lucide-react';

interface StudyMaterial {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  level: string;
  material_type: string;
  file_url: string | null;
  tags: string[] | null;
}

const StudyMaterialReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('reader-dark-mode') === 'true';
  });
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('reader-font-size') || '18');
  });
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('reader-font-family') || 'serif';
  });
  const [progress, setProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);

  // Sample chapters - in production, parse from file_url content
  const [chapters, setChapters] = useState([
    { title: 'Introduction', content: '' },
    { title: 'Main Concepts', content: '' },
    { title: 'Examples', content: '' },
    { title: 'Practice Problems', content: '' },
    { title: 'Summary', content: '' },
  ]);

  useEffect(() => {
    fetchMaterial();
  }, [id]);

  useEffect(() => {
    localStorage.setItem('reader-dark-mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reader-font-family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
      setProgress(Math.min(scrollPercent, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      
      if (data) {
        setMaterial(data);
        // Generate sample content based on material
        generateChapterContent(data);
      }
    } catch (error) {
      console.error('Error fetching material:', error);
      toast({
        title: 'Error',
        description: 'Failed to load study material',
        variant: 'destructive',
      });
      navigate('/study-materials');
    } finally {
      setLoading(false);
    }
  };

  const generateChapterContent = (data: StudyMaterial) => {
    // In production, parse actual content from PDF/file
    const sampleContent = `
      <h2>Chapter Content for ${data.title}</h2>
      <p>Subject: ${data.subject} | Level: ${data.level}</p>
      
      <h3>Learning Objectives</h3>
      <p>${data.description || 'Comprehensive study material covering key concepts and applications.'}</p>
      
      <h3>Key Concepts</h3>
      <p>This section covers fundamental principles and theories that form the foundation of understanding this topic. Students should pay close attention to the relationships between different concepts and how they apply in real-world scenarios.</p>
      
      <h3>Detailed Explanation</h3>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      
      <h3>Important Formulas</h3>
      <p>Key formulas and equations that are essential for problem-solving and understanding the theoretical framework.</p>
      
      <h3>Practice Questions</h3>
      <p>Apply your knowledge with these carefully designed practice questions that test your understanding of the concepts covered.</p>
    `;

    setChapters(prev => prev.map((chapter, idx) => ({
      ...chapter,
      content: sampleContent + `\n\n<p><strong>Chapter ${idx + 1} of ${prev.length}</strong></p>`
    })));
  };

  const handlePrevious = () => {
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentChapter < chapters.length - 1) {
      setCurrentChapter(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const estimatedReadTime = Math.ceil(chapters[currentChapter]?.content.length / 1000) || 5;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!material) {
    return null;
  }

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/study-materials')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Sheet open={tocOpen} onOpenChange={setTocOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-4 h-4 mr-2" />
                    Contents
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={darkMode ? 'bg-gray-800' : ''}>
                  <div className="py-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Table of Contents
                    </h2>
                    <div className="space-y-2">
                      {chapters.map((chapter, idx) => (
                        <Button
                          key={idx}
                          variant={currentChapter === idx ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => {
                            setCurrentChapter(idx);
                            setTocOpen(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {idx + 1}. {chapter.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden md:block">
                <h1 className="font-semibold">{material.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Chapter {currentChapter + 1} of {chapters.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Font Size Control */}
              <div className="hidden md:flex items-center gap-2 px-3">
                <Type className="w-4 h-4" />
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={14}
                  max={24}
                  step={2}
                  className="w-24"
                />
              </div>

              {/* Font Family Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
              >
                <Type className="w-4 h-4" />
              </Button>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Reader Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Chapter Info */}
          <div className="mb-8">
            <h2 className={`text-3xl font-bold mb-4 ${
              fontFamily === 'serif' ? 'font-serif' : 'font-sans'
            }`}>
              {chapters[currentChapter]?.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {estimatedReadTime} min read
              </span>
              <span>Progress: {Math.round(progress)}%</span>
            </div>
          </div>

          {/* Content */}
          <div
            className={`prose max-w-none transition-all duration-200 ${
              darkMode ? 'prose-invert' : ''
            } ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.8',
            }}
            dangerouslySetInnerHTML={{ __html: chapters[currentChapter]?.content }}
          />
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className={`sticky bottom-0 border-t py-4 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentChapter === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentChapter + 1} / {chapters.length}
            </span>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentChapter === chapters.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudyMaterialReader;
