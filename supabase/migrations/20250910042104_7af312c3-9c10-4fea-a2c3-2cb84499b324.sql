-- RLS: allow creators to manage their own tests and questions

-- Tests: creators can insert/update/delete their own
CREATE POLICY "Users can create their own tests"
ON public.tests
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own tests"
ON public.tests
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own tests"
ON public.tests
FOR DELETE
USING (created_by = auth.uid());

-- Questions: creators (owners of the parent test) can manage
CREATE POLICY "Creators can insert questions for their tests"
ON public.questions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tests t
  WHERE t.id = test_id AND t.created_by = auth.uid()
));

CREATE POLICY "Creators can update their test questions"
ON public.questions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tests t
  WHERE t.id = test_id AND t.created_by = auth.uid()
));

CREATE POLICY "Creators can delete their test questions"
ON public.questions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.tests t
  WHERE t.id = test_id AND t.created_by = auth.uid()
));