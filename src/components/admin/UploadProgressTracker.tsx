import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, Clock, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadProgressTrackerProps {
  isUploading: boolean;
  progress: number;
  fileName?: string;
  fileSize?: number;
  stage?: string;
  pageProgress?: { current: number; total: number } | null;
}

const UploadProgressTracker = ({ 
  isUploading, 
  progress, 
  fileName, 
  fileSize,
  stage = 'Uploading file...',
  pageProgress
}: UploadProgressTrackerProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Play subtle tick sound
  const playTick = () => {
    if (isMuted || !audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.type = 'sine';
      
      // Very subtle volume
      gainNode.gain.setValueAtTime(0.02, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Silent fail for audio
    }
  };

  // Initialize audio context
  useEffect(() => {
    if (!isMuted && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isMuted]);

  // Timer logic
  useEffect(() => {
    if (isUploading) {
      setElapsedSeconds(0);
      setShowSlowWarning(false);
      
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newTime = prev + 1;
          // Show slow warning after 30 seconds
          if (newTime >= 30 && !showSlowWarning) {
            setShowSlowWarning(true);
          }
          return newTime;
        });
      }, 1000);

      // Tick sound interval
      if (!isMuted) {
        tickIntervalRef.current = setInterval(() => {
          playTick();
        }, 1000);
      }
    } else {
      // Reset when upload completes
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [isUploading, isMuted]);

  if (!isUploading) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-sky-50/50 via-blue-50/30 to-indigo-50/50 dark:from-sky-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 shadow-lg">
      <CardContent className="pt-6">
        <div className="space-y-5">
          {/* Header with timer and mute button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary animate-pulse" />
                </div>
                {/* Spinning loader ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <div>
                <p className="font-medium text-foreground">{stage}</p>
                {fileName && (
                  <p className="text-sm text-muted-foreground">
                    {fileName} {fileSize ? `– ${formatFileSize(fileSize)}` : ''}
                  </p>
                )}
              </div>
            </div>
            
            {/* Timer and mute */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
                <Clock className={cn(
                  "h-4 w-4 text-primary",
                  isUploading && "animate-pulse"
                )} />
                <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Enable sound' : 'Mute sound'}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-primary" />
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar with percentage */}
          <div className="space-y-2">
            <div className="relative">
              <Progress 
                value={progress} 
                className="h-3 bg-primary/10" 
              />
              {/* Progress glow effect */}
              <div 
                className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {pageProgress ? (
                  <>Page <span className="font-mono font-medium text-foreground">{pageProgress.current}/{pageProgress.total}</span> • <span className="font-mono">{formatTime(elapsedSeconds)}</span></>
                ) : (
                  <>Elapsed: <span className="font-mono font-medium text-foreground">{formatTime(elapsedSeconds)}</span></>
                )}
              </span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Slow upload warning */}
          {showSlowWarning && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Upload is taking longer than usual. Please keep this window open.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadProgressTracker;
