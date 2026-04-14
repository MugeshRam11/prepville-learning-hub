import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  normalizeBoundingBox,
  adjustForRotation,
  isValidBoundingBox,
  calculateCropCoordinates,
  BoundingBox,
} from '@/lib/boundingBoxUtils';

interface DetectedDiagram {
  type: string;
  description?: string;
  boundingBox: BoundingBox;
  pageNumber: number;
  questionNumber?: string | number;
  rotation?: number;
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

  const loadImage = async (imageUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
      img.src = imageUrl;
    });
  };

  /**
   * Crop a region from an image using a normalized bounding box.
   * Applies normalization, rotation adjustment, validation, and failsafe.
   */
  const cropFromImage = async (
    img: HTMLImageElement,
    rawBoundingBox: BoundingBox,
    rotation: number = 0
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Step 1: Normalize (fix swaps, convert pixels→%, clamp)
    let box = normalizeBoundingBox(rawBoundingBox);
    console.log('[AutoCrop] Original box:', rawBoundingBox, '→ Normalized:', box, 'Rotation:', rotation);

    // Step 2: Adjust for page rotation
    box = adjustForRotation(box, rotation);
    console.log('[AutoCrop] After rotation adjustment:', box);

    // Step 3: Validate
    if (!isValidBoundingBox(box)) {
      console.warn('[AutoCrop] Invalid bounding box, using center fallback');
      box = { x_min: 20, y_min: 20, x_max: 80, y_max: 80 };
    }

    // Step 4: Calculate pixel coordinates with padding and failsafe
    const { cropX, cropY, cropW, cropH, usedFallback } = calculateCropCoordinates(
      box!,
      img.naturalWidth,
      img.naturalHeight,
      10
    );

    if (usedFallback) {
      console.warn('[AutoCrop] Used center fallback for crop');
    }

    canvas.width = cropW;
    canvas.height = cropH;

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
        'image/png',
        0.95
      );
    });
  };

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
        .upload(filename, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(filename);
      return { url: urlData.publicUrl, filename };
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const cropSingleDiagram = useCallback(async (
    sourceImageUrl: string,
    diagram: DetectedDiagram
  ): Promise<CroppedDiagram | null> => {
    try {
      const img = await loadImage(sourceImageUrl);
      const blob = await cropFromImage(img, diagram.boundingBox, diagram.rotation || 0);
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
        originalBoundingBox: diagram.boundingBox,
      };
    } catch (error) {
      console.error('Failed to crop diagram:', error);
      return null;
    }
  }, []);

  const autoCropAllDiagrams = useCallback(async (
    pageImages: { pageNumber: number; imageUrl: string; rotation?: number }[],
    detectedDiagrams: DetectedDiagram[]
  ): Promise<CroppedDiagram[]> => {
    setIsCropping(true);
    setCroppedDiagrams([]);
    const results: CroppedDiagram[] = [];
    const total = detectedDiagrams.length;
    setProgress({ total, completed: 0, current: 'Starting...' });

    try {
      const diagramsByPage = detectedDiagrams.reduce((acc, diagram) => {
        if (!acc[diagram.pageNumber]) acc[diagram.pageNumber] = [];
        acc[diagram.pageNumber].push(diagram);
        return acc;
      }, {} as Record<number, DetectedDiagram[]>);

      for (const [pageNumStr, diagrams] of Object.entries(diagramsByPage)) {
        const pageNumber = parseInt(pageNumStr);
        const pageImage = pageImages.find((p) => p.pageNumber === pageNumber);
        if (!pageImage) {
          console.warn(`No image found for page ${pageNumber}`);
          continue;
        }

        let img: HTMLImageElement;
        try {
          img = await loadImage(pageImage.imageUrl);
        } catch (error) {
          console.error(`Failed to load page ${pageNumber} image:`, error);
          continue;
        }

        const pageRotation = pageImage.rotation || 0;

        for (const diagram of diagrams) {
          setProgress((prev) => ({
            total,
            completed: prev?.completed || 0,
            current: `Cropping ${diagram.type} from page ${pageNumber}...`,
          }));

          try {
            const blob = await cropFromImage(img, diagram.boundingBox, diagram.rotation || pageRotation);
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
                originalBoundingBox: diagram.boundingBox,
              };
              results.push(croppedDiagram);
              setCroppedDiagrams((prev) => [...prev, croppedDiagram]);
            }
          } catch (error) {
            console.error(`Failed to crop diagram on page ${pageNumber}:`, error);
          }

          setProgress((prev) => ({
            total,
            completed: (prev?.completed || 0) + 1,
            current: `Completed ${(prev?.completed || 0) + 1} of ${total}`,
          }));
        }
      }

      toast.success(`Cropped ${results.length} diagrams!`, {
        description: `Successfully extracted ${results.length} of ${total} detected diagrams`,
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

  const extractDiagramsFromParsedData = useCallback((parsedQuestions: any[]): DetectedDiagram[] => {
    const diagrams: DetectedDiagram[] = [];

    for (const question of parsedQuestions) {
      if (question.detected_diagrams && Array.isArray(question.detected_diagrams)) {
        for (const diagram of question.detected_diagrams) {
          const rawBox = diagram.bounding_box || diagram.boundingBox;
          if (rawBox) {
            diagrams.push({
              type: diagram.type || diagram.diagram_type || 'unknown',
              description: diagram.description,
              boundingBox: rawBox,
              pageNumber: question.page_number || 1,
              questionNumber: question.question_number,
            });
          }
        }
      }

      if (question.diagram_bounding_box) {
        diagrams.push({
          type: question.diagram_type || 'diagram',
          description: question.diagram_description,
          boundingBox: question.diagram_bounding_box,
          pageNumber: question.page_number || 1,
          questionNumber: question.question_number,
        });
      }

      if (question.table_bounding_box) {
        diagrams.push({
          type: 'table',
          description: question.table_type || 'data table',
          boundingBox: question.table_bounding_box,
          pageNumber: question.page_number || 1,
          questionNumber: question.question_number,
        });
      }

      if (question.graph_bounding_box) {
        diagrams.push({
          type: question.graph_type || 'graph',
          description: question.graph_description,
          boundingBox: question.graph_bounding_box,
          pageNumber: question.page_number || 1,
          questionNumber: question.question_number,
        });
      }

      if (question.sub_questions && Array.isArray(question.sub_questions)) {
        for (const sub of question.sub_questions) {
          if (sub.diagram_bounding_box) {
            diagrams.push({
              type: sub.diagram_type || 'diagram',
              description: sub.diagram_description,
              boundingBox: sub.diagram_bounding_box,
              pageNumber: question.page_number || 1,
              questionNumber: `${question.question_number}${sub.sub_label || sub.label || ''}`,
            });
          }
        }
      }
    }

    return diagrams;
  }, []);

  const generateDiagram = useCallback(async (
    description: string,
    questionText: string,
    questionNumber: string | number,
    diagramType?: string
  ): Promise<CroppedDiagram | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: { prompt: description, questionNumber, questionText, diagramType },
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
        pageNumber: 0,
        originalBoundingBox: { x_min: 0, y_min: 0, x_max: 100, y_max: 100 },
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
    generateDiagram,
  };
}
