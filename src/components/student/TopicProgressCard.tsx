
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, Clock } from 'lucide-react';

const TopicProgressCard = () => {
  const topics = [
    {
      name: "Algebra",
      progress: 78,
      questionsCompleted: 89,
      totalQuestions: 114,
      lastStudied: "2 hours ago",
      difficulty: "Medium",
      criterion: "A & B",
      color: "bg-blue-500"
    },
    {
      name: "Statistics & Probability",
      progress: 45,
      questionsCompleted: 34,
      totalQuestions: 76,
      lastStudied: "Yesterday",
      difficulty: "Hard",
      criterion: "C & D",
      color: "bg-green-500"
    },
    {
      name: "Geometry",
      progress: 92,
      questionsCompleted: 115,
      totalQuestions: 125,
      lastStudied: "3 days ago",
      difficulty: "Easy",
      criterion: "A",
      color: "bg-purple-500"
    },
    {
      name: "Number Systems",
      progress: 65,
      questionsCompleted: 52,
      totalQuestions: 80,
      lastStudied: "1 week ago",
      difficulty: "Medium",
      criterion: "B",
      color: "bg-orange-500"
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Topic Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topics.map((topic, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{topic.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      MYP {topic.criterion}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{topic.questionsCompleted}/{topic.totalQuestions} questions</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {topic.lastStudied}
                    </span>
                  </div>
                </div>
                <Badge className={getDifficultyColor(topic.difficulty)}>
                  {topic.difficulty}
                </Badge>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{topic.progress}%</span>
                </div>
                <Progress value={topic.progress} className="h-2" />
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  Continue Learning
                </Button>
                <Button size="sm" variant="outline">
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-4">
          View All Topics
        </Button>
      </CardContent>
    </Card>
  );
};

export default TopicProgressCard;
