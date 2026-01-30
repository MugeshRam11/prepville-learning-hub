import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, X } from 'lucide-react';

interface DailyMotivationPopupProps {
  userName?: string;
  skipFetch?: boolean;
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

const DailyMotivationPopup = ({ userName, skipFetch = false }: DailyMotivationPopupProps) => {
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
      
      // For demo users, skip the edge function call
      if (skipFetch) {
        setMessage(`Keep up the great work, ${userName || 'Student'}! Your dedication is inspiring. 🌟`);
        setLoadingMessage(false);
        setLoadingImage(false);
        localStorage.setItem('lastMotivationDate', today);
      } else {
        // Fetch new content in background
        await fetchMotivation(today, randomQuote);
      }
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
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden gap-0">
        {/* Simple Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-2.5">
          <DialogTitle className="flex items-center gap-2 text-white text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            Daily Inspiration
          </DialogTitle>
          <button
            onClick={handleClose}
            className="absolute top-2 right-3 text-white/90 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Content */}
        <div className="p-4 space-y-3">
          {/* Quote */}
          {quote && (
            <div className="bg-blue-50 rounded-md p-2.5 border-l-4 border-blue-400">
              <p className="text-xs italic text-gray-700">"{quote}"</p>
            </div>
          )}

          {/* Greeting */}
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Good morning, {userName || 'Student'}! ✨
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Image */}
          {loadingImage ? (
            <Skeleton className="w-full h-32 rounded-lg" />
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Daily motivation" 
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : null}

          {/* Message */}
          {loadingMessage ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : message ? (
            <p className="text-xs text-gray-700 leading-relaxed">
              {message}
            </p>
          ) : null}

          {/* Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 h-9 text-sm font-semibold"
            disabled={loadingMessage}
          >
            {loadingMessage ? 'Loading...' : "Let's Get Started! 🚀"}
          </Button>
        </div>

        <DialogDescription className="sr-only">
          Daily motivational message
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default DailyMotivationPopup;
