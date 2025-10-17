import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Database } from 'lucide-react';
import Header from '@/components/Header';

const AdminAIKnowledgeBase = () => {
  const [jsonlData, setJsonlData] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!jsonlData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste JSONL data first",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('upload-training-data', {
        body: { jsonlData }
      });

      if (error) throw error;

      setStats(data);
      toast({
        title: "Success!",
        description: `Uploaded ${data.inserted} knowledge entries to the AI tutor`
      });
      setJsonlData('');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload training data",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonlData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">AI Knowledge Base Training</h1>
            <p className="text-muted-foreground">
              Upload training data in JSONL format to enhance the AI tutor's knowledge
            </p>
          </div>

          {stats && (
            <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Upload Complete!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Successfully inserted {stats.inserted} out of {stats.total} knowledge entries
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload JSONL File
                </label>
                <input
                  type="file"
                  accept=".jsonl,.json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a .jsonl file containing training conversations
                </p>
              </div>

              <div className="text-center text-muted-foreground text-sm">
                OR
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Paste JSONL Data
                </label>
                <Textarea
                  value={jsonlData}
                  onChange={(e) => setJsonlData(e.target.value)}
                  placeholder='{"messages": [{"role": "user", "content": "question"}, {"role": "assistant", "content": "answer"}]}'
                  className="min-h-[300px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Each line should be a separate JSON object with a "messages" array
                </p>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!jsonlData.trim() || isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Training Data
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="mt-6 p-6">
            <h2 className="font-semibold mb-3">Expected Format</h2>
            <div className="bg-muted p-4 rounded-md overflow-x-auto">
              <pre className="text-xs">
{`{"messages": [
  {
    "role": "user",
    "content": "How do I solve x² + 4x + 4 = 0?"
  },
  {
    "role": "assistant",
    "content": "Let's solve this step by step. This is a quadratic equation..."
  }
]}`}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The system will extract Q&A pairs from your conversations and add them to the knowledge base
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAIKnowledgeBase;
