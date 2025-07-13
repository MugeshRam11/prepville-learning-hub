
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download } from 'lucide-react';
import { mathGraphMockTest } from '@/data/mathGraphMockTest';

interface MathGraphTestLoaderProps {
  onLoadTest: (testData: any) => void;
}

const MathGraphTestLoader = ({ onLoadTest }: MathGraphTestLoaderProps) => {
  const handleLoadMathGraphTest = () => {
    onLoadTest(mathGraphMockTest);
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <FileText className="w-5 h-5" />
          Mathematics Graph Test Available
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium text-blue-900">Mathematics Mock Test - Graph Analysis</h4>
          <p className="text-sm text-blue-700">
            A comprehensive test featuring graph theory and analysis questions with the uploaded graph image.
          </p>
          <div className="text-xs text-blue-600 space-y-1">
            <div>• Subject: Mathematics</div>
            <div>• Topic: Graph Theory and Analysis</div>
            <div>• Questions: 4 (including sub-questions)</div>
            <div>• Total Marks: 36</div>
            <div>• Includes uploaded graph image</div>
          </div>
        </div>
        
        <Button 
          onClick={handleLoadMathGraphTest}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Load Mathematics Graph Test
        </Button>
      </CardContent>
    </Card>
  );
};

export default MathGraphTestLoader;
