import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, X } from 'lucide-react';

interface DailyMotivationPopupProps {
  userName?: string;
}

const MOTIVATIONAL_QUOTES = [
  "Success is the sum of small efforts repeated day in and day out. 📚",
  "The expert in anything was once a beginner. Keep learning! 🌟",
  "Education is the passport to the future. Tomorrow belongs to those who prepare for it today. 🚀",
  "Don't watch the clock; do what it does. Keep going! ⏰",
  "The beautiful thing about learning is that no one can take it away from you. 💡",
  "Your only limit is you. Push your boundaries today! 💪",
  "Strive for progress, not perfection. Every step counts! 👣",
  "The future depends on what you do today. Make it count! ✨",
  "Believe you can and you're halfway there. Keep believing! 🌈",
  "Success doesn't come from what you do occasionally, it comes from what you do consistently. 🎯"
];

const DailyMotivationPopup = ({ userName }: DailyMotivationPopupProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    checkAndShowMotivation();
  }, []);

  const checkAndShowMotivation = async () => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('lastMotivationDate');
    
    // Check if we have cached data for today
    const cachedData = localStorage.getItem('dailyMotivationCache');
    
    if (lastShown === today && cachedData) {
      // Load from cache instantly
      const cached = JSON.parse(cachedData);
      setMessage(cached.message);
      setImageUrl(cached.imageUrl);
      setQuote(cached.quote);
      setLoadingMessage(false);
      setLoadingImage(false);
      setOpen(true);
    } else if (lastShown !== today) {
      // Show popup with random quote immediately
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setQuote(randomQuote);
      setOpen(true);
      
      // Fetch new content in background
      await fetchMotivation(today, randomQuote);
    }
  };

  const fetchMotivation = async (date: string, currentQuote: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-motivation', {
        body: { userName: userName || 'Student', date }
      });

      if (error) throw error;

      setMessage(data.message);
      setLoadingMessage(false);
      
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setLoadingImage(false);
      } else {
        setLoadingImage(false);
      }
      
      // Cache the data
      localStorage.setItem('dailyMotivationCache', JSON.stringify({
        message: data.message,
        imageUrl: data.imageUrl,
        quote: currentQuote
      }));
      localStorage.setItem('lastMotivationDate', date);
    } catch (error) {
      console.error('Failed to fetch motivation:', error);
      setMessage('Keep pushing forward! Every day is a new opportunity to learn and grow. 🌟');
      setLoadingMessage(false);
      setLoadingImage(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-2 border-primary/20 gap-0">
        {/* Compact Header */}
        <div className="relative bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-white text-base font-bold">
            <Sparkles className="w-4 h-4" />
            Daily Inspiration
          </DialogTitle>
          <button
            onClick={handleClose}
            className="absolute top-2.5 right-3 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Content */}
        <div className="px-5 py-4 space-y-3">
          {/* Quote - Smaller */}
          {quote && (
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-md p-2.5 border-l-3 border-primary">
              <p className="text-xs italic text-gray-700 leading-relaxed">"{quote}"</p>
            </div>
          )}

          {/* Compact AI Image */}
          {loadingImage ? (
            <Skeleton className="w-full h-28 rounded-lg" />
          ) : imageUrl ? (
            <div className="relative rounded-lg overflow-hidden shadow-sm">
              <img 
                src={imageUrl} 
                alt="Daily motivation" 
                className="w-full h-28 object-cover"
              />
            </div>
          ) : null}

          {/* Compact Greeting & Message */}
          <div className="space-y-2">
            {userName && (
              <p className="text-sm font-semibold text-gray-900">
                Good morning, {userName}! ✨
              </p>
            )}
            
            <p className="text-xs text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>

            {/* AI Message - Condensed */}
            {loadingMessage ? (
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ) : message ? (
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                {message}
              </p>
            ) : null}
          </div>

          {/* Compact Action Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] hover:opacity-90 transition-all shadow-md font-semibold h-9 text-sm"
            disabled={loadingMessage}
          >
            {loadingMessage ? 'Loading...' : "Let's Get Started! 🚀"}
          </Button>
        </div>

        <DialogDescription className="sr-only">
          Daily motivational message to inspire your learning journey
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default DailyMotivationPopup;
