import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, Video, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ComponentConfig } from '../types';

interface MediaUploaderProps {
  component: ComponentConfig;
  onUpdate: (id: string, updates: Partial<ComponentConfig>) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ component, onUpdate }) => {
  const [urlInput, setUrlInput] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      onUpdate(component.id, {
        mediaUrl: previewUrl,
        settings: {
          ...component.settings,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      });
    }
  }, [component.id, component.settings, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUpdate(component.id, { mediaUrl: urlInput.trim() });
      setUrlInput('');
    }
  };

  const clearMedia = () => {
    onUpdate(component.id, {
      mediaUrl: undefined,
      settings: { ...component.settings, fileName: undefined, fileType: undefined, fileSize: undefined },
    });
  };

  if (component.mediaUrl) {
    const isVideo = component.settings?.fileType?.startsWith('video/') || 
                    component.mediaUrl.includes('.mp4') || 
                    component.mediaUrl.includes('.webm');

    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border bg-muted/30">
          {isVideo ? (
            <video
              src={component.mediaUrl}
              controls
              className="w-full max-h-[300px] object-contain"
            />
          ) : (
            <img
              src={component.mediaUrl}
              alt="Uploaded media"
              className="w-full max-h-[300px] object-contain"
            />
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={clearMedia}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {component.settings?.fileName && (
          <p className="text-xs text-muted-foreground truncate">
            {component.settings.fileName}
          </p>
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="upload" className="flex-1">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </TabsTrigger>
        <TabsTrigger value="url" className="flex-1">
          <Link2 className="w-4 h-4 mr-2" />
          URL
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-4">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <Image className="w-8 h-8 text-muted-foreground" />
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            {isDragActive ? (
              <p className="text-sm text-primary font-medium">Drop your file here</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Drag an image or video here
                </p>
                <p className="text-xs text-muted-foreground">or</p>
                <Button variant="secondary" size="sm" type="button">
                  Choose a file to upload
                </Button>
                <p className="text-xs text-muted-foreground">
                  Max size: 10MB
                </p>
              </>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="url" className="mt-4">
        <div className="space-y-3">
          <Input
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="w-full"
          >
            Add Media
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default MediaUploader;
