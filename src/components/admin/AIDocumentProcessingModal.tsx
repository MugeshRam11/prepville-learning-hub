import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  Timer, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  X, 
  Brain,
  ListChecks,
  CheckCircle2,
  HourglassIcon,
  Sparkles,
  ZoomIn
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export interface ExtractedImage {
  id: string;
  url: string;
  pageNumber: number;
  imageIndex: number;
  processed: boolean;
}

interface AIDocumentProcessingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileSize: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  progress: number;
  currentStep: number;
  steps: ProcessingStep[];
  extractedImages: ExtractedImage[];
  isProcessing: boolean;
  onImageClick?: (image: ExtractedImage) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AIDocumentProcessingModal: React.FC<AIDocumentProcessingModalProps> = ({
  open,
  onOpenChange,
  fileName,
  fileSize,
  elapsedTime,
  estimatedTimeRemaining,
  progress,
  currentStep,
  steps,
  extractedImages,
  isProcessing,
  onImageClick
}) => {
  const [selectedImage, setSelectedImage] = useState<ExtractedImage | null>(null);

  const handleImageClick = (image: ExtractedImage) => {
    if (onImageClick) {
      onImageClick(image);
    } else {
      setSelectedImage(image);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-xl shadow-2xl">
          {/* Glassmorphism overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative p-6 space-y-6">
            {/* Header */}
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2 rounded-xl bg-primary/10"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Brain className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    AI Document Processing
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Your document is being analyzed and structured by AI
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* File Status Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-4 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-3 rounded-xl bg-primary/10"
                    animate={{ 
                      boxShadow: isProcessing 
                        ? ['0 0 0 0 hsl(var(--primary)/0.2)', '0 0 0 8px hsl(var(--primary)/0)', '0 0 0 0 hsl(var(--primary)/0.2)']
                        : 'none'
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <FileText className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div>
                    <p className="font-medium text-foreground truncate max-w-[250px]">{fileName}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(fileSize)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium",
                      isProcessing 
                        ? "bg-primary/10 text-primary border-primary/30" 
                        : "bg-green-500/10 text-green-600 border-green-500/30"
                    )}
                  >
                    {isProcessing ? 'In Progress' : 'Complete'}
                  </Badge>
                  
                  <div className="text-right text-sm space-y-0.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Elapsed: {formatTime(elapsedTime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      <span>Est. remaining: {formatTime(estimatedTimeRemaining)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Progress Section */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-sm font-medium text-foreground">
                  {steps[currentStep]?.label || 'Processing...'}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
                <motion.div 
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  {/* Shimmer effect */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
                
                {/* Progress percentage bubble */}
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${Math.max(8, Math.min(92, progress))}%` }}
                >
                  <div className="px-2 py-0.5 rounded-full bg-background border border-border shadow-sm text-xs font-medium">
                    {progress}%
                  </div>
                </motion.div>
              </div>
              
              {/* Step Indicators */}
              <div className="flex items-center justify-between px-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center gap-1">
                    <motion.div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                        step.status === 'completed' && "bg-green-500 text-white",
                        step.status === 'active' && "bg-primary text-primary-foreground",
                        step.status === 'pending' && "bg-muted text-muted-foreground"
                      )}
                      animate={step.status === 'active' ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {step.status === 'completed' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        index + 1
                      )}
                    </motion.div>
                    <span className={cn(
                      "text-xs text-center max-w-[60px] leading-tight",
                      step.status === 'active' ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Visual Elements Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Extracted Visual Elements</h3>
                  <p className="text-xs text-muted-foreground">Images detected and processed in real time</p>
                </div>
                {extractedImages.length > 0 && (
                  <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                    <ZoomIn className="w-3.5 h-3.5" />
                    View larger
                  </button>
                )}
              </div>

              {/* Image Carousel */}
              <div className="relative rounded-xl bg-muted/30 border border-border/50 p-4 min-h-[140px]">
                {extractedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-8 h-8 text-muted-foreground mb-2" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground">Scanning document for images…</p>
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="flex gap-3 pb-2">
                      <AnimatePresence mode="popLayout">
                        {extractedImages.map((image, index) => (
                          <motion.div
                            key={image.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            className="relative flex-shrink-0 cursor-pointer group"
                            onClick={() => handleImageClick(image)}
                          >
                            <div className="w-[120px] h-[120px] rounded-xl overflow-hidden border border-border/50 bg-card shadow-sm">
                              <img 
                                src={image.url} 
                                alt={`Page ${image.pageNumber} - Image ${image.imageIndex}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              {/* Processed indicator */}
                              <AnimatePresence>
                                {image.processed && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm"
                                  >
                                    <Check className="w-3 h-3 text-white" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                              </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground mt-1.5 max-w-[120px] truncate">
                              Page {image.pageNumber} - Image {image.imageIndex}
                            </p>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {/* Loading skeleton for upcoming images */}
                      {isProcessing && (
                        <div className="flex-shrink-0">
                          <Skeleton className="w-[120px] h-[120px] rounded-xl" />
                          <Skeleton className="w-16 h-3 mx-auto mt-1.5" />
                        </div>
                      )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Processing Action Section */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  AI is extracting structure, text, and visual elements for accuracy.
                </p>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-foreground">Parse Document</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HourglassIcon className="w-4 h-4" />
                  <div>
                    <span className="font-medium">Generate Questions</span>
                    <p className="text-xs">Available after completion</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-xs text-muted-foreground"
            >
              You can safely leave this page. Processing will continue in the background.
            </motion.p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedImage && (
            <div className="relative">
              <img 
                src={selectedImage.url} 
                alt={`Page ${selectedImage.pageNumber} - Image ${selectedImage.imageIndex}`}
                className="w-full h-auto max-h-[80vh] object-contain bg-muted"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-white text-sm font-medium">
                  Page {selectedImage.pageNumber} - Image {selectedImage.imageIndex}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIDocumentProcessingModal;
