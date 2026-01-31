-- Add training ZIP columns to mock_tests (silent, backend-only)
ALTER TABLE public.mock_tests 
ADD COLUMN IF NOT EXISTS training_zip_path TEXT,
ADD COLUMN IF NOT EXISTS training_zip_uploaded_at TIMESTAMPTZ;

-- Create private storage bucket for training ZIPs (no public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-zips', 'training-zips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Only authenticated admins can upload
CREATE POLICY "Admins can upload training ZIPs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-zips' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

-- No SELECT policy = no downloads via public API (backend-only access)