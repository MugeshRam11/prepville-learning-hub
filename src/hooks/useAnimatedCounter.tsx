import { useEffect, useState } from 'react';

interface UseAnimatedCounterOptions {
  end: number;
  duration?: number;
  decimals?: number;
}

export const useAnimatedCounter = ({
  end,
  duration = 1200,
  decimals = 0
}: UseAnimatedCounterOptions) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Reset to 0 when end value changes
    setCount(0);
    setHasAnimated(false);
    
    // Small delay to ensure animation starts from 0
    const delayTimeout = setTimeout(() => {
      let startTime: number | null = null;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const current = end * easeOutQuart;
        setCount(parseFloat(current.toFixed(decimals)));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setHasAnimated(true);
        }
      };

      animationFrame = requestAnimationFrame(animate);

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, 100);

    return () => {
      clearTimeout(delayTimeout);
    };
  }, [end, duration, decimals]);

  return count;
};
