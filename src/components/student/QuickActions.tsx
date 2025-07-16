
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

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Quick Practice",
      description: "5-10 min focused practice",
      icon: Zap,
      color: "bg-gradient-to-r from-yellow-500 to-orange-500",
      action: () => navigate('/quick-practice')
    },
    {
      title: "Mock Test",
      description: "Full exam simulation",
      icon: Target,
      color: "bg-gradient-to-r from-blue-500 to-purple-500",
      action: () => navigate('/mock-exams/select')
    },
    {
      title: "Study Groups",
      description: "Learn with classmates",
      icon: Users,
      color: "bg-gradient-to-r from-green-500 to-teal-500",
      action: () => {}
    },
    {
      title: "Video Lessons",
      description: "Step-by-step tutorials",
      icon: BookOpen,
      color: "bg-gradient-to-r from-pink-500 to-red-500",
      action: () => navigate('/videos')
    },
    {
      title: "Graphing Tool",
      description: "Interactive math graphs",
      icon: PieChart,
      color: "bg-gradient-to-r from-indigo-500 to-blue-500",
      action: () => {}
    },
    {
      title: "Formula Helper",
      description: "Math formulas & solver",
      icon: Calculator,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      action: () => {}
    },
    {
      title: "Timed Challenge",
      description: "Beat the clock!",
      icon: Clock,
      color: "bg-gradient-to-r from-orange-500 to-red-500",
      action: () => {}
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
