-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- Create policies for question images
CREATE POLICY "Question images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'question-images');

CREATE POLICY "Admin users can upload question images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'question-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can update question images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'question-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can delete question images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'question-images' AND auth.uid() IS NOT NULL);