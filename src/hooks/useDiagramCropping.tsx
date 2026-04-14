import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  normalizeBoundingBox,
  adjustForRotation,
  isValidBoundingBox,
  calculateCropCoordinates,
  BoundingBox,
} from '@/lib/boundingBoxUtils';

export interface CropResult {
  url: string;
  filename: string;
}

export function useDiagramCropping() {
  const [isCropping, setIsCropping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const uploadCroppedImage = async (
    blob: Blob,
    questionNumber: number | string,
    pageNumber: number = 1
  ): Promise<CropResult | null> => {
    setIsCropping(true);
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const filename = `diagram-q${questionNumber}-p${pageNumber}-${timestamp}-${random}.png`;

      const { error } = await supabase.storage
        .from('question-images')
        .upload(filename, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload cropped diagram');
        return null;
      }

      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(filename);
      toast.success('Diagram cropped and saved!', { description: `Saved as ${filename}` });
      return { url: urlData.publicUrl, filename };
    } catch (error) {
      console.error('Cropping error:', error);
      toast.error('Failed to process cropped image');
      return null;
    } finally {
      setIsCropping(false);
    }
  };

  const cropFromSourceImage = async (
    sourceImage: string,
    rawBoundingBox: BoundingBox,
    questionNumber: number | string,
    pageNumber: number = 1,
    rotation: number = 0
  ): Promise<CropResult | null> => {
    setIsCropping(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = sourceImage;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Step 1: Normalize
      let box = normalizeBoundingBox(rawBoundingBox);
      console.log('[DiagramCrop] Original:', rawBoundingBox, '→ Normalized:', box, 'Rotation:', rotation);

      // Step 2: Rotation adjustment
      box = adjustForRotation(box, rotation);
      console.log('[DiagramCrop] After rotation:', box);

      // Step 3: Validate with fallback
      if (!isValidBoundingBox(box)) {
        console.warn('[DiagramCrop] Invalid box, using center fallback');
        box = { x_min: 20, y_min: 20, x_max: 80, y_max: 80 };
      }

      // Step 4: Calculate crop with padding and failsafe
      const { cropX, cropY, cropW, cropH } = calculateCropCoordinates(
        box!,
        img.naturalWidth,
        img.naturalHeight,
        10
      );

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/png',
          0.95
        );
      });

      return await uploadCroppedImage(blob, questionNumber, pageNumber);
    } catch (error) {
      console.error('Crop from source failed:', error);
      toast.error('Failed to crop diagram from source image');
      return null;
    } finally {
      setIsCropping(false);
    }
  };

  const generateMissingDiagram = async (
    description: string,
    questionText: string,
    questionNumber: number | string,
    diagramType?: string
  ): Promise<CropResult | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: { prompt: description, questionNumber, questionText, diagramType },
      });

      if (error) {
        console.error('Generation error:', error);
        toast.error('Failed to generate diagram');
        return null;
      }

      if (data?.imageUrl) {
        toast.success('Diagram generated!', { description: 'AI-generated diagram saved to storage' });
        return { url: data.imageUrl, filename: data.filename || `generated-q${questionNumber}.png` };
      }
      return null;
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate diagram');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isCropping,
    isGenerating,
    uploadCroppedImage,
    cropFromSourceImage,
    generateMissingDiagram,
  };
}
