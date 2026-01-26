import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Eye, ChevronDown, Link2, Save, Upload, 
  FileText, Zap, BookOpen, Menu 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ExamBuilderHeaderProps {
  examName: string;
  onExamNameChange: (name: string) => void;
  onPreview: () => void;
  onPublish: (type: 'mock_test' | 'quick_test', subject?: string, topic?: string) => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
  totalQuestions?: number;
  totalMarks?: number;
}

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
];

const ExamBuilderHeader: React.FC<ExamBuilderHeaderProps> = ({
  examName,
  onExamNameChange,
  onPreview,
  onPublish,
  onSaveDraft,
  isSaving = false,
  totalQuestions = 0,
  totalMarks = 0,
}) => {
  const navigate = useNavigate();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishType, setPublishType] = useState<'mock_test' | 'quick_test'>('mock_test');
  const [subject, setSubject] = useState('Mathematics');
  const [topic, setTopic] = useState('');

  const handlePublish = () => {
    onPublish(publishType, subject, topic);
    setShowPublishDialog(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-auto sm:h-14 bg-primary flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-0 shadow-md gap-2 sm:gap-0"
      >
        {/* Left section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20 shrink-0"
            onClick={() => navigate('/admin/mock-tests')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={examName}
              onChange={(e) => onExamNameChange(e.target.value)}
              placeholder="Untitled Exam"
              className="bg-primary-foreground/10 border-none text-primary-foreground placeholder:text-primary-foreground/60 focus:ring-primary-foreground/30 w-full sm:w-[300px]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20 hidden sm:flex"
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats badges - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-none">
              {totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}
            </Badge>
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-none">
              {totalMarks} Marks
            </Badge>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 hidden sm:flex"
            onClick={onSaveDraft}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          
          <Button
            variant="secondary"
            className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 border-none"
            onClick={onPreview}
          >
            <Eye className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Publish</span>
                <ChevronDown className="w-4 h-4 ml-1 sm:ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => {
                setPublishType('mock_test');
                setShowPublishDialog(true);
              }}>
                <BookOpen className="w-4 h-4 mr-2" />
                Publish as Mock Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setPublishType('quick_test');
                setShowPublishDialog(true);
              }}>
                <Zap className="w-4 h-4 mr-2" />
                Publish as Quick Test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20 sm:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSaveDraft} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link2 className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Publish as {publishType === 'mock_test' ? 'Mock Test' : 'Quick Test'}
            </DialogTitle>
            <DialogDescription>
              {publishType === 'mock_test' 
                ? 'This will create a full mock exam that students can take with timer and comprehensive results.'
                : 'This will create a quick practice test for rapid student assessment.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                placeholder="e.g., Quadratic Equations"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Questions:</span>
                <span className="font-medium">{totalQuestions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Marks:</span>
                <span className="font-medium">{totalMarks}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
              <Upload className="w-4 h-4 mr-2" />
              Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExamBuilderHeader;
