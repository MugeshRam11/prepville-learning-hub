import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface DetectedDiagram {
  type: string;
  description?: string;
  boundingBox: BoundingBox;
  pageNumber: number;
  questionNumber?: string | number;
}

export interface CroppedDiagram {
  url: string;
  filename: string;
  type: string;
  questionNumber: string | number;
  pageNumber: number;
  originalBoundingBox: BoundingBox;
}

interface CropProgress {
  total: number;
  completed: number;
  current: string;
}

export function useAutoDiagramCropper() {
  const [isCropping, setIsCropping] = useState(false);
  const [progress, setProgress] = useState<CropProgress | null>(null);
  const [croppedDiagrams, setCroppedDiagrams] = useState<CroppedDiagram[]>([]);

  /**
   * Load an image from URL and return as HTMLImageElement
   */
  const loadImage = async (imageUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`Failed to load image: ${imageUrl}`));
      img.src = imageUrl;
    });
  };

  /**
   * Crop a region from an image using bounding box percentages
   */
  const cropFromImage = async (
    img: HTMLImageElement,
    boundingBox: BoundingBox,
    padding: number = 0.03 // 3% padding
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Calculate crop coordinates from percentages
    const x = (boundingBox.x_min / 100) * img.naturalWidth;
    const y = (boundingBox.y_min / 100) * img.naturalHeight;
    const width = ((boundingBox.x_max - boundingBox.x_min) / 100) * img.naturalWidth;
    const height = ((boundingBox.y_max - boundingBox.y_min) / 100) * img.naturalHeight;

    // Add padding
    const paddedX = Math.max(0, x - width * padding);
    const paddedY = Math.max(0, y - height * padding);
    const paddedWidth = Math.min(img.naturalWidth - paddedX, width * (1 + padding * 2));
    const paddedHeight = Math.min(img.naturalHeight - paddedY, height * (1 + padding * 2));

    canvas.width = paddedWidth;
    canvas.height = paddedHeight;

    // Draw cropped region
    ctx.drawImage(
      img,
      paddedX, paddedY, paddedWidth, paddedHeight,
      0, 0, paddedWidth, paddedHeight
    );

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/png',
        0.95
      );
    });
  };

  /**
   * Upload a cropped image blob to Supabase storage
   */
  const uploadCroppedImage = async (
    blob: Blob,
    questionNumber: string | number,
    pageNumber: number,
    diagramType: string
  ): Promise<{ url: string; filename: string } | null> => {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const sanitizedType = diagramType.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `cropped-${sanitizedType}-q${questionNumber}-p${pageNumber}-${timestamp}-${random}.png`;

      const { error } = await supabase.storage
        .from('question-images')
        .upload(filename, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(filename);

      return {
        url: urlData.publicUrl,
        filename
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  /**
   * Crop a single diagram from a source image
   */
  const cropSingleDiagram = useCallback(async (
    sourceImageUrl: string,
    diagram: DetectedDiagram
  ): Promise<CroppedDiagram | null> => {
    try {
      const img = await loadImage(sourceImageUrl);
      const blob = await cropFromImage(img, diagram.boundingBox);
      
      const result = await uploadCroppedImage(
        blob,
        diagram.questionNumber || 'unknown',
        diagram.pageNumber,
        diagram.type
      );

      if (!result) return null;

      return {
        url: result.url,
        filename: result.filename,
        type: diagram.type,
        questionNumber: diagram.questionNumber || 'unknown',
        pageNumber: diagram.pageNumber,
        originalBoundingBox: diagram.boundingBox
      };
    } catch (error) {
      console.error('Failed to crop diagram:', error);
      return null;
    }
  }, []);

  /**
   * Auto-crop all detected diagrams from page images
   */
  const autoCropAllDiagrams = useCallback(async (
    pageImages: { pageNumber: number; imageUrl: string }[],
    detectedDiagrams: DetectedDiagram[]
  ): Promise<CroppedDiagram[]> => {
    setIsCropping(true);
    setCroppedDiagrams([]);
    
    const results: CroppedDiagram[] = [];
    const total = detectedDiagrams.length;
    
    setProgress({ total, completed: 0, current: 'Starting...' });

    try {
      // Group diagrams by page number
      const diagramsByPage = detectedDiagrams.reduce((acc, diagram) => {
        if (!acc[diagram.pageNumber]) {
          acc[diagram.pageNumber] = [];
        }
        acc[diagram.pageNumber].push(diagram);
        return acc;
      }, {} as Record<number, DetectedDiagram[]>);

      // Process each page
      for (const [pageNumStr, diagrams] of Object.entries(diagramsByPage)) {
        const pageNumber = parseInt(pageNumStr);
        const pageImage = pageImages.find(p => p.pageNumber === pageNumber);
        
        if (!pageImage) {
          console.warn(`No image found for page ${pageNumber}`);
          continue;
        }

        // Load the page image once
        let img: HTMLImageElement;
        try {
          img = await loadImage(pageImage.imageUrl);
        } catch (error) {
          console.error(`Failed to load page ${pageNumber} image:`, error);
          continue;
        }

        // Process each diagram on this page
        for (const diagram of diagrams) {
          setProgress(prev => ({
            total,
            completed: prev?.completed || 0,
            current: `Cropping ${diagram.type} from page ${pageNumber}...`
          }));

          try {
            const blob = await cropFromImage(img, diagram.boundingBox);
            const result = await uploadCroppedImage(
              blob,
              diagram.questionNumber || 'unknown',
              pageNumber,
              diagram.type
            );

            if (result) {
              const croppedDiagram: CroppedDiagram = {
                url: result.url,
                filename: result.filename,
                type: diagram.type,
                questionNumber: diagram.questionNumber || 'unknown',
                pageNumber,
                originalBoundingBox: diagram.boundingBox
              };
              
              results.push(croppedDiagram);
              setCroppedDiagrams(prev => [...prev, croppedDiagram]);
            }
          } catch (error) {
            console.error(`Failed to crop diagram on page ${pageNumber}:`, error);
          }

          setProgress(prev => ({
            total,
            completed: (prev?.completed || 0) + 1,
            current: `Completed ${(prev?.completed || 0) + 1} of ${total}`
          }));
        }
      }

      toast.success(`Cropped ${results.length} diagrams!`, {
        description: `Successfully extracted ${results.length} of ${total} detected diagrams`
      });

      return results;
    } catch (error) {
      console.error('Auto-crop failed:', error);
      toast.error('Failed to auto-crop diagrams');
      return results;
    } finally {
      setIsCropping(false);
      setProgress(null);
    }
  }, []);

  /**
   * Extract diagrams from parsed question data
   */
  const extractDiagramsFromParsedData = useCallback((
    parsedQuestions: any[]
  ): DetectedDiagram[] => {
    const diagrams: DetectedDiagram[] = [];

    for (const question of parsedQuestions) {
      // Check main question diagrams
      if (question.detected_diagrams && Array.isArray(question.detected_diagrams)) {
        for (const diagram of question.detected_diagrams) {
          if (diagram.bounding_box || diagram.boundingBox) {
            diagrams.push({
              type: diagram.type || diagram.diagram_type || 'unknown',
              description: diagram.description,
              boundingBox: diagram.bounding_box || diagram.boundingBox,
              pageNumber: question.page_number || 1,
              questionNumber: question.question_number
            });
          }
        }
      }

      // Check single diagram field
      if (question.diagram_bounding_box) {
        diagrams.push({
          type: question.diagram_type || 'diagram',
          description: question.diagram_description,
          boundingBox: question.diagram_bounding_box,
          pageNumber: question.page_number || 1,
          questionNumber: question.question_number
        });
      }

      // Check table bounding boxes
      if (question.table_bounding_box) {
        diagrams.push({
          type: 'table',
          description: question.table_type || 'data table',
          boundingBox: question.table_bounding_box,
          pageNumber: question.page_number || 1,
          questionNumber: question.question_number
        });
      }

      // Check graph bounding boxes
      if (question.graph_bounding_box) {
        diagrams.push({
          type: question.graph_type || 'graph',
          description: question.graph_description,
          boundingBox: question.graph_bounding_box,
          pageNumber: question.page_number || 1,
          questionNumber: question.question_number
        });
      }

      // Check sub-questions
      if (question.sub_questions && Array.isArray(question.sub_questions)) {
        for (const sub of question.sub_questions) {
          if (sub.diagram_bounding_box) {
            diagrams.push({
              type: sub.diagram_type || 'diagram',
              description: sub.diagram_description,
              boundingBox: sub.diagram_bounding_box,
              pageNumber: question.page_number || 1,
              questionNumber: `${question.question_number}${sub.sub_label || sub.label || ''}`
            });
          }
        }
      }
    }

    return diagrams;
  }, []);

  /**
   * Generate a diagram using AI when source image is not available
   */
  const generateDiagram = useCallback(async (
    description: string,
    questionText: string,
    questionNumber: string | number,
    diagramType?: string
  ): Promise<CroppedDiagram | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: {
          prompt: description,
          questionNumber,
          questionText,
          diagramType
        }
      });

      if (error || !data?.imageUrl) {
        console.error('Diagram generation failed:', error);
        return null;
      }

      return {
        url: data.imageUrl,
        filename: data.filename || `generated-q${questionNumber}.png`,
        type: diagramType || 'generated',
        questionNumber,
        pageNumber: 0, // Generated, not from source
        originalBoundingBox: { x_min: 0, y_min: 0, x_max: 100, y_max: 100 }
      };
    } catch (error) {
      console.error('Generate diagram failed:', error);
      return null;
    }
  }, []);

  return {
    isCropping,
    progress,
    croppedDiagrams,
    cropSingleDiagram,
    autoCropAllDiagrams,
    extractDiagramsFromParsedData,
    generateDiagram
  };
}
