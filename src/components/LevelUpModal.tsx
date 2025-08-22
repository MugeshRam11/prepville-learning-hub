import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Sparkles } from 'lucide-react';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  levelTitle: string;
  newBenefits: string[];
  xpEarned: number;
}

const LevelUpModal = ({ 
  isOpen, 
  onClose, 
  newLevel, 
  levelTitle, 
  newBenefits, 
  xpEarned 
}: LevelUpModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Level Up!
          </DialogTitle>
          <DialogDescription className="text-lg">
            Congratulations! You've reached level {newLevel}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{newLevel}</div>
            <div className="text-lg font-semibold text-muted-foreground">{levelTitle}</div>
            <Badge variant="secondary" className="mt-2">
              +{xpEarned} XP Earned
            </Badge>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              New Benefits Unlocked:
            </h4>
            <div className="space-y-1">
              {newBenefits.slice(0, 3).map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {benefit}
                </div>
              ))}
              {newBenefits.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{newBenefits.length - 3} more benefits
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Continue Learning
          </Button>
          <Button 
            className="flex-1" 
            onClick={() => {
              onClose();
              window.location.href = '/level-details';
            }}
          >
            View Progress
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelUpModal;