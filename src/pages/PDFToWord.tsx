import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import PDFToWordConverter from '@/components/admin/PDFToWordConverter';

const PDFToWord = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar activeTab="tests" onTabChange={() => {}} />
      
      <div className="flex-1 ml-64">
        {/* Header */}
        <div className="bg-card border-b border-border px-8 py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">PDF to Word Converter</h1>
          <p className="text-muted-foreground mt-1">
            Extract text and images from PDF files and generate Word documents
          </p>
        </div>

        {/* Main Content */}
        <div className="p-8 max-w-4xl">
          <div className="space-y-6">
            <div className="bg-accent/50 rounded-lg p-6 border border-border">
              <h2 className="text-lg font-semibold mb-2">How it works (AI-Powered)</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Upload your PDF file (drag & drop or click to browse)</li>
                <li>Each page is rendered as a high-quality image</li>
                <li>AI (Lovable AI - Gemini 2.5 Flash) performs OCR to extract text, tables, and diagrams</li>
                <li>Diagrams, tables, and mathematical content are accurately identified</li>
                <li>A comprehensive Word document is generated with all content</li>
                <li>Download your formatted Word document with 100% accuracy</li>
              </ol>
            </div>

            <PDFToWordConverter 
              onSuccess={() => {
                // Optional: Add any success handling here
              }} 
            />

            <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
              <h3 className="text-sm font-semibold mb-2 text-primary">💡 Pro Tips</h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                <li>AI OCR works on both text-based and scanned PDFs</li>
                <li>Accurately extracts tables, Venn diagrams, and mathematical formulas</li>
                <li>Each page is processed individually for maximum accuracy</li>
                <li>Generated Word files contain both OCR text and original page images</li>
                <li>Supports complex layouts with mixed content (text, tables, diagrams)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFToWord;
