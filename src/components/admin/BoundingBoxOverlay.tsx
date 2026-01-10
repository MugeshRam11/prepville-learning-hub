import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crop, Loader2, Wand2, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface BoundingBoxOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceImage: string;
  boundingBox: BoundingBox | null;
  graphType?: string | null;
  graphDescription?: string | null;
  pageNumber?: number;
  onCrop?: (croppedImageBlob: Blob) => void;
  onGenerateImage?: (description: string) => void;
  isCropping?: boolean;
  isGenerating?: boolean;
}

const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  open,
  onOpenChange,
  sourceImage,
  boundingBox,
  graphType,
  graphDescription,
  pageNumber = 1,
  onCrop,
  onGenerateImage,
  isCropping = false,
  isGenerating = false
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [showCroppedPreview, setShowCroppedPreview] = useState(false);

  useEffect(() => {
    if (!open) {
      setImageLoaded(false);
      setCroppedPreview(null);
      setShowCroppedPreview(false);
      setZoom(1);
    }
  }, [open]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
    }
  };

  const calculatePixelBox = () => {
    if (!boundingBox || !imageLoaded) return null;
    
    const containerWidth = 700; // Max display width
    const containerHeight = 500; // Max display height
    
    const scale = Math.min(
      containerWidth / imageDimensions.width,
      containerHeight / imageDimensions.height
    ) * zoom;
    
    const displayWidth = imageDimensions.width * scale;
    const displayHeight = imageDimensions.height * scale;
    
    return {
      left: (boundingBox.x_min / 100) * displayWidth,
      top: (boundingBox.y_min / 100) * displayHeight,
      width: ((boundingBox.x_max - boundingBox.x_min) / 100) * displayWidth,
      height: ((boundingBox.y_max - boundingBox.y_min) / 100) * displayHeight,
      displayWidth,
      displayHeight
    };
  };

  const handleCropDiagram = async () => {
    if (!boundingBox || !sourceImage || !onCrop) return;
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = sourceImage;
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // Calculate crop coordinates in pixels
      const x = (boundingBox.x_min / 100) * img.naturalWidth;
      const y = (boundingBox.y_min / 100) * img.naturalHeight;
      const width = ((boundingBox.x_max - boundingBox.x_min) / 100) * img.naturalWidth;
      const height = ((boundingBox.y_max - boundingBox.y_min) / 100) * img.naturalHeight;
      
      // Add padding (5%)
      const padding = 0.05;
      const paddedX = Math.max(0, x - width * padding);
      const paddedY = Math.max(0, y - height * padding);
      const paddedWidth = Math.min(img.naturalWidth - paddedX, width * (1 + padding * 2));
      const paddedHeight = Math.min(img.naturalHeight - paddedY, height * (1 + padding * 2));
      
      canvas.width = paddedWidth;
      canvas.height = paddedHeight;
      
      ctx.drawImage(
        img,
        paddedX, paddedY, paddedWidth, paddedHeight,
        0, 0, paddedWidth, paddedHeight
      );
      
      // Create preview
      const previewUrl = canvas.toDataURL('image/png');
      setCroppedPreview(previewUrl);
      setShowCroppedPreview(true);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/png',
          0.95
        );
      });
      
      onCrop(blob);
    } catch (error) {
      console.error('Crop failed:', error);
    }
  };

  const handleGenerateImage = () => {
    if (graphDescription && onGenerateImage) {
      onGenerateImage(graphDescription);
    }
  };

  const pixelBox = calculatePixelBox();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-primary" />
            Diagram Detection - Page {pageNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Graph info badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {graphType && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Type: {graphType.replace('_', ' ')}
              </Badge>
            )}
            {boundingBox && (
              <Badge variant="outline" className="font-mono text-xs">
                ({boundingBox.x_min}%, {boundingBox.y_min}%) → ({boundingBox.x_max}%, {boundingBox.y_max}%)
              </Badge>
            )}
            {graphDescription && (
              <Badge variant="secondary" className="max-w-xs truncate">
                {graphDescription}
              </Badge>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Image with bounding box overlay */}
          <div className="relative border rounded-lg bg-muted/30 overflow-auto max-h-[500px]">
            <div 
              className="relative inline-block"
              style={{ 
                width: pixelBox?.displayWidth || 'auto',
                height: pixelBox?.displayHeight || 'auto'
              }}
            >
              <img
                ref={imageRef}
                src={sourceImage}
                alt="Source page"
                onLoad={handleImageLoad}
                className="max-w-none"
                style={{
                  width: pixelBox?.displayWidth || 'auto',
                  height: pixelBox?.displayHeight || 'auto'
                }}
              />
              
              {/* Darkened overlay outside bounding box */}
              {pixelBox && boundingBox && (
                <>
                  {/* Top overlay */}
                  <div 
                    className="absolute bg-black/40 left-0 right-0 top-0"
                    style={{ height: pixelBox.top }}
                  />
                  {/* Bottom overlay */}
                  <div 
                    className="absolute bg-black/40 left-0 right-0 bottom-0"
                    style={{ height: pixelBox.displayHeight - pixelBox.top - pixelBox.height }}
                  />
                  {/* Left overlay */}
                  <div 
                    className="absolute bg-black/40 left-0"
                    style={{ 
                      top: pixelBox.top,
                      width: pixelBox.left,
                      height: pixelBox.height
                    }}
                  />
                  {/* Right overlay */}
                  <div 
                    className="absolute bg-black/40 right-0"
                    style={{ 
                      top: pixelBox.top,
                      width: pixelBox.displayWidth - pixelBox.left - pixelBox.width,
                      height: pixelBox.height
                    }}
                  />
                  
                  {/* Bounding box highlight */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute border-2 border-primary rounded-sm shadow-lg"
                    style={{
                      left: pixelBox.left,
                      top: pixelBox.top,
                      width: pixelBox.width,
                      height: pixelBox.height
                    }}
                  >
                    {/* Corner handles */}
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-primary rounded-full" />
                    <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-primary rounded-full" />
                    <div className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-primary rounded-full" />
                    <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-primary rounded-full" />
                    
                    {/* Label */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded whitespace-nowrap">
                      Detected Diagram
                    </div>
                  </motion.div>
                </>
              )}
              
              {!boundingBox && imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg text-center">
                    <p className="text-sm font-medium">No diagram detected</p>
                    <p className="text-xs text-muted-foreground">Try AI generation based on question context</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cropped preview */}
          <AnimatePresence>
            {showCroppedPreview && croppedPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Cropped Diagram Preview
                  </span>
                </div>
                <img
                  src={croppedPreview}
                  alt="Cropped diagram"
                  className="max-w-xs max-h-40 rounded border object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="text-xs text-muted-foreground">
            {pixelBox && boundingBox && (
              <span>
                Crop area: {Math.round(pixelBox.width)}×{Math.round(pixelBox.height)}px
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {boundingBox && onCrop && (
              <Button
                onClick={handleCropDiagram}
                disabled={isCropping}
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
                    Crop & Save to Storage
                  </>
                )}
              </Button>
            )}
            
            {!boundingBox && graphDescription && onGenerateImage && (
              <Button
                onClick={handleGenerateImage}
                disabled={isGenerating}
                variant="secondary"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Missing Diagram
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoundingBoxOverlay;
