-- Empty staging project only. Prerequisite table shapes from the November 26 schema audit.
-- Excludes historical rows, legacy privileged routines and out-of-scope portal tables.
create type public.app_role as enum ('admin','moderator','student');
create type public.exam_state as enum ('LIVE','PAUSED','SUBMITTED','CANCELLED');
create type public.exam_type as enum ('MOCK','PUZZLE','CHALLENGE','INTERACTIVE_DEMO','PRACTICE');
create type public.question_difficulty as enum ('easy','medium','hard');
create type public.test_subject as enum ('mathematics','science','language_literature','social_studies','physics','chemistry','biology');
create type public.user_role as enum ('admin','student','moderator');
create table public.mock_questions(
  "id" uuid default gen_random_uuid() not null,
  "mock_test_id" uuid not null,
  "question_number" integer not null,
  "question_text" text not null,
  "question_image_url" text,
  "has_sub_questions" boolean default false not null,
  "marks" integer default 1 not null,
  "answer_key" text,
  "word_limit" integer,
  "difficulty" question_difficulty default 'medium'::question_difficulty,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "category" text,
  "diagram_description" text,
  "command_term" text,
  "answer_block_type" text default 'text_equation'::text,
  "answer_block_config" jsonb default '{}'::jsonb,
  "section_id" uuid,
  "question_text_latex" text,
  "question_text_unicode" text
);
alter table public.mock_questions enable row level security;
revoke all on public.mock_questions from public,anon,authenticated;
grant select on public.mock_questions to authenticated;
create table public.mock_sub_questions(
  "id" uuid default gen_random_uuid() not null,
  "question_id" uuid not null,
  "sub_question_label" text not null,
  "sub_question_text" text not null,
  "sub_question_image_url" text,
  "marks" integer default 1 not null,
  "answer_key" text,
  "word_limit" integer,
  "created_at" timestamp with time zone default now() not null,
  "diagram_description" text,
  "command_term" text,
  "answer_block_type" text default 'text_equation'::text,
  "answer_block_config" jsonb default '{}'::jsonb,
  "sub_question_text_latex" text,
  "sub_question_text_unicode" text
);
alter table public.mock_sub_questions enable row level security;
revoke all on public.mock_sub_questions from public,anon,authenticated;
grant select on public.mock_sub_questions to authenticated;
create table public.mock_test_sections(
  "id" uuid default gen_random_uuid() not null,
  "mock_test_id" uuid not null,
  "title" text default 'Part A'::text not null,
  "section_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
alter table public.mock_test_sections enable row level security;
revoke all on public.mock_test_sections from public,anon,authenticated;
grant select on public.mock_test_sections to authenticated;
create table public.mock_tests(
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "subject" test_subject not null,
  "topic" text not null,
  "total_questions" integer default 0 not null,
  "is_published" boolean default false not null,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "training_zip_path" text,
  "training_zip_uploaded_at" timestamp with time zone,
  "exam_type" exam_type default 'MOCK'::exam_type,
  "exam_state" exam_state default 'LIVE'::exam_state,
  "time_limit_minutes" integer default 120,
  "allow_late_submission" boolean default false,
  "is_archived" boolean default false not null
);
alter table public.mock_tests enable row level security;
revoke all on public.mock_tests from public,anon,authenticated;
grant select on public.mock_tests to authenticated;
create table public.practice_questions(
  "id" uuid default gen_random_uuid() not null,
  "practice_set_id" uuid not null,
  "question_text" text default ''::text not null,
  "question_image_url" text,
  "order_index" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "question_text_latex" text,
  "question_text_unicode" text
);
alter table public.practice_questions enable row level security;
revoke all on public.practice_questions from public,anon,authenticated;
grant select on public.practice_questions to authenticated;
create table public.practice_sets(
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "subject" text not null,
  "topic" text not null,
  "difficulty" text default 'medium'::text not null,
  "created_by" uuid,
  "is_published" boolean default false not null,
  "is_archived" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
alter table public.practice_sets enable row level security;
revoke all on public.practice_sets from public,anon,authenticated;
grant select on public.practice_sets to authenticated;
create table public.practice_sub_questions(
  "id" uuid default gen_random_uuid() not null,
  "question_id" uuid not null,
  "label" text default 'a'::text not null,
  "marks" integer default 1 not null,
  "answer_type" text default 'text_equation'::text not null,
  "answer_block_config" jsonb default '{}'::jsonb,
  "answer_key" text,
  "solution" text,
  "command_term" text,
  "sub_question_text" text default ''::text not null,
  "sub_question_image_url" text,
  "order_index" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "sub_question_text_latex" text,
  "sub_question_text_unicode" text
);
alter table public.practice_sub_questions enable row level security;
revoke all on public.practice_sub_questions from public,anon,authenticated;
grant select on public.practice_sub_questions to authenticated;
create table public.profiles(
  "id" uuid not null,
  "email" text not null,
  "first_name" text,
  "last_name" text,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "role" user_role default 'student'::user_role not null,
  "avatar_id" integer,
  "avatar_emoji" text,
  "avatar_name" text,
  "student_id" text,
  "roll_number" text,
  "class_name" text,
  "student_phone" text,
  "institution_name" text,
  "parent_name" text,
  "parent_phone" text,
  "parent_email" text,
  "signup_method" text default 'email'::text,
  "student_email_verified" boolean default false,
  "parent_email_verified" boolean default false,
  "onboarding_completed" boolean default false
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated;
grant select on public.profiles to authenticated;
create table public.test_attempts(
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "test_id" uuid not null,
  "score" integer default 0 not null,
  "total_questions" integer not null,
  "time_taken_seconds" integer,
  "completed_at" timestamp with time zone default now(),
  "answers" jsonb,
  "submission_status" text default 'draft'::text
);
alter table public.test_attempts enable row level security;
revoke all on public.test_attempts from public,anon,authenticated;
grant select on public.test_attempts to authenticated;
create table public.user_roles(
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "role" app_role not null,
  "created_at" timestamp with time zone default now() not null
);
alter table public.user_roles enable row level security;
revoke all on public.user_roles from public,anon,authenticated;
grant select on public.user_roles to authenticated;
alter table public.practice_sub_questions add constraint "practice_sub_questions_pkey" PRIMARY KEY (id);
alter table public.mock_questions add constraint "valid_answer_block_type_questions" CHECK (((answer_block_type IS NULL) OR (answer_block_type = ANY (ARRAY['text_equation'::text, 'graph_plot'::text, 'drag_drop'::text, 'image_drop'::text, 'arrange_order'::text, 'smart_math'::text, 'multiple_choice'::text, 'table_input'::text, 'image_fill_blanks'::text, 'venn_drag'::text]))));
alter table public.practice_sub_questions add constraint "valid_answer_type_practice_sub" CHECK ((answer_type = ANY (ARRAY['text_equation'::text, 'graph_plot'::text, 'drag_drop'::text, 'image_drop'::text, 'arrange_order'::text, 'smart_math'::text, 'multiple_choice'::text, 'table_input'::text, 'image_fill_blanks'::text, 'venn_drag'::text])));
alter table public.mock_test_sections add constraint "mock_test_sections_pkey" PRIMARY KEY (id);
alter table public.profiles add constraint "profiles_pkey" PRIMARY KEY (id);
alter table public.test_attempts add constraint "test_attempts_pkey" PRIMARY KEY (id);
alter table public.test_attempts add constraint "test_attempts_submission_status_check" CHECK ((submission_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'evaluated'::text])));
alter table public.mock_sub_questions add constraint "mock_sub_questions_pkey" PRIMARY KEY (id);
alter table public.mock_tests add constraint "mock_tests_pkey" PRIMARY KEY (id);
alter table public.user_roles add constraint "user_roles_pkey" PRIMARY KEY (id);
alter table public.practice_questions add constraint "practice_questions_pkey" PRIMARY KEY (id);
alter table public.user_roles add constraint "user_roles_user_id_role_key" UNIQUE (user_id, role);
alter table public.mock_questions add constraint "mock_questions_pkey" PRIMARY KEY (id);
alter table public.mock_sub_questions add constraint "valid_answer_block_type_sub_questions" CHECK ((answer_block_type = ANY (ARRAY['text_equation'::text, 'graph_plot'::text, 'drag_drop'::text, 'image_drop'::text, 'arrange_order'::text, 'smart_math'::text, 'multiple_choice'::text, 'table_input'::text, 'image_fill_blanks'::text, 'venn_drag'::text])));
alter table public.practice_sets add constraint "practice_sets_pkey" PRIMARY KEY (id);
alter table public.practice_sets add constraint "practice_sets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.mock_questions add constraint "mock_questions_section_id_fkey" FOREIGN KEY (section_id) REFERENCES mock_test_sections(id) ON DELETE SET NULL;
alter table public.mock_sub_questions add constraint "mock_sub_questions_question_id_fkey" FOREIGN KEY (question_id) REFERENCES mock_questions(id) ON DELETE CASCADE;
alter table public.mock_test_sections add constraint "mock_test_sections_mock_test_id_fkey" FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE;
alter table public.mock_tests add constraint "mock_tests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.practice_questions add constraint "practice_questions_practice_set_id_fkey" FOREIGN KEY (practice_set_id) REFERENCES practice_sets(id) ON DELETE CASCADE;
alter table public.mock_questions add constraint "mock_questions_mock_test_id_fkey" FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE;
alter table public.practice_sub_questions add constraint "practice_sub_questions_question_id_fkey" FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE;
alter table public.profiles add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.test_attempts add constraint "test_attempts_test_id_fkey" FOREIGN KEY (test_id) REFERENCES mock_tests(id);
alter table public.test_attempts add constraint "test_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_roles add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create function public.update_updated_at_column() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
insert into storage.buckets(id,name,public) values('question-images','question-images',true);

