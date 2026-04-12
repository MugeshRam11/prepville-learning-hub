
-- Delete all questions linked to quick_test tests
DELETE FROM public.questions 
WHERE test_id IN (SELECT id FROM public.tests WHERE test_type = 'quick_test');

-- Delete all quick_test tests
DELETE FROM public.tests 
WHERE test_type = 'quick_test';
