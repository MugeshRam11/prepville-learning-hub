import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyMotivationPopupProps {
  userName?: string;
}

const DailyMotivationPopup = ({ userName }: DailyMotivationPopupProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    checkAndShowMotivation();
  }, []);

  const checkAndShowMotivation = async () => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('lastMotivationDate');

    if (lastShown !== today) {
      setLoading(true);
      setOpen(true);
      await fetchMotivation(today);
    }
  };

  const fetchMotivation = async (date: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-motivation', {
        body: { userName: userName || 'Student', date }
      });

      if (error) throw error;

      setMessage(data.message);
      setImageUrl(data.imageUrl);
      localStorage.setItem('lastMotivationDate', date);
    } catch (error) {
      console.error('Failed to fetch motivation:', error);
      setMessage('Keep pushing forward! Every day is a new opportunity to learn and grow. 🌟');
    } finally {
      setLoading(false);
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

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="w-full h-48 rounded-lg" />
                <Skeleton className="w-full h-20" />
              </div>
            ) : (
              <>
                {imageUrl && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted animate-fade-in">
                    <img
                      src={imageUrl}
                      alt="Daily motivation"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-3 animate-fade-in">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {message}
                  </p>
                </div>

                <Button
                  onClick={handleClose}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  Let's Get Started! 🚀
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyMotivationPopup;
