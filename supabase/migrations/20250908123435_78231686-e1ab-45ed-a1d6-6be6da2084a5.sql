-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', true);

-- Create storage policies for study materials
CREATE POLICY "Admins can upload study materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'study-materials' AND (
  SELECT role FROM public.profiles WHERE id = auth.uid()
) = 'admin');

CREATE POLICY "Anyone can view study materials" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'study-materials');

CREATE POLICY "Admins can update study materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'study-materials' AND (
  SELECT role FROM public.profiles WHERE id = auth.uid()
) = 'admin');

CREATE POLICY "Admins can delete study materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'study-materials' AND (
  SELECT role FROM public.profiles WHERE id = auth.uid()
) = 'admin');

-- Create enum types
CREATE TYPE public.material_type AS ENUM ('pdf', 'video', 'image', 'document', 'note');
CREATE TYPE public.subject_name AS ENUM ('mathematics', 'physics', 'chemistry', 'biology', 'english', 'history', 'economics', 'computer_science');

-- Create study materials table
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject subject_name NOT NULL,
  topic TEXT,
  level TEXT NOT NULL, -- 'MYP', 'IBDP', etc.
  material_type material_type NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subject questions table for practice questions
CREATE TABLE public.subject_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  subject subject_name NOT NULL,
  topic TEXT NOT NULL,
  level TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  answer_key TEXT NOT NULL,
  explanation TEXT,
  hints TEXT[],
  tags TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_materials
CREATE POLICY "Anyone can view published materials" 
ON public.study_materials 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Admins can manage all materials" 
ON public.study_materials 
FOR ALL 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for subject_questions
CREATE POLICY "Anyone can view published questions" 
ON public.subject_questions 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Admins can manage all questions" 
ON public.subject_questions 
FOR ALL 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Create indexes for better performance
CREATE INDEX idx_study_materials_subject ON public.study_materials(subject);
CREATE INDEX idx_study_materials_level ON public.study_materials(level);
CREATE INDEX idx_study_materials_published ON public.study_materials(is_published);
CREATE INDEX idx_subject_questions_subject ON public.subject_questions(subject);
CREATE INDEX idx_subject_questions_level ON public.subject_questions(level);
CREATE INDEX idx_subject_questions_published ON public.subject_questions(is_published);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_materials_updated_at
BEFORE UPDATE ON public.study_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subject_questions_updated_at
BEFORE UPDATE ON public.subject_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();