import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, Download, FileDown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFToWordConverterProps {
  onSuccess?: () => void;
}

const PDFToWordConverter: React.FC<PDFToWordConverterProps> = ({ onSuccess }) => {
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [extractedData, setExtractedData] = useState<{
    text: string;
    images: string[];
    fileName: string;
  } | null>(null);

  const uploadImageToStorage = async (base64Data: string, contentType: string): Promise<string | null> => {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = contentType.split('/')[1] || 'png';
      const fileName = `pdf-extract-${timestamp}-${random}.${extension}`;

      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, blob, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Image upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload image:', error);
      return null;
    }
  };

  const extractPDFContent = async (file: File) => {
    setCurrentStep('Loading PDF...');
    setProgress(10);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    const imageUrls: string[] = [];

    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      setCurrentStep(`Processing page ${pageNum} of ${pdf.numPages}...`);
      setProgress(10 + (pageNum / pdf.numPages) * 40);

      const page = await pdf.getPage(pageNum);

      // Extract text
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';

      // Extract images
      try {
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
          await page.render({ 
            canvasContext: context, 
            viewport,
            canvas 
          }).promise;
          
          // Convert canvas to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/png');
          });

          // Convert to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64.split(',')[1]);
            };
          });
          reader.readAsDataURL(blob);
          const base64Data = await base64Promise;

          // Upload to storage
          const imageUrl = await uploadImageToStorage(base64Data, 'image/png');
          if (imageUrl) {
            imageUrls.push(imageUrl);
            console.log(`✅ Page ${pageNum} image uploaded: ${imageUrl}`);
          }
        }
      } catch (error) {
        console.error(`Error extracting image from page ${pageNum}:`, error);
      }
    }

    return { text: fullText, images: imageUrls };
  };

  const convertToWord = async () => {
    if (!extractedData) return;

    try {
      setCurrentStep('Generating Word document...');
      setProgress(80);

      const response = await supabase.functions.invoke('pdf-to-word', {
        body: {
          extractedText: extractedData.text,
          extractedImages: extractedData.images,
          fileName: extractedData.fileName
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setProgress(100);
      setCurrentStep('Download ready!');

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${extractedData.fileName.replace('.pdf', '')}_extracted.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Word document created successfully!');
      onSuccess?.();

    } catch (error: any) {
      console.error('Conversion error:', error);
      toast.error(error.message || 'Failed to convert to Word');
    }
  };

  const processFile = async (file: File) => {
    setConverting(true);
    setProgress(0);
    setExtractedData(null);

    try {
      // Extract PDF content
      const { text, images } = await extractPDFContent(file);

      setProgress(70);
      setCurrentStep('Processing complete!');

      setExtractedData({
        text,
        images,
        fileName: file.name
      });

      toast.success(`Extracted ${images.length} images and ${text.length} characters of text`);

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(error.message || 'Failed to process PDF');
      setConverting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: converting
  });

  const handleDownload = async () => {
    await convertToWord();
    setConverting(false);
    setProgress(0);
    setCurrentStep('');
    setExtractedData(null);
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          PDF to Word Converter
        </CardTitle>
        <CardDescription>
          Upload a PDF to extract text and images, then download as a Word document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
            } ${converting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {converting ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm font-medium">{currentStep}</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {isDragActive ? 'Drop your PDF here' : 'Drag & drop PDF or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports PDF files with text and images
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {converting && !extractedData && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {extractedData && (
          <div className="space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Extraction Complete</span>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>📄 File: {extractedData.fileName}</p>
                <p>📝 Text: {extractedData.text.length} characters</p>
                <p>🖼️ Images: {extractedData.images.length} extracted</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="flex-1"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Word Document
              </Button>
              <Button
                onClick={() => {
                  setExtractedData(null);
                  setProgress(0);
                  setCurrentStep('');
                  setConverting(false);
                }}
                variant="outline"
                size="lg"
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFToWordConverter;
