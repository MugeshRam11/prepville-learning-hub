import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface UploadProgressTrackerProps {
  progress: number;
  total: number;
}

const UploadProgressTracker = ({ progress, total }: UploadProgressTrackerProps) => {
  const percentage = Math.round((progress / total) * 100);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Uploading questions...</span>
            </div>
            <span className="text-sm text-gray-600">
              {progress} / {total}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
          <p className="text-sm text-gray-500 text-center">
            Processing record {progress} of {total}... ({percentage}%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadProgressTracker;
