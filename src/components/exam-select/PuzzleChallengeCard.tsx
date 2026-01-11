import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Puzzle } from 'lucide-react';
import { toast } from 'sonner';
import { loadPuzzleSampleTest } from '@/data/puzzleDragDropSampleTest';
import ExamModeCard from './ExamModeCard';

const PuzzleChallengeCard: React.FC = () => {
  const navigate = useNavigate();

  const handleStartPuzzle = () => {
    const sampleTest = loadPuzzleSampleTest();
    navigate('/mock-exams/unified', {
      state: {
        testId: sampleTest.testId,
        title: sampleTest.title,
        subject: sampleTest.subject,
        topic: sampleTest.topic,
        questions: sampleTest.questions
      }
    });
    toast.success('🧩 Puzzle Challenge loaded! Try the drag & drop questions.');
  };

  // Puzzle preview badges
  const PuzzlePreview = () => (
    <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
            6:4
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
            3:4
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
            4:3
          </div>
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Interlocking puzzle pieces with glow effects & animations!
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <ExamModeCard
      icon={Puzzle}
      iconGradient="bg-gradient-to-br from-orange-500 to-amber-600"
      title="Puzzle Challenge"
      badge={{
        text: "NEW",
        gradient: "bg-gradient-to-r from-orange-500 to-amber-600"
      }}
      description="Interactive puzzle-style drag & drop matching questions"
      features={[
        {
          customIcon: <div className="w-4 h-4 rounded-full bg-orange-500" />,
          title: "Ratio Matching",
          bgColor: "bg-orange-500/5 border-orange-500/10"
        },
        {
          customIcon: <div className="w-4 h-4 rounded-full bg-cyan-500" />,
          title: "Equation Graphs",
          bgColor: "bg-amber-500/5 border-amber-500/10"
        },
        {
          customIcon: <div className="w-4 h-4 rounded-full bg-pink-500" />,
          title: "Probability",
          bgColor: "bg-yellow-500/5 border-yellow-500/10"
        }
      ]}
      bottomInfo={<PuzzlePreview />}
      stats="<strong>6 Questions</strong> • <strong>25 marks</strong> • Ratios, Equations, Probability, Geometry"
      borderColor="border-orange-500/30"
      bgGradient="bg-gradient-to-br from-card via-card to-orange-500/5"
      primaryButton={{
        icon: Puzzle,
        text: "Start Puzzle Challenge",
        gradient: "bg-gradient-to-r from-orange-500 to-amber-600",
        onClick: handleStartPuzzle
      }}
      animationDelay={0.1}
    />
  );
};

export default PuzzleChallengeCard;
