-- Create storage bucket for question answer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-answers', 'question-answers', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for question answer images
CREATE POLICY "Users can upload their own question answer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-answers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own question answer images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'question-answers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own question answer images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-answers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own question answer images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-answers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);