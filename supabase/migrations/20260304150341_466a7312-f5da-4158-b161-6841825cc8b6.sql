-- Delete orphaned test_attempts with null test_id (broken demo submissions)
DELETE FROM test_attempts WHERE test_id IS NULL;

-- Enforce test_id NOT NULL to prevent future broken records
ALTER TABLE test_attempts ALTER COLUMN test_id SET NOT NULL;