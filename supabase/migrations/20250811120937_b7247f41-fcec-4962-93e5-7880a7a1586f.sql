-- Add updated_at column to user_streaks table
ALTER TABLE public.user_streaks 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();