
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { sampleMathGraphTest } from '@/data/sampleMathGraphTest';

interface SampleTestLoaderProps {
  onLoadSample: (testData: any) => void;
}

const SampleTestLoader = ({ onLoadSample }: SampleTestLoaderProps) => {
  const handleLoadSample = () => {
    onLoadSample(sampleMathGraphTest);
  };

  return (
    <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-700 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Load Sample Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-600 mb-4">
          Want to see an example? Load a sample Mathematics test with graph questions to get started quickly.
        </p>
        <Button onClick={handleLoadSample} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
          Load Sample: Math - Linear Functions & Graphs
        </Button>
      </CardContent>
    </Card>
  );
};

export default SampleTestLoader;
