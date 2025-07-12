
-- Create enum for test subjects
CREATE TYPE test_subject AS ENUM ('mathematics', 'science', 'language_literature', 'social_studies', 'physics', 'chemistry', 'biology');

-- Create enum for difficulty levels
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Create mock_tests table
CREATE TABLE public.mock_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject test_subject NOT NULL,
  topic TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mock_questions table
CREATE TABLE public.mock_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mock_test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  has_sub_questions BOOLEAN NOT NULL DEFAULT false,
  marks INTEGER NOT NULL DEFAULT 1,
  answer_key TEXT,
  word_limit INTEGER,
  difficulty question_difficulty DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mock_sub_questions table
CREATE TABLE public.mock_sub_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.mock_questions(id) ON DELETE CASCADE NOT NULL,
  sub_question_label TEXT NOT NULL, -- e.g., 'a', 'b', 'c'
  sub_question_text TEXT NOT NULL,
  sub_question_image_url TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  answer_key TEXT,
  word_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_sub_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for mock_tests
CREATE POLICY "Admins can manage all mock tests" ON public.mock_tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create policies for mock_questions
CREATE POLICY "Admins can manage all mock questions" ON public.mock_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create policies for mock_sub_questions
CREATE POLICY "Admins can manage all mock sub questions" ON public.mock_sub_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create function to update total_questions count
CREATE OR REPLACE FUNCTION update_mock_test_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.mock_tests 
    SET total_questions = (
      SELECT COUNT(*) FROM public.mock_questions 
      WHERE mock_test_id = NEW.mock_test_id
    )
    WHERE id = NEW.mock_test_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mock_tests 
    SET total_questions = (
      SELECT COUNT(*) FROM public.mock_questions 
      WHERE mock_test_id = OLD.mock_test_id
    )
    WHERE id = OLD.mock_test_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update question count
CREATE TRIGGER trigger_update_question_count_insert
  AFTER INSERT ON public.mock_questions
  FOR EACH ROW EXECUTE FUNCTION update_mock_test_question_count();

CREATE TRIGGER trigger_update_question_count_delete
  AFTER DELETE ON public.mock_questions
  FOR EACH ROW EXECUTE FUNCTION update_mock_test_question_count();
