import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Award, TrendingUp } from 'lucide-react';
import { UserProgress } from '@/hooks/useProgressTracking';

interface PerformanceCriteriaProps {
  userProgress: UserProgress | null;
  loading: boolean;
}

const PerformanceCriteria: React.FC<PerformanceCriteriaProps> = ({ userProgress, loading }) => {
  const criteriaData = [
    {
      key: 'knowledge_understanding',
      label: 'A - Knowledge & Understanding',
      description: 'Comprehension of mathematical concepts',
      color: 'from-[hsl(var(--adsavvy-blue))] to-blue-400'
    },
    {
      key: 'pattern_recognition',
      label: 'B - Pattern Recognition',
      description: 'Identifying and analyzing patterns',
      color: 'from-[hsl(var(--adsavvy-pink))] to-pink-400'
    },
    {
      key: 'communication',
      label: 'C - Communication',
      description: 'Expressing mathematical ideas clearly',
      color: 'from-purple-500 to-purple-400'
    },
    {
      key: 'real_life_applications',
      label: 'D - Real-life Applications',
      description: 'Applying concepts to real-world scenarios',
      color: 'from-[hsl(var(--adsavvy-yellow))]/80 to-yellow-400'
    }
  ];

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-md border-gray-100 animate-pulse">
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-xl transition-all border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Award className="w-6 h-6 text-[hsl(var(--adsavvy-yellow))]/80" />
          Performance Criteria Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {criteriaData.map((criterion, index) => {
          const value = Number(userProgress?.[criterion.key as keyof UserProgress] || 0);
          
          return (
            <div key={criterion.key} className="group animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-[hsl(var(--adsavvy-blue))] transition-colors">
                      {criterion.label}
                    </span>
                    {value > 0 && (
                      <TrendingUp className="w-4 h-4 text-green-500 animate-fade-in" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{criterion.description}</p>
                </div>
                <span className={`text-lg font-bold bg-gradient-to-r ${criterion.color} bg-clip-text text-transparent`}>
                  {value}%
                </span>
              </div>
              <div className="relative">
                <Progress 
                  value={value} 
                  className="h-3 bg-gray-100 transition-all duration-700" 
                />
                {value === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-medium">Start learning to progress</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PerformanceCriteria;
