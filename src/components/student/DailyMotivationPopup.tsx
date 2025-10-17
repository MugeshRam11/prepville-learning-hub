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
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-2 border-primary/20 gap-0">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
            <Sparkles className="w-5 h-5" />
            Daily Inspiration
          </DialogTitle>
          <button
            onClick={handleClose}
            className="absolute top-3 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Quote */}
          {quote && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-l-4 border-primary shadow-sm">
              <p className="text-sm italic text-gray-700 leading-relaxed font-medium">"{quote}"</p>
            </div>
          )}

          {/* Greeting & Date */}
          <div className="space-y-1">
            {userName && (
              <h3 className="text-lg font-bold text-gray-900">
                Good morning, {userName}! ✨
              </h3>
            )}
            
            <p className="text-sm text-gray-500 font-medium">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* AI Image */}
          {loadingImage ? (
            <Skeleton className="w-full h-32 rounded-lg" />
          ) : imageUrl ? (
            <div className="relative rounded-lg overflow-hidden shadow-md">
              <img 
                src={imageUrl} 
                alt="Daily motivation" 
                className="w-full h-32 object-cover"
              />
            </div>
          ) : null}

          {/* AI Message */}
          {loadingMessage ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : message ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {message}
              </p>
            </div>
          ) : null}

          {/* Action Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-[hsl(var(--adsavvy-blue))] to-[hsl(var(--adsavvy-pink))] hover:opacity-90 transition-all shadow-lg font-bold h-11 text-base"
            disabled={loadingMessage}
          >
            {loadingMessage ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              "Let's Get Started! 🚀"
            )}
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
