import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Grid3X3, GripVertical, MousePointer, Layers, Calculator, Play } from 'lucide-react';
import { toast } from 'sonner';
import { loadInteractiveDemoTest } from '@/data/interactiveDemoSampleTest';
import ExamModeCard from './ExamModeCard';

const InteractiveDemoCard: React.FC = () => {
  const navigate = useNavigate();

  const handleTryDemo = () => {
    navigate('/mock-exams/interactive-demo');
  };

  const handleFullInteractive = () => {
    const demoTest = loadInteractiveDemoTest();
    navigate('/mock-exams/unified', {
      state: {
        testId: demoTest.testId,
        title: demoTest.title,
        subject: demoTest.subject,
        topic: demoTest.topic,
        duration: demoTest.duration,
        questions: demoTest.questions
      }
    });
    toast.success('✨ Full Interactive Mode loaded! Experience all question types.');
  };

  return (
    <ExamModeCard
      icon={Sparkles}
      iconGradient="bg-gradient-to-br from-violet-500 to-purple-600"
      title="Interactive Demo"
      badge={{
        text: "Try Interactive Types",
        gradient: "bg-secondary text-secondary-foreground border border-border"
      }}
      description="Experience all interactive question formats with sample data"
      features={[]}
      featureBadges={[
        { icon: Grid3X3, text: "Graph Canvas" },
        { icon: GripVertical, text: "Drag-Drop Matcher" },
        { icon: MousePointer, text: "Image Drop Zones" },
        { icon: Layers, text: "Step Builder" },
        { icon: Calculator, text: "Math Keyboard" }
      ]}
      stats="<strong>5 Sample Questions</strong> • <strong>20 marks</strong> • <strong>IB MYP Mathematics</strong>"
      borderColor="border-violet-500/20"
      bgGradient="bg-gradient-to-br from-card via-card to-violet-500/5"
      primaryButton={{
        icon: Sparkles,
        text: "Full Interactive Mode",
        gradient: "bg-gradient-to-r from-violet-500 to-purple-600",
        onClick: handleFullInteractive
      }}
      secondaryButton={{
        icon: Play,
        text: "Try Demo",
        onClick: handleTryDemo
      }}
      animationDelay={0.2}
    />
  );
};

export default InteractiveDemoCard;
