import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 rounded-full bg-background/80 hover:bg-background"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Daily Inspiration
              </h2>
            </div>

            {/* Instant Quote Display */}
            {quote && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary animate-fade-in">
                <p className="text-sm font-medium italic text-muted-foreground">
                  "{quote}"
                </p>
              </div>
            )}

            {/* Image Section */}
            {loadingImage ? (
              <div className="w-full h-48 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-primary/50 animate-spin" />
              </div>
            ) : imageUrl ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted animate-fade-in">
                <img
                  src={imageUrl}
                  alt="Daily motivation"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            {/* Message Section */}
            <div className="space-y-3">
              {loadingMessage ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
                </div>
              ) : (
                <p className="text-lg leading-relaxed whitespace-pre-wrap animate-fade-in">
                  {message}
                </p>
              )}
            </div>

            <Button
              onClick={handleClose}
              className="w-full mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              disabled={loadingMessage}
            >
              {loadingMessage ? 'Loading...' : "Let's Get Started! 🚀"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyMotivationPopup;
