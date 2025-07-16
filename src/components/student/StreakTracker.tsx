
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Calendar } from 'lucide-react';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
}

const StreakTracker = ({ currentStreak, longestStreak }: StreakTrackerProps) => {
  // Generate calendar for the last 7 days
  const generateWeekCalendar = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Mock activity data - in real app, this would come from user data
      const isActive = Math.random() > 0.3; // 70% chance of activity
      const isToday = i === 0;
      
      days.push({
        date: date.getDate(),
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        isActive,
        isToday
      });
    }
    
    return days;
  };

  const weekDays = generateWeekCalendar();

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Flame className="w-5 h-5" />
          Streak Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-600 mb-1">
            {currentStreak} 🔥
          </div>
          <div className="text-sm text-orange-700">Days in a row</div>
        </div>

        {/* Week Calendar */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-orange-800 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            This Week
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-orange-600 mb-1">{day.dayName}</div>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    day.isActive 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-orange-100 text-orange-400'
                  } ${day.isToday ? 'ring-2 ring-orange-600' : ''}`}
                >
                  {day.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-3 border-t border-orange-200">
          <div className="flex justify-between text-sm">
            <span className="text-orange-700">Best Streak:</span>
            <span className="font-medium text-orange-800">{longestStreak} days</span>
          </div>
        </div>

        {/* Motivation */}
        <div className="text-center p-3 bg-orange-100 rounded-lg">
          <div className="text-sm font-medium text-orange-800 mb-1">
            Keep it up! 🎯
          </div>
          <div className="text-xs text-orange-600">
            Just {7 - (currentStreak % 7)} more days to complete this week!
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakTracker;
