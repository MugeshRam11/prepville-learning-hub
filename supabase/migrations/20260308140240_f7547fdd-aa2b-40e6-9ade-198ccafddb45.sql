
-- Drop the old FK pointing to tests table
ALTER TABLE public.test_attempts DROP CONSTRAINT IF EXISTS test_attempts_test_id_fkey;

-- Add new FK pointing to mock_tests table
ALTER TABLE public.test_attempts 
  ADD CONSTRAINT test_attempts_test_id_fkey 
  FOREIGN KEY (test_id) REFERENCES public.mock_tests(id);
