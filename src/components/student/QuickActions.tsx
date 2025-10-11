
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Target, 
  Users, 
  BookOpen, 
  Calculator, 
  PieChart,
  Clock,
  Trophy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useXPSystem } from '@/hooks/useXPSystem';
import { toast } from 'sonner';

const QuickActions = () => {
  const navigate = useNavigate();
  const { updatePerformanceCriteria } = useProgressTracking();
  const { addXP } = useXPSystem();

  const handleQuickPractice = async () => {
    await updatePerformanceCriteria('knowledge_understanding', 5);
    await addXP('quick_practice', 10, 'Completed Quick Practice');
    toast.success("+5% Knowledge & +10 XP earned!");
    navigate('/quick-practice');
  };

  const handleMockTest = async () => {
    await updatePerformanceCriteria('real_life_applications', 10);
    await addXP('mock_test', 20, 'Completed Mock Test');
    toast.success("+10% Application & +20 XP earned!");
    navigate('/mock-exams/select');
  };

  const handleStudyGroups = async () => {
    await updatePerformanceCriteria('pattern_recognition', 5);
    await addXP('study_groups', 10, 'Joined Study Group');
    toast.success("+5% Pattern Recognition & +10 XP earned!");
    navigate('/study-groups');
  };

  const handleVideoLessons = async () => {
    await updatePerformanceCriteria('communication', 5);
    await addXP('video_lessons', 10, 'Watched Video Lesson');
    toast.success("+5% Communication & +10 XP earned!");
    navigate('/videos');
  };

  const handleGraphingTool = async () => {
    await updatePerformanceCriteria('knowledge_understanding', 3);
    toast.success("+3% Knowledge earned!");
  };

  const handleFormulaHelper = async () => {
    await updatePerformanceCriteria('knowledge_understanding', 3);
    toast.success("+3% Knowledge earned!");
  };

  const handleTimedChallenge = async () => {
    await updatePerformanceCriteria('real_life_applications', 7);
    await addXP('timed_challenge', 15, 'Completed Timed Challenge');
    toast.success("+7% Application & +15 XP earned!");
  };

  const actions = [
    {
      title: "Quick Practice",
      description: "5-10 min focused practice",
      icon: Zap,
      color: "bg-gradient-to-r from-yellow-500 to-orange-500",
      action: handleQuickPractice
    },
    {
      title: "Mock Test",
      description: "Full exam simulation",
      icon: Target,
      color: "bg-gradient-to-r from-blue-500 to-purple-500",
      action: handleMockTest
    },
    {
      title: "Study Groups",
      description: "Learn with classmates",
      icon: Users,
      color: "bg-gradient-to-r from-green-500 to-teal-500",
      action: handleStudyGroups
    },
    {
      title: "Video Lessons",
      description: "Step-by-step tutorials",
      icon: BookOpen,
      color: "bg-gradient-to-r from-pink-500 to-red-500",
      action: handleVideoLessons
    },
    {
      title: "Graphing Tool",
      description: "Interactive math graphs",
      icon: PieChart,
      color: "bg-gradient-to-r from-indigo-500 to-blue-500",
      action: handleGraphingTool
    },
    {
      title: "Formula Helper",
      description: "Math formulas & solver",
      icon: Calculator,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      action: handleFormulaHelper
    },
    {
      title: "Timed Challenge",
      description: "Beat the clock!",
      icon: Clock,
      color: "bg-gradient-to-r from-orange-500 to-red-500",
      action: handleTimedChallenge
    },
    {
      title: "Leaderboard",
      description: "See your ranking",
      icon: Trophy,
      color: "bg-gradient-to-r from-yellow-400 to-yellow-600",
      action: () => {}
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-3 hover:scale-105 transition-transform border-2 hover:border-primary/20"
              onClick={action.action}
            >
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center text-white shadow-lg`}>
                <action.icon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
