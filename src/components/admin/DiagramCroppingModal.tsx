import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Crop, 
  Images, 
  Wand2, 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut,
  Check, 
  AlertCircle,
  Loader2,
  Download,
  Grid3X3,
  Move,
  GitBranch,
  Settings2,
  RotateCcw,
  ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoDiagramCropper, CroppedDiagram } from '@/hooks/useAutoDiagramCropper';
import { toast } from 'sonner';

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface DetectedDiagram {
  id: string;
  type: string;
  description?: string;
  boundingBox: BoundingBox;
  pageNumber: number;
  questionNumber: string | number;
  cropped?: boolean;
  croppedUrl?: string;
}

interface PageImage {
  pageNumber: number;
  imageUrl: string;
}

interface DiagramCroppingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageImages: PageImage[];
  diagrams: DetectedDiagram[];
  onCropComplete: (croppedDiagrams: CroppedDiagram[]) => void;
  onUpdateDiagram?: (id: string, updates: Partial<DetectedDiagram>) => void;
}

const DIAGRAM_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  venn_diagram: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
  coordinate_plane: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
  table: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-700' },
  tree_diagram: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' },
  pie_chart: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700' },
  bar_chart: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
  geometric_figure: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-700' },
  box_plot: { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-700' },
  default: { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-700' }
};

const DiagramCroppingModal: React.FC<DiagramCroppingModalProps> = ({
  open,
  onOpenChange,
  pageImages,
  diagrams,
  onCropComplete,
  onUpdateDiagram
}) => {
  const [selectedDiagrams, setSelectedDiagrams] = useState<Set<string>>(new Set(diagrams.map(d => d.id)));
  const [currentPage, setCurrentPage] = useState(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hoveredDiagram, setHoveredDiagram] = useState<string | null>(null);
  const [editingDiagram, setEditingDiagram] = useState<string | null>(null);
  const [cropResults, setCropResults] = useState<CroppedDiagram[]>([]);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const { 
    isCropping, 
    progress, 
    autoCropAllDiagrams,
    cropSingleDiagram 
  } = useAutoDiagramCropper();

  // Get diagrams for current page
  const currentPageDiagrams = diagrams.filter(d => d.pageNumber === currentPage);
  const currentPageImage = pageImages.find(p => p.pageNumber === currentPage);
  const totalPages = Math.max(...pageImages.map(p => p.pageNumber), 1);

  // Statistics
  const croppedCount = diagrams.filter(d => d.cropped || d.croppedUrl).length;
  const selectedCount = selectedDiagrams.size;

  const toggleDiagram = (id: string) => {
    const newSelected = new Set(selectedDiagrams);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDiagrams(newSelected);
  };

  const selectAllOnPage = () => {
    const newSelected = new Set(selectedDiagrams);
    currentPageDiagrams.forEach(d => newSelected.add(d.id));
    setSelectedDiagrams(newSelected);
  };

  const deselectAllOnPage = () => {
    const newSelected = new Set(selectedDiagrams);
    currentPageDiagrams.forEach(d => newSelected.delete(d.id));
    setSelectedDiagrams(newSelected);
  };

  // Crop all selected diagrams
  const handleBulkCrop = async () => {
    const diagramsToCrop = diagrams.filter(d => 
      selectedDiagrams.has(d.id) && !d.cropped && !d.croppedUrl
    );

    if (diagramsToCrop.length === 0) {
      toast.info('No diagrams to crop - all selected diagrams are already cropped');
      return;
    }

    const detectedDiagrams = diagramsToCrop.map(d => ({
      type: d.type,
      description: d.description,
      boundingBox: d.boundingBox,
      pageNumber: d.pageNumber,
      questionNumber: d.questionNumber
    }));

    const results = await autoCropAllDiagrams(pageImages, detectedDiagrams);
    setCropResults(prev => [...prev, ...results]);
    onCropComplete(results);
  };

  // Crop single diagram
  const handleSingleCrop = async (diagram: DetectedDiagram) => {
    const pageImage = pageImages.find(p => p.pageNumber === diagram.pageNumber);
    if (!pageImage) {
      toast.error('Page image not found');
      return;
    }

    const result = await cropSingleDiagram(pageImage.imageUrl, {
      type: diagram.type,
      boundingBox: diagram.boundingBox,
      pageNumber: diagram.pageNumber,
      questionNumber: diagram.questionNumber
    });

    if (result) {
      setCropResults(prev => [...prev, result]);
      onUpdateDiagram?.(diagram.id, { cropped: true, croppedUrl: result.url });
      toast.success(`Cropped diagram for Q${diagram.questionNumber}`);
    }
  };

  const getTypeColor = (type: string) => {
    return DIAGRAM_TYPE_COLORS[type] || DIAGRAM_TYPE_COLORS.default;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-primary" />
            Diagram Cropping Interface
          </DialogTitle>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <Badge variant="outline" className="gap-1">
              <Images className="w-3 h-3" />
              {diagrams.length} diagrams detected
            </Badge>
            <Badge variant="outline" className="gap-1 text-green-600">
              <Check className="w-3 h-3" />
              {croppedCount} cropped
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Checkbox className="w-3 h-3" />
              {selectedCount} selected
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Page Image with Bounding Boxes */}
          <div className="flex-1 flex flex-col border-r">
            {/* Page Navigation */}
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                >
                  {showBoundingBoxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(z => Math.min(z + 0.25, 2))}
                  disabled={zoom >= 2}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Badge variant="outline">{Math.round(zoom * 100)}%</Badge>
              </div>
            </div>

            {/* Image Container */}
            <ScrollArea className="flex-1" ref={imageContainerRef}>
              <div 
                className="relative inline-block transition-transform"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              >
                {currentPageImage ? (
                  <>
                    <img 
                      src={currentPageImage.imageUrl}
                      alt={`Page ${currentPage}`}
                      className="max-w-none"
                    />
                    
                    {/* Bounding Box Overlays */}
                    <AnimatePresence>
                      {showBoundingBoxes && currentPageDiagrams.map((diagram) => {
                        const { x_min, y_min, x_max, y_max } = diagram.boundingBox;
                        const typeColor = getTypeColor(diagram.type);
                        const isSelected = selectedDiagrams.has(diagram.id);
                        const isHovered = hoveredDiagram === diagram.id;
                        const isCropped = diagram.cropped || diagram.croppedUrl;
                        
                        return (
                          <motion.div
                            key={diagram.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "absolute cursor-pointer transition-all duration-150",
                              "border-2 rounded-md",
                              typeColor.border,
                              isSelected ? "border-solid" : "border-dashed",
                              isHovered && "shadow-lg z-10",
                              isCropped && "ring-2 ring-green-500 ring-offset-2"
                            )}
                            style={{
                              left: `${x_min}%`,
                              top: `${y_min}%`,
                              width: `${x_max - x_min}%`,
                              height: `${y_max - y_min}%`,
                              backgroundColor: isHovered || isSelected 
                                ? `${typeColor.bg.replace('bg-', 'rgba(')}/0.3` 
                                : 'transparent'
                            }}
                            onClick={() => toggleDiagram(diagram.id)}
                            onMouseEnter={() => setHoveredDiagram(diagram.id)}
                            onMouseLeave={() => setHoveredDiagram(null)}
                          >
                            {/* Type Badge */}
                            <div className={cn(
                              "absolute -top-6 left-0 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                              typeColor.bg,
                              typeColor.text
                            )}>
                              <span>Q{diagram.questionNumber}</span>
                              <span className="capitalize">{diagram.type.replace('_', ' ')}</span>
                              {isCropped && <Check className="w-3 h-3 text-green-600" />}
                            </div>
                            
                            {/* Selection checkbox */}
                            <div className="absolute -top-2 -left-2 bg-white rounded-full shadow-md p-0.5">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleDiagram(diagram.id)}
                                className="h-4 w-4"
                              />
                            </div>
                            
                            {/* Quick crop button on hover */}
                            {isHovered && !isCropped && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-7 text-xs shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleCrop(diagram);
                                }}
                              >
                                <Crop className="w-3 h-3 mr-1" />
                                Crop
                              </Button>
                            )}
                            
                            {/* Corner handles */}
                            {isSelected && (
                              <>
                                <div className="absolute -left-1 -top-1 w-2 h-2 bg-primary rounded-full" />
                                <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full" />
                                <div className="absolute -left-1 -bottom-1 w-2 h-2 bg-primary rounded-full" />
                                <div className="absolute -right-1 -bottom-1 w-2 h-2 bg-primary rounded-full" />
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <ImageIcon className="w-12 h-12" />
                    <span className="ml-3">No image for this page</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Page Actions */}
            <div className="flex items-center justify-between p-2 border-t bg-muted/30">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllOnPage}>
                  Select All ({currentPageDiagrams.length})
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllOnPage}>
                  Deselect All
                </Button>
              </div>
              <Badge variant="secondary">
                {currentPageDiagrams.filter(d => selectedDiagrams.has(d.id)).length} / {currentPageDiagrams.length} selected on page
              </Badge>
            </div>
          </div>

          {/* Right Panel - Diagram List & Results */}
          <div className="w-80 flex flex-col bg-muted/10">
            <Tabs defaultValue="diagrams" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start p-1 bg-transparent border-b rounded-none">
                <TabsTrigger value="diagrams" className="text-xs">
                  <Grid3X3 className="w-3 h-3 mr-1" />
                  Diagrams ({diagrams.length})
                </TabsTrigger>
                <TabsTrigger value="results" className="text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Results ({cropResults.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="diagrams" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {diagrams.map((diagram) => {
                      const typeColor = getTypeColor(diagram.type);
                      const isSelected = selectedDiagrams.has(diagram.id);
                      const isCropped = diagram.cropped || diagram.croppedUrl;
                      
                      return (
                        <Card 
                          key={diagram.id}
                          className={cn(
                            "cursor-pointer transition-all",
                            isSelected && "ring-2 ring-primary",
                            isCropped && "bg-green-50 dark:bg-green-950/20"
                          )}
                          onClick={() => {
                            toggleDiagram(diagram.id);
                            setCurrentPage(diagram.pageNumber);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleDiagram(diagram.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    Q{diagram.questionNumber}
                                  </Badge>
                                  <Badge variant="secondary" className={cn("text-[10px]", typeColor.text, typeColor.bg)}>
                                    {diagram.type.replace('_', ' ')}
                                  </Badge>
                                  {isCropped && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                </div>
                                {diagram.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {diagram.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                  <span>Page {diagram.pageNumber}</span>
                                  <span>•</span>
                                  <span>
                                    {Math.round(diagram.boundingBox.x_max - diagram.boundingBox.x_min)}% × 
                                    {Math.round(diagram.boundingBox.y_max - diagram.boundingBox.y_min)}%
                                  </span>
                                </div>
                                
                                {/* Cropped preview */}
                                {diagram.croppedUrl && (
                                  <img 
                                    src={diagram.croppedUrl}
                                    alt="Cropped"
                                    className="mt-2 w-full h-16 object-contain rounded border bg-white"
                                  />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {diagrams.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No diagrams detected</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="results" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {cropResults.map((result, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-2">
                          <img 
                            src={result.url}
                            alt={`Cropped ${result.type}`}
                            className="w-full h-20 object-contain rounded border bg-white mb-2"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant="outline">Q{result.questionNumber}</Badge>
                            <span className="text-muted-foreground capitalize">{result.type.replace('_', ' ')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {cropResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Crop className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No cropped diagrams yet</p>
                        <p className="text-xs">Use bulk crop to extract diagrams</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Progress Bar */}
        {isCropping && progress && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <div className="flex-1">
                <Progress value={(progress.completed / progress.total) * 100} className="h-2" />
              </div>
              <span className="text-xs text-muted-foreground">
                {progress.current}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="p-4 border-t">
          <div className="flex items-center gap-2 mr-auto">
            <Button variant="outline" size="sm" onClick={() => setSelectedDiagrams(new Set(diagrams.map(d => d.id)))}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDiagrams(new Set())}>
              Clear Selection
            </Button>
          </div>
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleBulkCrop}
            disabled={selectedCount === 0 || isCropping}
            className="gap-2"
          >
            {isCropping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cropping...
              </>
            ) : (
              <>
                <Crop className="w-4 h-4" />
                Crop Selected ({selectedCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiagramCroppingModal;
