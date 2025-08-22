import React from 'react';
import { toast } from 'sonner';
import { Star, Trophy, Zap, Crown } from 'lucide-react';

export const showXPReward = (xpAmount: number, reason: string, isLevelUp?: boolean, newLevel?: number) => {
  if (isLevelUp && newLevel) {
    toast.success(`🎉 Level Up! Level ${newLevel}!`, {
      description: `+${xpAmount} XP • ${reason}`,
      duration: 5000,
      action: {
        label: "View Progress",
        onClick: () => window.location.href = '/level-details'
      }
    });
  } else if (xpAmount >= 50) {
    toast.success(`🏆 Big Reward!`, {
      description: `+${xpAmount} XP • ${reason}`,
      duration: 4000
    });
  } else if (xpAmount >= 25) {
    toast.success(`⭐ Nice Work!`, {
      description: `+${xpAmount} XP • ${reason}`,
      duration: 3000
    });
  } else {
    toast.success(`+${xpAmount} XP`, {
      description: reason,
      duration: 2000
    });
  }
};

export const showStreakMilestone = (days: number, xpReward: number) => {
  const getEmoji = (days: number) => {
    if (days >= 100) return '👑';
    if (days >= 30) return '🔥';
    if (days >= 14) return '⚡';
    if (days >= 7) return '🎯';
    return '⭐';
  };

  toast.success(`${getEmoji(days)} ${days}-Day Streak Milestone!`, {
    description: `+${xpReward} XP bonus reward!`,
    duration: 6000,
    action: {
      label: "View Level",
      onClick: () => window.location.href = '/level-details'
    }
  });
};