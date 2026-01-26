import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, ChevronDown, Link2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExamBuilderHeaderProps {
  examName: string;
  onExamNameChange: (name: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
}

const ExamBuilderHeader: React.FC<ExamBuilderHeaderProps> = ({
  examName,
  onExamNameChange,
  onPreview,
  onPublish,
  onSaveDraft,
  isSaving = false,
}) => {
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-14 bg-primary flex items-center justify-between px-4 shadow-md"
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/20"
          onClick={() => navigate('/admin/mock-tests')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Input
            value={examName}
            onChange={(e) => onExamNameChange(e.target.value)}
            placeholder="Untitled Exam"
            className="bg-primary-foreground/10 border-none text-primary-foreground placeholder:text-primary-foreground/60 focus:ring-primary-foreground/30 w-[300px]"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Link2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/20"
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
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Publish
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPublish}>
              Publish Now
            </DropdownMenuItem>
            <DropdownMenuItem>
              Schedule Publish
            </DropdownMenuItem>
            <DropdownMenuItem>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
};

export default ExamBuilderHeader;
