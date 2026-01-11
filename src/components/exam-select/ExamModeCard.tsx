import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureItem {
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  bgColor: string;
  iconColor?: string;
}

interface ExamModeCardProps {
  icon: LucideIcon;
  iconGradient: string;
  title: string;
  badge?: {
    text: string;
    gradient: string;
  };
  description: string;
  features: FeatureItem[];
  featureBadges?: {
    icon: LucideIcon;
    text: string;
  }[];
  stats?: string;
  bottomInfo?: React.ReactNode;
  borderColor: string;
  bgGradient: string;
  primaryButton: {
    icon: LucideIcon;
    text: string;
    gradient: string;
    onClick: () => void;
  };
  secondaryButton?: {
    icon: LucideIcon;
    text: string;
    onClick: () => void;
  };
  animationDelay?: number;
}

const ExamModeCard: React.FC<ExamModeCardProps> = ({
  icon: Icon,
  iconGradient,
  title,
  badge,
  description,
  features,
  featureBadges,
  stats,
  bottomInfo,
  borderColor,
  bgGradient,
  primaryButton,
  secondaryButton,
  animationDelay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.4 }}
    >
      <Card className={cn(
        "overflow-hidden border-2 transition-all duration-300 hover:shadow-xl",
        borderColor,
        bgGradient
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl text-white", iconGradient)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                {title}
                {badge && (
                  <Badge className={cn("text-white font-semibold", badge.gradient)}>
                    {badge.text}
                  </Badge>
                )}
              </h2>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Feature Grid */}
          {features.length > 0 && (
            <div className={cn(
              "grid gap-3",
              features.length === 4 ? "grid-cols-2 md:grid-cols-4" : 
              features.length === 3 ? "grid-cols-2 md:grid-cols-3" : 
              "grid-cols-2"
            )}>
              {features.map((feature, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border",
                    feature.bgColor
                  )}
                >
                  {feature.customIcon ? (
                    feature.customIcon
                  ) : feature.icon ? (
                    <feature.icon className={cn("w-5 h-5", feature.iconColor)} />
                  ) : null}
                  <div>
                    <span className="text-sm font-medium block">{feature.title}</span>
                    {feature.subtitle && (
                      <span className="text-xs text-muted-foreground">{feature.subtitle}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feature Badges (for compact display) */}
          {featureBadges && featureBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {featureBadges.map((fb, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1.5 px-3 py-1">
                  <fb.icon className="w-3.5 h-3.5" />
                  {fb.text}
                </Badge>
              ))}
            </div>
          )}

          {/* Optional Bottom Content */}
          {bottomInfo && (
            <div className="py-2">
              {bottomInfo}
            </div>
          )}

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            {stats && (
              <div className="flex-1 text-sm text-muted-foreground">
                <span dangerouslySetInnerHTML={{ __html: stats }} />
              </div>
            )}
            
            <div className="flex gap-2">
              {secondaryButton && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={secondaryButton.onClick}
                  className="gap-2"
                >
                  <secondaryButton.icon className="w-4 h-4" />
                  {secondaryButton.text}
                </Button>
              )}
              
              <Button
                size="lg"
                onClick={primaryButton.onClick}
                className={cn("gap-2 text-white hover:opacity-90 transition-opacity", primaryButton.gradient)}
              >
                <primaryButton.icon className="w-5 h-5" />
                {primaryButton.text}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExamModeCard;
