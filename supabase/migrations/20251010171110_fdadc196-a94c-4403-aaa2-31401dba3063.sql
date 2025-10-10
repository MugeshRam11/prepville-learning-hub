-- Add avatar fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_id INTEGER,
ADD COLUMN avatar_emoji TEXT,
ADD COLUMN avatar_name TEXT;