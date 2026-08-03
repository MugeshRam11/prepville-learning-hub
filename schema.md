## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `role` | `user_role` |  |
| `avatar_id` | `int4` |  Nullable |
| `avatar_emoji` | `text` |  Nullable |
| `avatar_name` | `text` |  Nullable |
| `student_id` | `text` |  Nullable |
| `roll_number` | `text` |  Nullable |
| `class_name` | `text` |  Nullable |
| `student_phone` | `text` |  Nullable |
| `institution_name` | `text` |  Nullable |
| `parent_name` | `text` |  Nullable |
| `parent_phone` | `text` |  Nullable |
| `parent_email` | `text` |  Nullable |
| `signup_method` | `text` |  Nullable |
| `student_email_verified` | `bool` |  Nullable |
| `parent_email_verified` | `bool` |  Nullable |
| `onboarding_completed` | `bool` |  Nullable |

## Table `topics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `unit_number` | `int4` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `tests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `test_type` | `test_type` |  |
| `topic_id` | `uuid` |  Nullable |
| `difficulty_level` | `difficulty_level` |  Nullable |
| `pathway` | `pathway` |  Nullable |
| `time_limit_minutes` | `int4` |  Nullable |
| `total_questions` | `int4` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_id` | `uuid` |  Nullable |
| `question_text` | `text` |  |
| `question_image_url` | `text` |  Nullable |
| `option_a` | `text` |  |
| `option_b` | `text` |  |
| `option_c` | `text` |  |
| `option_d` | `text` |  |
| `correct_answer` | `bpchar` |  Nullable |
| `explanation` | `text` |  Nullable |
| `difficulty_level` | `difficulty_level` |  Nullable |
| `topic_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `test_attempts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `test_id` | `uuid` |  |
| `score` | `int4` |  |
| `total_questions` | `int4` |  |
| `time_taken_seconds` | `int4` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `answers` | `jsonb` |  Nullable |
| `submission_status` | `text` |  Nullable |

## Table `user_answers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `attempt_id` | `uuid` |  Nullable |
| `question_id` | `uuid` |  Nullable |
| `selected_answer` | `bpchar` |  Nullable |
| `is_correct` | `bool` |  |
| `time_spent_seconds` | `int4` |  Nullable |

## Table `mock_tests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `subject` | `test_subject` |  |
| `topic` | `text` |  |
| `total_questions` | `int4` |  |
| `is_published` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `training_zip_path` | `text` |  Nullable |
| `training_zip_uploaded_at` | `timestamptz` |  Nullable |
| `exam_type` | `exam_type` |  Nullable |
| `exam_state` | `exam_state` |  Nullable |
| `time_limit_minutes` | `int4` |  Nullable |
| `allow_late_submission` | `bool` |  Nullable |
| `is_archived` | `bool` |  |

## Table `mock_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `mock_test_id` | `uuid` |  |
| `question_number` | `int4` |  |
| `question_text` | `text` |  |
| `question_image_url` | `text` |  Nullable |
| `has_sub_questions` | `bool` |  |
| `marks` | `int4` |  |
| `answer_key` | `text` |  Nullable |
| `word_limit` | `int4` |  Nullable |
| `difficulty` | `question_difficulty` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `category` | `text` |  Nullable |
| `diagram_description` | `text` |  Nullable |
| `command_term` | `text` |  Nullable |
| `answer_block_type` | `text` |  Nullable |
| `answer_block_config` | `jsonb` |  Nullable |
| `section_id` | `uuid` |  Nullable |
| `question_text_latex` | `text` |  Nullable |
| `question_text_unicode` | `text` |  Nullable |

## Table `mock_sub_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_id` | `uuid` |  |
| `sub_question_label` | `text` |  |
| `sub_question_text` | `text` |  |
| `sub_question_image_url` | `text` |  Nullable |
| `marks` | `int4` |  |
| `answer_key` | `text` |  Nullable |
| `word_limit` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |
| `diagram_description` | `text` |  Nullable |
| `command_term` | `text` |  Nullable |
| `answer_block_type` | `text` |  Nullable |
| `answer_block_config` | `jsonb` |  Nullable |
| `sub_question_text_latex` | `text` |  Nullable |
| `sub_question_text_unicode` | `text` |  Nullable |

## Table `study_groups_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `username` | `text` |  Unique |
| `avatar_url` | `text` |  Nullable |
| `role` | `user_role_sg` |  |
| `joined_at` | `timestamptz` |  |
| `streak_days` | `int4` |  |
| `reputation` | `int4` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `study_groups`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `group_name` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `description` | `text` |  Nullable |
| `is_public` | `bool` |  |
| `is_active` | `bool` |  |
| `member_count` | `int4` |  |
| `updated_at` | `timestamptz` |  |

## Table `group_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `group_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `joined_at` | `timestamptz` |  |
| `role` | `group_member_role` |  |
| `is_active` | `bool` |  |

## Table `study_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `group_id` | `uuid` |  |
| `asked_by` | `uuid` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  |
| `is_resolved` | `bool` |  |
| `answer_count` | `int4` |  |
| `upvotes` | `int4` |  |
| `tags` | `_text` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `study_answers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_id` | `uuid` |  |
| `answered_by` | `uuid` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  |
| `is_verified` | `bool` |  |
| `upvotes` | `int4` |  |
| `verified_by` | `uuid` |  Nullable |
| `verified_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `group_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `group_id` | `uuid` |  |
| `sender_id` | `uuid` |  |
| `message` | `text` |  |
| `created_at` | `timestamptz` |  |
| `message_type` | `message_type` |  |
| `file_url` | `text` |  Nullable |
| `reply_to` | `uuid` |  Nullable |
| `is_edited` | `bool` |  |
| `edited_at` | `timestamptz` |  Nullable |

## Table `user_streaks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `date` | `date` |  |
| `activity_type` | `text` |  |
| `created_at` | `timestamptz` |  |
| `current_streak` | `int4` |  Nullable |
| `best_streak` | `int4` |  Nullable |
| `last_activity_date` | `date` |  Nullable |
| `streak_start_date` | `date` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `subscription_plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `price_monthly` | `numeric` |  |
| `price_yearly` | `numeric` |  |
| `features` | `_text` |  |
| `is_popular` | `bool` |  Nullable |
| `stripe_price_id_monthly` | `text` |  Nullable |
| `stripe_price_id_yearly` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `user_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `plan_id` | `uuid` |  Nullable |
| `status` | `text` |  |
| `trial_start_date` | `timestamptz` |  Nullable |
| `trial_end_date` | `timestamptz` |  Nullable |
| `subscription_start_date` | `timestamptz` |  Nullable |
| `subscription_end_date` | `timestamptz` |  Nullable |
| `stripe_customer_id` | `text` |  Nullable |
| `stripe_subscription_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `streak_milestones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `milestone_days` | `int4` |  |
| `achieved_at` | `timestamptz` |  |
| `reward_xp` | `int4` |  Nullable |
| `reward_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `user_xp`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `total_xp` | `int4` |  |
| `current_level` | `int4` |  |
| `xp_to_next_level` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `xp_activities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `activity_type` | `text` |  |
| `xp_gained` | `int4` |  |
| `description` | `text` |  Nullable |
| `activity_date` | `timestamptz` |  |
| `activity_data` | `jsonb` |  Nullable |

## Table `study_materials`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `subject` | `subject_name` |  |
| `topic` | `text` |  Nullable |
| `level` | `text` |  |
| `material_type` | `material_type` |  |
| `file_url` | `text` |  Nullable |
| `file_size` | `int8` |  Nullable |
| `upload_date` | `timestamptz` |  |
| `uploaded_by` | `uuid` |  Nullable |
| `is_published` | `bool` |  |
| `view_count` | `int4` |  |
| `tags` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `subject_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `question_text` | `text` |  |
| `question_image_url` | `text` |  Nullable |
| `subject` | `subject_name` |  |
| `topic` | `text` |  |
| `level` | `text` |  |
| `difficulty` | `text` |  |
| `answer_key` | `text` |  |
| `explanation` | `text` |  Nullable |
| `hints` | `_text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `is_published` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `option_a` | `text` |  Nullable |
| `option_b` | `text` |  Nullable |
| `option_c` | `text` |  Nullable |
| `option_d` | `text` |  Nullable |
| `xp_reward` | `int4` |  Nullable |
| `video_id` | `text` |  Nullable |

## Table `user_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `login_at` | `timestamptz` |  |
| `logout_at` | `timestamptz` |  Nullable |
| `session_duration_minutes` | `int4` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `role` | `app_role` |  |
| `created_at` | `timestamptz` |  |

## Table `user_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `knowledge_understanding` | `int4` |  Nullable |
| `pattern_recognition` | `int4` |  Nullable |
| `communication` | `int4` |  Nullable |
| `real_life_applications` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `topic_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `topic_name` | `text` |  |
| `total_tasks` | `int4` |  Nullable |
| `completed_tasks` | `int4` |  Nullable |
| `difficulty` | `text` |  Nullable |
| `last_activity_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `daily_challenges`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `challenge_date` | `date` |  Nullable |
| `challenge_type` | `text` |  |
| `target_count` | `int4` |  Nullable |
| `current_count` | `int4` |  Nullable |
| `xp_reward` | `int4` |  Nullable |
| `is_completed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `user_achievements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `achievement_name` | `text` |  |
| `achievement_icon` | `text` |  |
| `unlocked_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_question_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `is_solved` | `bool` |  Nullable |
| `is_bookmarked` | `bool` |  Nullable |
| `user_answer` | `text` |  Nullable |
| `attempts` | `int4` |  Nullable |
| `last_attempted_at` | `timestamptz` |  Nullable |
| `solved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `mock_test_question_bank`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_number` | `int4` |  |
| `question_text` | `text` |  |
| `question_image_url` | `text` |  Nullable |
| `has_sub_questions` | `bool` |  Nullable |
| `marks` | `int4` |  |
| `answer_key` | `text` |  Nullable |
| `word_limit` | `int4` |  Nullable |
| `difficulty` | `question_difficulty` |  Nullable |
| `category` | `text` |  Nullable |
| `subject` | `test_subject` |  |
| `topic` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `diagram_description` | `text` |  Nullable |
| `command_term` | `text` |  Nullable |
| `answer_block_type` | `text` |  Nullable |
| `answer_block_config` | `jsonb` |  Nullable |
| `question_text_latex` | `text` |  Nullable |
| `question_text_unicode` | `text` |  Nullable |

## Table `mock_test_sub_question_bank`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_bank_id` | `uuid` |  |
| `sub_question_label` | `text` |  |
| `sub_question_text` | `text` |  |
| `sub_question_image_url` | `text` |  Nullable |
| `marks` | `int4` |  |
| `answer_key` | `text` |  Nullable |
| `word_limit` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `command_term` | `text` |  Nullable |
| `answer_block_type` | `text` |  Nullable |
| `answer_block_config` | `jsonb` |  Nullable |
| `sub_question_text_latex` | `text` |  Nullable |
| `sub_question_text_unicode` | `text` |  Nullable |

## Table `ai_tutoring_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `subject` | `text` |  |
| `question_text` | `text` |  |
| `correct_answer` | `text` |  Nullable |
| `student_answer` | `text` |  Nullable |
| `is_correct` | `bool` |  Nullable |
| `hints_used` | `int4` |  Nullable |
| `attempts` | `int4` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `session_duration_seconds` | `int4` |  Nullable |
| `difficulty_level` | `text` |  Nullable |
| `topic` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `ai_tutoring_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `uuid` |  |
| `role` | `text` |  |
| `content` | `text` |  |
| `message_type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ai_tutoring_evaluations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `uuid` |  |
| `attempt_number` | `int4` |  |
| `student_answer` | `text` |  |
| `evaluation_result` | `text` |  |
| `feedback` | `text` |  |
| `hint_provided` | `text` |  Nullable |
| `similarity_score` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `student_struggle_topics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `subject` | `text` |  |
| `topic` | `text` |  |
| `difficulty_level` | `text` |  |
| `struggle_count` | `int4` |  Nullable |
| `last_struggled_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ai_knowledge_base`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `subject` | `text` |  |
| `topic` | `text` |  |
| `difficulty_level` | `text` |  |
| `question_text` | `text` |  |
| `correct_answer` | `text` |  |
| `explanation` | `text` |  |
| `common_mistakes` | `jsonb` |  Nullable |
| `hints` | `jsonb` |  Nullable |
| `related_concepts` | `_text` |  Nullable |
| `search_vector` | `tsvector` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `admin_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `setting_key` | `text` |  Unique |
| `setting_value` | `jsonb` |  |
| `setting_type` | `text` |  |
| `description` | `text` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `exam_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `active_session_id` | `text` |  |
| `exam_state` | `exam_state` |  Nullable |
| `current_question_id` | `text` |  Nullable |
| `current_sub_question_id` | `text` |  Nullable |
| `time_remaining_seconds` | `int4` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `last_synced_at` | `timestamptz` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `is_locked` | `bool` |  Nullable |
| `device_info` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `admin_exam_actions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_id` | `uuid` |  |
| `admin_id` | `uuid` |  |
| `action_type` | `text` |  |
| `target_user_id` | `uuid` |  Nullable |
| `action_data` | `jsonb` |  Nullable |
| `executed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `test_assignments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_id` | `uuid` |  |
| `student_id` | `uuid` |  |
| `assigned_by` | `uuid` |  |
| `start_date` | `timestamptz` |  |
| `due_date` | `timestamptz` |  |
| `status` | `text` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `exam_evaluations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_attempt_id` | `uuid` |  Unique |
| `student_id` | `uuid` |  |
| `test_id` | `uuid` |  |
| `evaluation_status` | `text` |  Nullable |
| `ai_evaluation_data` | `jsonb` |  Nullable |
| `manual_adjustments` | `jsonb` |  Nullable |
| `final_score` | `numeric` |  Nullable |
| `final_marks` | `jsonb` |  Nullable |
| `feedback` | `text` |  Nullable |
| `evaluated_by` | `uuid` |  Nullable |
| `evaluated_at` | `timestamptz` |  Nullable |
| `finalized_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `question_evaluations` | `jsonb` |  Nullable |
| `evaluation_mode` | `text` |  Nullable |
| `suggestions` | `jsonb` |  Nullable |

## Table `mock_test_sections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `mock_test_id` | `uuid` |  |
| `title` | `text` |  |
| `section_order` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `evaluation_training_data`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `evaluation_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `sub_question_id` | `uuid` |  Nullable |
| `question_text` | `text` |  |
| `correct_answer` | `text` |  Nullable |
| `student_answer` | `text` |  |
| `answer_type` | `text` |  Nullable |
| `manual_marks_awarded` | `numeric` |  Nullable |
| `ai_marks_awarded` | `numeric` |  Nullable |
| `max_marks` | `numeric` |  |
| `manual_feedback` | `text` |  Nullable |
| `ai_feedback` | `text` |  Nullable |
| `final_marks` | `numeric` |  Nullable |
| `evaluator_id` | `uuid` |  Nullable |
| `question_metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `type` | `text` |  |
| `link` | `text` |  Nullable |
| `is_read` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `evaluation_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `evaluation_id` | `uuid` |  |
| `attempt_id` | `uuid` |  |
| `question_id` | `uuid` |  Nullable |
| `sub_question_id` | `uuid` |  Nullable |
| `marks_awarded` | `numeric` |  Nullable |
| `feedback` | `text` |  Nullable |
| `suggestions` | `text` |  Nullable |
| `ai_suggestions` | `jsonb` |  Nullable |
| `reviewed_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `otp_verifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `email` | `text` |  |
| `otp_code` | `text` |  |
| `otp_type` | `text` |  |
| `is_verified` | `bool` |  Nullable |
| `expires_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `practice_sets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `subject` | `text` |  |
| `topic` | `text` |  |
| `difficulty` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `is_published` | `bool` |  |
| `is_archived` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `practice_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `practice_set_id` | `uuid` |  |
| `question_text` | `text` |  |
| `question_image_url` | `text` |  Nullable |
| `order_index` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `question_text_latex` | `text` |  Nullable |
| `question_text_unicode` | `text` |  Nullable |

## Table `practice_sub_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `question_id` | `uuid` |  |
| `label` | `text` |  |
| `marks` | `int4` |  |
| `answer_type` | `text` |  |
| `answer_block_config` | `jsonb` |  Nullable |
| `answer_key` | `text` |  Nullable |
| `solution` | `text` |  Nullable |
| `command_term` | `text` |  Nullable |
| `sub_question_text` | `text` |  |
| `sub_question_image_url` | `text` |  Nullable |
| `order_index` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `sub_question_text_latex` | `text` |  Nullable |
| `sub_question_text_unicode` | `text` |  Nullable |

## Table `custom_topics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `subject` | `text` |  |
| `unit` | `text` |  |
| `topic` | `text` |  |
| `subtopic` | `text` |  |
| `pathway` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `platform_plan`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `plan_name` | `text` |  |
| `monthly_amount` | `numeric` |  |
| `currency` | `text` |  |
| `billing_cycle_start` | `date` |  |
| `payment_method_label` | `text` |  |
| `payment_method_type` | `text` |  |
| `storage_limit_gb` | `numeric` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `ai_credit_wallet`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `balance_usd` | `numeric` |  |
| `monthly_allowance_usd` | `numeric` |  |
| `low_balance_threshold_usd` | `numeric` |  |
| `last_refill_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `recurring_topup_enabled` | `bool` |  |
| `recurring_topup_amount_usd` | `numeric` |  |

## Table `ai_usage_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `function_name` | `text` |  |
| `model` | `text` |  |
| `prompt_tokens` | `int4` |  |
| `completion_tokens` | `int4` |  |
| `cost_usd` | `numeric` |  |
| `user_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ai_credit_purchases`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `amount_usd` | `numeric` |  |
| `purchase_type` | `text` |  |
| `status` | `text` |  |
| `purchased_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `platform_invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `invoice_number` | `text` |  Unique |
| `billing_month` | `date` |  |
| `plan_amount` | `numeric` |  |
| `ai_overage_amount` | `numeric` |  |
| `total_amount` | `numeric` |  |
| `status` | `text` |  |
| `zoho_invoice_id` | `text` |  Nullable |
| `issued_at` | `timestamptz` |  |
| `due_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Custom Types / Enums

### `test_type`

`quick_test` | `topic_practice` | `mock_test`

### `difficulty_level`

`easy` | `medium` | `hard`

### `pathway`

`standard` | `extended`

### `user_role`

`admin` | `student` | `moderator`

### `test_subject`

`mathematics` | `science` | `language_literature` | `social_studies` | `physics` | `chemistry` | `biology`

### `question_difficulty`

`easy` | `medium` | `hard`

### `app_role`

`admin` | `moderator` | `student`

### `user_role_sg`

`student` | `admin` | `moderator`

### `group_member_role`

`member` | `moderator`

### `message_type`

`text` | `image` | `file` | `audio`

### `material_type`

`pdf` | `video` | `image` | `document` | `note`

### `subject_name`

`mathematics` | `physics` | `chemistry` | `biology` | `english` | `history` | `economics` | `computer_science`

### `exam_type`

`MOCK` | `PUZZLE` | `CHALLENGE` | `INTERACTIVE_DEMO` | `PRACTICE`

### `exam_state`

`LIVE` | `PAUSED` | `SUBMITTED` | `CANCELLED`

## RLS Policies

### `subscription_plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on subscription_plans` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Anyone can view subscription plans` | SELECT | public | PERMISSIVE | `true` | — |

### `user_subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_subscriptions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own subscription` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own subscription` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own subscription` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `test_assignments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on test_assignments` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all assignments` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Students can update their own assignment status` | UPDATE | public | PERMISSIVE | `(auth.uid() = student_id)` | `(auth.uid() = student_id)` |
| `Students can view their own assignments` | SELECT | public | PERMISSIVE | `(auth.uid() = student_id)` | — |

### `test_attempts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on test_attempts` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update test attempts` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view all test attempts` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can create their own attempts` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can view their own attempts` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `topics`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on topics` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Anyone can view topics` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `tests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on tests` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all tests` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Anyone can view active tests` | SELECT | authenticated | PERMISSIVE | `(is_active = true)` | — |
| `Users can create their own tests` | INSERT | public | PERMISSIVE | — | `(created_by = auth.uid())` |
| `Users can delete their own tests` | DELETE | public | PERMISSIVE | `(created_by = auth.uid())` | — |
| `Users can update their own tests` | UPDATE | public | PERMISSIVE | `(created_by = auth.uid())` | — |

### `questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all questions` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Anyone can view questions for active tests` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM tests   WHERE ((tests.id = questions.test_id) AND (tests.is_active = true))))` | — |
| `Creators can delete their test questions` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM tests t   WHERE ((t.id = questions.test_id) AND (t.created_by = auth.uid()))))` | — |
| `Creators can insert questions for their tests` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM tests t   WHERE ((t.id = questions.test_id) AND (t.created_by = auth.uid()))))` |
| `Creators can update their test questions` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM tests t   WHERE ((t.id = questions.test_id) AND (t.created_by = auth.uid()))))` | — |

### `user_answers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_answers` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can create their own answers` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM test_attempts   WHERE ((test_attempts.id = user_answers.attempt_id) AND (test_attempts.user_id = auth.uid()))))` |
| `Users can view their own answers` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM test_attempts   WHERE ((test_attempts.id = user_answers.attempt_id) AND (test_attempts.user_id = auth.uid()))))` | — |

### `mock_tests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on mock_tests` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all mock tests` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view published mock tests` | SELECT | public | PERMISSIVE | `(is_published = true)` | — |

### `streak_milestones`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on streak_milestones` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own milestones` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can view their own milestones` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `user_streaks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_streaks` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own streaks` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can view their own streaks` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `study_groups_users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on study_groups_users` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own study group profile` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own study group profile` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view themselves and shared group users` | SELECT | public | PERMISSIVE | `((auth.uid() = user_id) OR (EXISTS ( SELECT 1    FROM (group_members gm1      JOIN group_members gm2 ON (((gm2.group_id = gm1.group_id) AND (gm2.is_active = true) AND (gm2.user_id = study_groups_users.user_id))))   WHERE ((gm1.user_id = auth.uid()) AND (gm1.is_active = true)))))` | — |

### `study_groups`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on study_groups` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Authenticated can view public groups` | SELECT | authenticated | PERMISSIVE | `((is_public = true) AND (is_active = true))` | — |
| `Authenticated users can create groups` | INSERT | public | PERMISSIVE | — | `(auth.uid() = created_by)` |
| `Group creators can update their groups` | UPDATE | public | PERMISSIVE | `(auth.uid() = created_by)` | — |
| `Members can view their groups` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM group_members   WHERE ((group_members.group_id = group_members.id) AND (group_members.user_id = auth.uid()))))` | — |

### `group_members`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on group_members` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Authenticated users can view group memberships` | SELECT | public | PERMISSIVE | `(auth.uid() IS NOT NULL)` | — |
| `Users can join groups` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can leave groups` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `study_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on study_questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Group members can ask questions` | INSERT | public | PERMISSIVE | — | `((auth.uid() = asked_by) AND (EXISTS ( SELECT 1    FROM group_members gm   WHERE ((gm.group_id = study_questions.group_id) AND (gm.user_id = auth.uid()) AND (gm.is_active = true)))))` |
| `Group members can view questions` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM group_members gm   WHERE ((gm.group_id = study_questions.group_id) AND (gm.user_id = auth.uid()) AND (gm.is_active = true))))` | — |
| `Question authors can update their questions` | UPDATE | public | PERMISSIVE | `(auth.uid() = asked_by)` | — |

### `study_answers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on study_answers` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Answer authors can update their answers` | UPDATE | public | PERMISSIVE | `(auth.uid() = answered_by)` | — |
| `Group members can post answers` | INSERT | public | PERMISSIVE | — | `((auth.uid() = answered_by) AND (EXISTS ( SELECT 1    FROM (study_questions sq      JOIN group_members gm ON ((gm.group_id = sq.group_id)))   WHERE ((sq.id = study_answers.question_id) AND (gm.user_id = auth.uid()) AND (gm.is_active = true)))))` |
| `Group members can view answers` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (study_questions sq      JOIN group_members gm ON ((gm.group_id = sq.group_id)))   WHERE ((sq.id = study_answers.question_id) AND (gm.user_id = auth.uid()) AND (gm.is_active = true))))` | — |

### `group_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on group_messages` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Group members can send messages` | INSERT | public | PERMISSIVE | — | `((auth.uid() = sender_id) AND (EXISTS ( SELECT 1    FROM group_members gm   WHERE ((gm.group_id = group_messages.group_id) AND (gm.user_id = auth.uid()) AND (gm.is_active = true)))))` |
| `Group members can view messages` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM group_members gm   WHERE ((gm.group_id = group_messages.group_id) AND (gm.user_id = auth.uid()) AND (gm.is_active = true))))` | — |
| `Message senders can update their messages` | UPDATE | public | PERMISSIVE | `(auth.uid() = sender_id)` | — |

### `subject_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on subject_questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all subject questions` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role))))` | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role))))` |
| `Admins can view all subject questions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role))))` | — |
| `Anyone can view published subject questions` | SELECT | authenticated | PERMISSIVE | `(is_published = true)` | — |

### `custom_topics`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on custom_topics` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can delete custom topics` | DELETE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can insert custom topics` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update custom topics` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Authenticated users can view custom topics` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `user_xp`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_xp` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own XP` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own XP` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own XP` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `mock_sub_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on mock_sub_questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all mock sub questions` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view published mock sub questions` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (mock_questions      JOIN mock_tests ON ((mock_tests.id = mock_questions.mock_test_id)))   WHERE ((mock_questions.id = mock_sub_questions.question_id) AND (mock_tests.is_published = true))))` | — |

### `exam_evaluations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on exam_evaluations` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all evaluations` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Students can view their finalized evaluations` | SELECT | public | PERMISSIVE | `((auth.uid() = student_id) AND (evaluation_status = 'finalized'::text))` | — |

### `xp_activities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on xp_activities` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own XP activities` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can view their own XP activities` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `user_roles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_roles` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all roles` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Allow anon read user_roles` | SELECT | anon | PERMISSIVE | `true` | — |
| `Allow authenticated read user_roles` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Users can view their own roles` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view user_roles` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `user_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_sessions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all sessions` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can insert their own sessions` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own sessions` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own sessions` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `user_progress`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_progress` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own progress` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own progress` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own progress` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `topic_progress`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on topic_progress` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own topic progress` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own topic progress` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own topic progress` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `daily_challenges`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on daily_challenges` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own challenges` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own challenges` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own challenges` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `user_achievements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_achievements` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own achievements` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can view their own achievements` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `ai_tutoring_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_tutoring_sessions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all tutoring sessions` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can create their own tutoring sessions` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own tutoring sessions` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own tutoring sessions` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `ai_tutoring_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_tutoring_messages` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all tutoring messages` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can create messages for their sessions` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ai_tutoring_sessions   WHERE ((ai_tutoring_sessions.id = ai_tutoring_messages.session_id) AND (ai_tutoring_sessions.user_id = auth.uid()))))` |
| `Users can view messages from their sessions` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ai_tutoring_sessions   WHERE ((ai_tutoring_sessions.id = ai_tutoring_messages.session_id) AND (ai_tutoring_sessions.user_id = auth.uid()))))` | — |

### `ai_tutoring_evaluations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_tutoring_evaluations` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all evaluations` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can create their own evaluations` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM ai_tutoring_sessions   WHERE ((ai_tutoring_sessions.id = ai_tutoring_evaluations.session_id) AND (ai_tutoring_sessions.user_id = auth.uid()))))` |
| `Users can view their own evaluations` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM ai_tutoring_sessions   WHERE ((ai_tutoring_sessions.id = ai_tutoring_evaluations.session_id) AND (ai_tutoring_sessions.user_id = auth.uid()))))` | — |

### `student_struggle_topics`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on student_struggle_topics` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view all struggle topics` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can insert their own struggle topics` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own struggle topics` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own struggle topics` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `ai_knowledge_base`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_knowledge_base` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Authenticated users can view knowledge base` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Knowledge base is publicly readable` | SELECT | public | PERMISSIVE | `true` | — |
| `Only admins can modify knowledge base` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `practice_sub_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on practice_sub_questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all practice sub questions` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view sub questions of published sets` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (practice_questions pq      JOIN practice_sets ps ON ((ps.id = pq.practice_set_id)))   WHERE ((pq.id = practice_sub_questions.question_id) AND (ps.is_published = true) AND (ps.is_archived = false))))` | — |

### `practice_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on practice_questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all practice questions` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view questions of published sets` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM practice_sets   WHERE ((practice_sets.id = practice_questions.practice_set_id) AND (practice_sets.is_published = true) AND (practice_sets.is_archived = false))))` | — |

### `user_question_progress`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on user_question_progress` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert their own question progress` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own question progress` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own question progress` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `mock_test_sections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on mock_test_sections` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all sections` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view sections of published tests` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM mock_tests   WHERE ((mock_tests.id = mock_test_sections.mock_test_id) AND (mock_tests.is_published = true))))` | — |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on profiles` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update any profile` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view all profiles` | SELECT | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Authenticated can view all profiles` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Users can update their own profile` | UPDATE | public | PERMISSIVE | `(auth.uid() = id)` | `((auth.uid() = id) AND (role = ( SELECT profiles_1.role    FROM profiles profiles_1   WHERE (profiles_1.id = auth.uid()))))` |
| `Users can view own profile` | SELECT | authenticated | PERMISSIVE | `(auth.uid() = id)` | — |
| `Users can view own progress or admins view all` | SELECT | public | PERMISSIVE | `((auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role))` | — |
| `Users can view their own profile` | SELECT | public | PERMISSIVE | `(auth.uid() = id)` | — |

### `notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on notifications` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can insert notifications` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Authenticated users can receive notifications` | INSERT | public | PERMISSIVE | — | `(auth.uid() IS NOT NULL)` |
| `Users can update their own notifications` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own notifications` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `practice_sets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on practice_sets` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all practice sets` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view published practice sets` | SELECT | public | PERMISSIVE | `((is_published = true) AND (is_archived = false))` | — |

### `mock_test_question_bank`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on mock_test_question_bank` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage question bank` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view question bank` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `mock_test_sub_question_bank`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on mock_test_sub_question_bank` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage sub-question bank` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view sub-question bank` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `evaluation_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on evaluation_items` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage evaluation items` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Students can view own published evaluation items` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (test_attempts ta      JOIN exam_evaluations ee ON ((ee.test_attempt_id = ta.id)))   WHERE ((ee.id = evaluation_items.evaluation_id) AND (ta.user_id = auth.uid()) AND (ee.evaluation_status = 'finalized'::text))))` | — |

### `mock_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on mock_questions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all mock questions` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can view published mock questions` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM mock_tests   WHERE ((mock_tests.id = mock_questions.mock_test_id) AND (mock_tests.is_published = true))))` | — |

### `otp_verifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on otp_verifications` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Users can insert own OTPs` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can read own OTPs` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can update own OTPs` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `exam_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on exam_sessions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can delete sessions` | DELETE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can update all sessions` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view all sessions` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Users can insert their own sessions` | INSERT | public | PERMISSIVE | — | `(auth.uid() = user_id)` |
| `Users can update their own sessions` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can view their own sessions` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `admin_exam_actions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on admin_exam_actions` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can delete actions` | DELETE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can insert actions` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view actions` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `evaluation_training_data`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on evaluation_training_data` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage training data` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `admin_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on admin_settings` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can insert settings` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update settings` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view all settings` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `ai_credit_wallet`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_credit_wallet` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update ai credit wallet` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view ai credit wallet` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `platform_plan`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on platform_plan` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can insert platform plan` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update platform plan` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view platform plan` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `ai_usage_log`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_usage_log` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view ai usage log` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `ai_credit_purchases`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on ai_credit_purchases` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can insert ai credit purchases` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can view ai credit purchases` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `platform_invoices`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on platform_invoices` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can insert platform invoices` | INSERT | public | PERMISSIVE | — | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can update platform invoices` | UPDATE | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can view platform invoices` | SELECT | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |

### `study_materials`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on study_materials` | ALL | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `Admins can manage all materials` | ALL | public | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Admins can manage study materials` | ALL | authenticated | PERMISSIVE | `true` | `true` |
| `Admins can view all materials` | SELECT | authenticated | PERMISSIVE | `has_role(auth.uid(), 'admin'::app_role)` | — |
| `Authenticated can view published materials` | SELECT | authenticated | PERMISSIVE | `(is_published = true)` | — |
| `Students can view published materials` | SELECT | anon | PERMISSIVE | `(is_published = true)` | — |

