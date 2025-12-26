import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Target, BookOpen, TrendingUp } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  currentStreak: number;
  weeklyCompleted: number;
  weeklyGoal: number;
  totalQuestions: number;
  correctAnswers: number;
  mockTestSolved?: number;
  subjectTestSolved?: number;
  quickTestSolved?: number;
  totalSolved?: number;
}

const StatsCards = ({
  currentStreak,
  weeklyCompleted,
  weeklyGoal,
  totalQuestions,
  correctAnswers,
  mockTestSolved = 0,
  subjectTestSolved = 0,
  quickTestSolved = 0,
  totalSolved = 0
}: StatsCardsProps) => {
  const { user } = useAuth();

  const animatedStreak = useAnimatedCounter({
    end: currentStreak || 0,
    duration: 1200
  });
  const animatedWeeklyCompleted = useAnimatedCounter({
    end: weeklyCompleted || 0,
    duration: 1200
  });
  const animatedTotalQuestions = useAnimatedCounter({
    end: totalQuestions || 0,
    duration: 1500
  });
  const accuracy = totalQuestions > 0 ? Math.round(correctAnswers / totalQuestions * 100) : 0;
  const animatedAccuracy = useAnimatedCounter({
    end: accuracy,
    duration: 1500
  });

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const
      }
    })
  };

  const iconVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.15,
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.4 }
    }
  };

  const stats = [
    {
      icon: Flame,
      value: Math.round(animatedStreak),
      label: 'Day Streak',
      suffix: '',
      gradientFrom: 'from-[hsl(var(--adsavvy-pink))]/15',
      gradientTo: 'to-[hsl(var(--adsavvy-pink))]/5',
      borderColor: 'border-[hsl(var(--adsavvy-pink))]/30',
      iconColor: 'text-[hsl(var(--adsavvy-pink))]',
      glowColor: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]',
      isLarge: true
    },
    {
      icon: Target,
      value: `${Math.round(animatedWeeklyCompleted)}/${weeklyGoal}`,
      label: 'Weekly Goal',
      suffix: '',
      gradientFrom: 'from-[hsl(var(--adsavvy-yellow))]/30',
      gradientTo: 'to-[hsl(var(--adsavvy-yellow))]/10',
      borderColor: 'border-[hsl(var(--adsavvy-yellow))]/40',
      iconColor: 'text-yellow-600',
      glowColor: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]',
      isLarge: false
    },
    {
      icon: BookOpen,
      value: Math.round(animatedTotalQuestions),
      label: 'Questions Solved',
      suffix: '',
      gradientFrom: 'from-[hsl(var(--adsavvy-blue))]/15',
      gradientTo: 'to-[hsl(var(--adsavvy-blue))]/5',
      borderColor: 'border-[hsl(var(--adsavvy-blue))]/30',
      iconColor: 'text-[hsl(var(--adsavvy-blue))]',
      glowColor: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
      isLarge: false
    },
    {
      icon: TrendingUp,
      value: Math.round(animatedAccuracy),
      label: 'Accuracy',
      suffix: '%',
      gradientFrom: 'from-purple-100/60',
      gradientTo: 'to-purple-50',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      glowColor: 'hover:shadow-[0_0_30px_rgba(147,51,234,0.3)]',
      isLarge: true,
      showRing: true,
      ringValue: accuracy
    }
  ];

  return (
    <>
      <motion.div 
        className="flex justify-between items-center mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold text-foreground">Your Stats</h2>
      </motion.div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{ 
              scale: 1.05,
              y: -5,
              transition: { duration: 0.2 }
            }}
          >
            <Card className={cn(
              `bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} ${stat.borderColor} rounded-2xl transition-all duration-300 cursor-default`,
              stat.glowColor
            )}>
              <CardContent className="p-6 text-center relative overflow-hidden">
                {/* Subtle animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <motion.div
                  variants={iconVariants}
                  initial="initial"
                  whileHover="hover"
                  className="inline-block"
                >
                  <stat.icon className={cn(
                    "w-10 h-10 mx-auto mb-3",
                    stat.iconColor,
                    stat.isLarge && "w-12 h-12"
                  )} />
                </motion.div>
                
                {stat.showRing ? (
                  <div className="relative inline-block mb-1">
                    {/* Circular progress ring for accuracy */}
                    <svg className="w-20 h-20 mx-auto" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-purple-100"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="text-purple-600"
                        strokeDasharray={220}
                        initial={{ strokeDashoffset: 220 }}
                        animate={{ strokeDashoffset: 220 - (220 * (stat.ringValue || 0)) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn(
                        "text-2xl font-bold text-foreground",
                        stat.isLarge && "text-3xl"
                      )}>
                        {stat.value}{stat.suffix}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "text-3xl font-bold text-foreground tabular-nums",
                    stat.isLarge && "text-4xl"
                  )}>
                    {stat.value}{stat.suffix}
                  </div>
                )}
                
                <div className="text-sm font-medium text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  );
};

export default StatsCards;
