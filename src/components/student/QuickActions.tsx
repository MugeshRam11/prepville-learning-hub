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
import { motion } from 'framer-motion';

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
    navigate('/graphing-tool');
  };

  const handleFormulaHelper = async () => {
    await updatePerformanceCriteria('knowledge_understanding', 3);
    toast.success("+3% Knowledge earned!");
    navigate('/formula-helper');
  };

  const handleTimedChallenge = async () => {
    await updatePerformanceCriteria('real_life_applications', 7);
    await addXP('timed_challenge', 15, 'Completed Timed Challenge');
    toast.success("+7% Application & +15 XP earned!");
    navigate('/timed-challenge');
  };

  const actions = [
    {
      title: "Quick Practice",
      description: "5–10 min focused boost",
      icon: Zap,
      color: "from-yellow-500 to-orange-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]",
      action: handleQuickPractice
    },
    {
      title: "Mock Test",
      description: "Full exam simulation",
      icon: Target,
      color: "from-blue-500 to-purple-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]",
      action: handleMockTest
    },
    {
      title: "Study Groups",
      description: "Learn with classmates",
      icon: Users,
      color: "from-green-500 to-teal-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]",
      action: handleStudyGroups
    },
    {
      title: "Video Lessons",
      description: "Step-by-step tutorials",
      icon: BookOpen,
      color: "from-pink-500 to-red-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]",
      action: handleVideoLessons
    },
    {
      title: "Graphing Tool",
      description: "Interactive math graphs",
      icon: PieChart,
      color: "from-indigo-500 to-blue-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]",
      action: handleGraphingTool
    },
    {
      title: "Formula Helper",
      description: "Math formulas & solver",
      icon: Calculator,
      color: "from-purple-500 to-pink-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]",
      action: handleFormulaHelper
    },
    {
      title: "Timed Challenge",
      description: "Beat your last score",
      icon: Clock,
      color: "from-orange-500 to-red-500",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]",
      action: handleTimedChallenge
    },
    {
      title: "Leaderboard",
      description: "See your ranking",
      icon: Trophy,
      color: "from-yellow-400 to-yellow-600",
      hoverGlow: "hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]",
      action: () => navigate('/leaderboard')
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-border/50 shadow-md hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              <Zap className="w-5 h-5 text-yellow-600" />
            </motion.div>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {actions.map((action, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  rotateX: -5,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  className={`h-auto p-4 flex flex-col items-center gap-3 w-full border-2 transition-all duration-300 hover:border-primary/30 ${action.hoverGlow} group relative overflow-hidden`}
                  onClick={action.action}
                >
                  {/* Gradient border effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent" />
                  
                  <motion.div 
                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center text-white shadow-lg relative z-10`}
                    whileHover={{ 
                      rotate: 360,
                      transition: { duration: 0.6 }
                    }}
                  >
                    <action.icon className="w-6 h-6" />
                  </motion.div>
                  <div className="text-center relative z-10">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickActions;
