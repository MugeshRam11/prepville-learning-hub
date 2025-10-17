-- Create AI knowledge base table for pre-trained Q&A
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  common_mistakes JSONB DEFAULT '[]'::jsonb,
  hints JSONB DEFAULT '[]'::jsonb,
  related_concepts TEXT[],
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(question_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(topic, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(explanation, '')), 'C')
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read knowledge base
CREATE POLICY "Knowledge base is publicly readable"
  ON public.ai_knowledge_base
  FOR SELECT
  USING (true);

-- Only admins can modify knowledge base
CREATE POLICY "Only admins can modify knowledge base"
  ON public.ai_knowledge_base
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search 
  ON public.ai_knowledge_base USING gin(search_vector);

-- Create index for subject and topic lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_subject_topic 
  ON public.ai_knowledge_base(subject, topic);

-- Function to search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
  search_query TEXT,
  subject_filter TEXT DEFAULT NULL,
  topic_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  subject TEXT,
  topic TEXT,
  question_text TEXT,
  correct_answer TEXT,
  explanation TEXT,
  hints JSONB,
  common_mistakes JSONB,
  relevance_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.subject,
    kb.topic,
    kb.question_text,
    kb.correct_answer,
    kb.explanation,
    kb.hints,
    kb.common_mistakes,
    ts_rank(kb.search_vector, plainto_tsquery('english', search_query)) AS relevance_score
  FROM public.ai_knowledge_base kb
  WHERE 
    (subject_filter IS NULL OR kb.subject = subject_filter)
    AND (topic_filter IS NULL OR kb.topic = topic_filter)
    AND kb.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY relevance_score DESC, kb.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Insert sample knowledge base entries for Math
INSERT INTO public.ai_knowledge_base (subject, topic, difficulty_level, question_text, correct_answer, explanation, common_mistakes, hints, related_concepts) VALUES
('Math', 'Algebra', 'Medium', 'Solve for x: 2x + 5 = 15', 'x = 5', 'To solve for x, subtract 5 from both sides to get 2x = 10, then divide both sides by 2 to get x = 5.', 
 '["Forgetting to subtract 5 from both sides first", "Dividing before subtracting", "Sign errors when moving terms"]'::jsonb,
 '["First isolate the term with x", "Remember to perform the same operation on both sides", "Work backwards from the answer"]'::jsonb,
 ARRAY['Linear Equations', 'Inverse Operations', 'Balancing Equations']),

('Math', 'Algebra', 'Hard', 'Factor: x² - 5x + 6', '(x - 2)(x - 3)', 'Find two numbers that multiply to 6 and add to -5. These are -2 and -3. So x² - 5x + 6 = (x - 2)(x - 3)',
 '["Finding numbers that add to 5 instead of -5", "Forgetting the negative signs", "Not checking by expanding"]'::jsonb,
 '["Look for two numbers that multiply to give the constant term", "Those same numbers should add to give the middle coefficient", "Think about factor pairs of 6"]'::jsonb,
 ARRAY['Quadratic Equations', 'Factoring', 'FOIL Method']),

('Math', 'Geometry', 'Easy', 'What is the area of a rectangle with length 8 and width 5?', '40', 'Area of rectangle = length × width = 8 × 5 = 40 square units',
 '["Confusing area with perimeter", "Adding instead of multiplying", "Forgetting units"]'::jsonb,
 '["Remember: Area = length × width", "Perimeter would be 2(l + w)", "Area is measured in square units"]'::jsonb,
 ARRAY['Area', 'Rectangles', 'Basic Geometry']),

('Math', 'Trigonometry', 'Medium', 'In a right triangle, if the opposite side is 3 and the hypotenuse is 5, what is sin(θ)?', 'sin(θ) = 3/5 or 0.6', 'Sine is defined as opposite/hypotenuse. Therefore sin(θ) = 3/5 = 0.6',
 '["Using adjacent instead of opposite", "Dividing hypotenuse by opposite", "Confusing sin with cos"]'::jsonb,
 '["Remember SOH-CAH-TOA", "Sine = Opposite / Hypotenuse", "Draw a diagram to visualize"]'::jsonb,
 ARRAY['Right Triangles', 'Trigonometric Ratios', 'SOH-CAH-TOA']),

('Math', 'Calculus', 'Hard', 'Find the derivative of f(x) = 3x² + 2x - 1', 'f''(x) = 6x + 2', 'Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(3x²) = 6x, d/dx(2x) = 2, d/dx(-1) = 0. Therefore f''(x) = 6x + 2',
 '["Forgetting to multiply by the exponent", "Not reducing the exponent by 1", "Forgetting the constant term becomes 0"]'::jsonb,
 '["Apply the power rule to each term separately", "Remember: the derivative of a constant is 0", "Multiply by the original exponent, then subtract 1 from the exponent"]'::jsonb,
 ARRAY['Derivatives', 'Power Rule', 'Differentiation']);