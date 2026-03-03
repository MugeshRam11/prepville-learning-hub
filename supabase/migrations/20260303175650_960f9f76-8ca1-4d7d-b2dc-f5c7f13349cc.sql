
-- Create mock_test_sections table for hierarchical exam structure
CREATE TABLE public.mock_test_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mock_test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Part A',
  section_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add section_id to mock_questions for grouping
ALTER TABLE public.mock_questions 
ADD COLUMN section_id uuid REFERENCES public.mock_test_sections(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.mock_test_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all sections"
ON public.mock_test_sections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view sections of published tests"
ON public.mock_test_sections
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM mock_tests 
  WHERE mock_tests.id = mock_test_sections.mock_test_id 
  AND mock_tests.is_published = true
));

-- Index for fast lookups
CREATE INDEX idx_mock_test_sections_test_id ON public.mock_test_sections(mock_test_id);
CREATE INDEX idx_mock_questions_section_id ON public.mock_questions(section_id);

-- Updated_at trigger
CREATE TRIGGER update_mock_test_sections_updated_at
BEFORE UPDATE ON public.mock_test_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
