import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Star, Award, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneRewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: number;
  rewardXp: number;
  message: string;
  isNewBest?: boolean;
}

const MilestoneRewardPopup = ({ 
  isOpen, 
  onClose, 
  milestone, 
  rewardXp, 
  message, 
  isNewBest = false 
}: MilestoneRewardPopupProps) => {
  const getMilestoneIcon = () => {
    if (milestone >= 365) return <Star className="w-16 h-16 text-yellow-500" />;
    if (milestone >= 100) return <Trophy className="w-16 h-16 text-purple-500" />;
    if (milestone >= 30) return <Award className="w-16 h-16 text-blue-500" />;
    if (milestone >= 7) return <Flame className="w-16 h-16 text-orange-500" />;
    return <Zap className="w-16 h-16 text-green-500" />;
  };

  const getMilestoneColor = () => {
    if (milestone >= 365) return "from-yellow-400 to-orange-500";
    if (milestone >= 100) return "from-purple-400 to-pink-500";
    if (milestone >= 30) return "from-blue-400 to-purple-500";
    if (milestone >= 7) return "from-orange-400 to-red-500";
    return "from-green-400 to-blue-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <div className="text-center space-y-6 py-6">
          {/* Animated Icon */}
          <div className="relative">
            <div className={cn(
              "absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse",
              `bg-gradient-to-r ${getMilestoneColor()}`
            )} />
            <div className="relative bg-white rounded-full p-8 border-4 border-gray-100 shadow-lg animate-bounce">
              {getMilestoneIcon()}
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <DialogHeader>
              <DialogTitle className={cn(
                "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                getMilestoneColor()
              )}>
                🎉 Milestone Achieved!
              </DialogTitle>
            </DialogHeader>
            
            {isNewBest && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                🏆 New Personal Best!
              </Badge>
            )}
          </div>

          {/* Milestone Details */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {milestone} Days
              </div>
              <div className="text-sm text-gray-600">Consecutive Streak</div>
            </div>

            <div className="text-lg font-semibold text-gray-700">
              {message}
            </div>

            {/* XP Reward */}
            <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border border-green-200">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-green-700">+{rewardXp} XP Earned!</span>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
          </div>

          {/* Encouragement */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm font-medium text-orange-800 mb-1">
              🔥 You're unstoppable!
            </div>
            <div className="text-xs text-orange-600">
              Keep this momentum going and reach even greater heights!
            </div>
          </div>

          {/* Action Button */}
          <Button 
            onClick={onClose}
            className={cn(
              "w-full py-3 text-white font-semibold shadow-lg transition-all duration-200",
              `bg-gradient-to-r ${getMilestoneColor()} hover:shadow-xl hover:scale-105`
            )}
          >
            Continue Learning! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MilestoneRewardPopup;