-- Allow users to view published mock tests
CREATE POLICY "Users can view published mock tests" 
ON mock_tests 
FOR SELECT 
USING (is_published = true);

-- Allow users to view published mock questions
CREATE POLICY "Users can view published mock questions" 
ON mock_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM mock_tests 
  WHERE mock_tests.id = mock_questions.mock_test_id 
  AND mock_tests.is_published = true
));

-- Allow users to view published mock sub-questions
CREATE POLICY "Users can view published mock sub questions" 
ON mock_sub_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM mock_questions 
  JOIN mock_tests ON mock_tests.id = mock_questions.mock_test_id
  WHERE mock_questions.id = mock_sub_questions.question_id 
  AND mock_tests.is_published = true
));