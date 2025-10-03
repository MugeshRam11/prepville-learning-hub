-- Add new columns to subject_questions table to support bulk upload requirements
ALTER TABLE public.subject_questions
ADD COLUMN IF NOT EXISTS option_a text,
ADD COLUMN IF NOT EXISTS option_b text,
ADD COLUMN IF NOT EXISTS option_c text,
ADD COLUMN IF NOT EXISTS option_d text,
ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS video_id text;

-- Add comment to document the schema
COMMENT ON COLUMN public.subject_questions.option_a IS 'Multiple choice option A';
COMMENT ON COLUMN public.subject_questions.option_b IS 'Multiple choice option B';
COMMENT ON COLUMN public.subject_questions.option_c IS 'Multiple choice option C';
COMMENT ON COLUMN public.subject_questions.option_d IS 'Multiple choice option D';
COMMENT ON COLUMN public.subject_questions.xp_reward IS 'XP points awarded for correct answer';
COMMENT ON COLUMN public.subject_questions.video_id IS 'Related video identifier (e.g., YouTube ID)';

-- Create index for video_id lookups
CREATE INDEX IF NOT EXISTS idx_subject_questions_video_id ON public.subject_questions(video_id) WHERE video_id IS NOT NULL;