import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

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
      
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(filename, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload cropped diagram');
        return null;
      }
      
      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(filename);
      
      toast.success('Diagram cropped and saved!', {
        description: `Saved as ${filename}`
      });
      
      return {
        url: urlData.publicUrl,
        filename
      };
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
    boundingBox: BoundingBox,
    questionNumber: number | string,
    pageNumber: number = 1
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
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
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
      // The edge function now handles enhanced prompt generation based on diagram type
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: { 
          prompt: description, 
          questionNumber,
          questionText,
          diagramType
        }
      });
      
      if (error) {
        console.error('Generation error:', error);
        toast.error('Failed to generate diagram');
        return null;
      }
      
      if (data?.imageUrl) {
        toast.success('Diagram generated!', {
          description: 'AI-generated diagram saved to storage'
        });
        
        return {
          url: data.imageUrl,
          filename: data.filename || `generated-q${questionNumber}.png`
        };
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
    generateMissingDiagram
  };
}
