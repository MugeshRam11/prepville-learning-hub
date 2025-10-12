import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  BookOpen,
  Maximize2,
  Download,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem(`reader-page-${id}`);
    return saved ? parseInt(saved) : 1;
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('reader-dark-mode') === 'true';
  });
  const [scale, setScale] = useState(() => {
    return parseFloat(localStorage.getItem('reader-zoom') || '1.2');
  });
  const [tocOpen, setTocOpen] = useState(false);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchMaterial();
    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, [id]);

  useEffect(() => {
    localStorage.setItem('reader-dark-mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('reader-zoom', scale.toString());
  }, [scale]);

  useEffect(() => {
    localStorage.setItem(`reader-page-${id}`, currentPage.toString());
  }, [currentPage, id]);

  const updatePageWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      setPageWidth(Math.min(containerWidth - 40, 900));
    }
  };

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - next page
        handleNext();
      } else {
        // Swiped right - previous page
        handlePrevious();
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      handleNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      handlePrevious();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, numPages]);

  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading study material...</p>
        </div>
      </div>
    );
  }

  if (!material || !material.file_url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No PDF available for this material</p>
          <Button onClick={() => navigate('/study-materials')} className="mt-4">
            Back to Materials
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-sm transition-colors ${
        darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
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
                    Pages
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={darkMode ? 'bg-gray-800' : ''}>
                  <div className="py-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Jump to Page
                    </h2>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => {
                            setCurrentPage(pageNum);
                            setTocOpen(false);
                          }}
                        >
                          Page {pageNum}
                        </Button>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden md:block">
                <h1 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {material.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {numPages}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="hidden md:flex items-center gap-2 px-3 border-r border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>

              {/* Download */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(material.file_url!, '_blank')}
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* PDF Reader */}
      <main 
        className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-12rem)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full flex items-center justify-center">
          <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
            <Document
              file={material.file_url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading PDF...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center py-20">
                  <BookOpen className="w-16 h-16 mb-4 text-destructive" />
                  <p className="text-destructive">Failed to load PDF</p>
                  <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
                </div>
              }
              className={`shadow-2xl rounded-lg overflow-hidden transition-all duration-300 ${
                darkMode ? 'brightness-90 contrast-125' : ''
              }`}
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="mx-auto"
              />
            </Document>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className={`sticky bottom-0 border-t py-4 backdrop-blur-sm ${
        darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="min-w-[100px]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex flex-col items-center">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {currentPage} of {numPages}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentPage === numPages}
              className="min-w-[100px]"
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
