-- ==============================================================================
-- Migration: 20261103020000_migrate_legacy_practice_data.sql
-- Description: Safely and idempotently migrates legacy practice sets/questions into
--              the canonical question_bank architecture while preserving the old
--              tables intact.
-- ==============================================================================

-- 1. Create mapping table to track legacy to new question relationships
CREATE TABLE IF NOT EXISTS public.legacy_question_id_map (
  legacy_id UUID NOT NULL PRIMARY KEY,
  new_id UUID NOT NULL,
  legacy_table TEXT NOT NULL,
  migrated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_map_new ON public.legacy_question_id_map(new_id);

-- 2. Idempotent Data Migration Procedure
DO $$
DECLARE
  v_rec_q RECORD;
  v_rec_sub RECORD;
  v_new_qid UUID;
  v_new_subid UUID;
  v_sub_count INTEGER;
  v_strand TEXT;
BEGIN
  -- Iterate through legacy practice questions that haven't been migrated yet
  FOR v_rec_q IN
    SELECT 
      pq.id AS legacy_qid,
      pq.question_text,
      pq.question_image_url,
      ps.topic,
      ps.difficulty,
      ps.is_published,
      ps.is_archived,
      ps.created_by,
      ps.created_at,
      ps.updated_at
    FROM public.practice_questions pq
    JOIN public.practice_sets ps ON ps.id = pq.practice_set_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.legacy_question_id_map m 
      WHERE m.legacy_id = pq.id AND m.legacy_table = 'practice_questions'
    )
  LOOP
    -- Count subquestions for this question
    SELECT COUNT(*) INTO v_sub_count
    FROM public.practice_sub_questions
    WHERE question_id = v_rec_q.legacy_qid;

    -- Map strand based on topic keywords if possible
    IF v_rec_q.topic ILIKE '%algebra%' OR v_rec_q.topic ILIKE '%equation%' OR v_rec_q.topic ILIKE '%function%' THEN
      v_strand := 'Algebra';
    ELSIF v_rec_q.topic ILIKE '%geometr%' OR v_rec_q.topic ILIKE '%trig%' OR v_rec_q.topic ILIKE '%triangle%' THEN
      v_strand := 'Geometry and Trigonometry';
    ELSIF v_rec_q.topic ILIKE '%stat%' OR v_rec_q.topic ILIKE '%probabilit%' OR v_rec_q.topic ILIKE '%data%' THEN
      v_strand := 'Statistics and Probability';
    ELSE
      v_strand := 'Number';
    END IF;

    -- Generate new canonical question_bank ID
    v_new_qid := gen_random_uuid();

    -- Insert into canonical question_bank
    INSERT INTO public.question_bank (
      id,
      programme,
      subject,
      myp_year,
      strand,
      topic,
      difficulty,
      question_type,
      question_text,
      image_url,
      marks,
      is_published,
      review_status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      v_new_qid,
      'MYP',
      'mathematics',
      'Year 4',
      v_strand,
      COALESCE(NULLIF(TRIM(v_rec_q.topic), ''), 'General Mathematics'),
      CASE 
        WHEN v_rec_q.difficulty IN ('easy', 'medium', 'hard') THEN v_rec_q.difficulty 
        ELSE 'medium' 
      END,
      CASE WHEN v_sub_count > 0 THEN 'multi_part' ELSE 'single' END,
      v_rec_q.question_text,
      v_rec_q.question_image_url,
      GREATEST(1, v_sub_count),
      (v_rec_q.is_published = true AND v_rec_q.is_archived = false),
      CASE WHEN (v_rec_q.is_published = true AND v_rec_q.is_archived = false) THEN 'approved' ELSE 'draft' END,
      v_rec_q.created_by,
      v_rec_q.created_at,
      v_rec_q.updated_at
    );

    -- Record mapping
    INSERT INTO public.legacy_question_id_map (legacy_id, new_id, legacy_table)
    VALUES (v_rec_q.legacy_qid, v_new_qid, 'practice_questions');

    -- If there are subquestions, migrate them and their isolated answer keys
    IF v_sub_count > 0 THEN
      FOR v_rec_sub IN
        SELECT 
          psq.id AS legacy_subid,
          psq.label,
          psq.marks,
          psq.answer_type,
          psq.answer_block_config,
          psq.answer_key,
          psq.solution,
          psq.command_term,
          psq.sub_question_text,
          psq.sub_question_image_url,
          psq.order_index,
          psq.created_at,
          psq.updated_at
        FROM public.practice_sub_questions psq
        WHERE psq.question_id = v_rec_q.legacy_qid
        ORDER BY psq.order_index ASC
      LOOP
        v_new_subid := gen_random_uuid();

        -- Insert subquestion
        INSERT INTO public.question_subquestions (
          id,
          question_id,
          label,
          marks,
          answer_type,
          answer_config,
          command_term,
          sub_question_text,
          sub_question_image_url,
          order_index,
          created_at,
          updated_at
        ) VALUES (
          v_new_subid,
          v_new_qid,
          COALESCE(NULLIF(TRIM(v_rec_sub.label), ''), 'a'),
          GREATEST(1, COALESCE(v_rec_sub.marks, 1)),
          CASE 
            WHEN v_rec_sub.answer_type IN ('text_equation', 'short_answer', 'multiple_choice', 'working_box') 
            THEN v_rec_sub.answer_type 
            ELSE 'text_equation' 
          END,
          COALESCE(v_rec_sub.answer_block_config, '{}'::jsonb),
          v_rec_sub.command_term,
          v_rec_sub.sub_question_text,
          v_rec_sub.sub_question_image_url,
          v_rec_sub.order_index,
          v_rec_sub.created_at,
          v_rec_sub.updated_at
        );

        -- Insert protected answer key
        INSERT INTO public.question_answer_keys (
          id,
          subquestion_id,
          answer_key,
          solution,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          v_new_subid,
          COALESCE(v_rec_sub.answer_key, ''),
          v_rec_sub.solution,
          v_rec_sub.created_at,
          v_rec_sub.updated_at
        );

        -- Map subquestion
        INSERT INTO public.legacy_question_id_map (legacy_id, new_id, legacy_table)
        VALUES (v_rec_sub.legacy_subid, v_new_subid, 'practice_sub_questions');
      END LOOP;
    ELSE
      -- Single question fallback answer key placeholder
      INSERT INTO public.question_answer_keys (
        id,
        question_id,
        answer_key,
        solution,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_new_qid,
        '',
        NULL,
        v_rec_q.created_at,
        v_rec_q.updated_at
      );
    END IF;

  END LOOP;
END $$;
