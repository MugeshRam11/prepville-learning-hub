
-- Table for admin-created custom topics that extend the preloaded topic tree
CREATE TABLE public.custom_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  unit text NOT NULL DEFAULT '',
  topic text NOT NULL,
  subtopic text NOT NULL DEFAULT '',
  pathway text NOT NULL DEFAULT 'both',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(subject, unit, topic, subtopic)
);

-- Enable RLS
ALTER TABLE public.custom_topics ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view custom topics"
ON public.custom_topics
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert custom topics"
ON public.custom_topics
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update custom topics"
ON public.custom_topics
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete custom topics"
ON public.custom_topics
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_custom_topics_updated_at
BEFORE UPDATE ON public.custom_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
