export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_exam_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          admin_id: string
          created_at: string | null
          executed_at: string | null
          id: string
          target_user_id: string | null
          test_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          admin_id: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          target_user_id?: string | null
          test_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          admin_id?: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          target_user_id?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_exam_actions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          common_mistakes: Json | null
          correct_answer: string
          created_at: string | null
          difficulty_level: string
          explanation: string
          hints: Json | null
          id: string
          question_text: string
          related_concepts: string[] | null
          search_vector: unknown
          subject: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          common_mistakes?: Json | null
          correct_answer: string
          created_at?: string | null
          difficulty_level: string
          explanation: string
          hints?: Json | null
          id?: string
          question_text: string
          related_concepts?: string[] | null
          search_vector?: unknown
          subject: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          common_mistakes?: Json | null
          correct_answer?: string
          created_at?: string | null
          difficulty_level?: string
          explanation?: string
          hints?: Json | null
          id?: string
          question_text?: string
          related_concepts?: string[] | null
          search_vector?: unknown
          subject?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_tutoring_evaluations: {
        Row: {
          attempt_number: number
          created_at: string | null
          evaluation_result: string
          feedback: string
          hint_provided: string | null
          id: string
          session_id: string
          similarity_score: number | null
          student_answer: string
        }
        Insert: {
          attempt_number: number
          created_at?: string | null
          evaluation_result: string
          feedback: string
          hint_provided?: string | null
          id?: string
          session_id: string
          similarity_score?: number | null
          student_answer: string
        }
        Update: {
          attempt_number?: number
          created_at?: string | null
          evaluation_result?: string
          feedback?: string
          hint_provided?: string | null
          id?: string
          session_id?: string
          similarity_score?: number | null
          student_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutoring_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_tutoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutoring_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutoring_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_tutoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutoring_sessions: {
        Row: {
          attempts: number | null
          completed_at: string | null
          correct_answer: string | null
          created_at: string | null
          difficulty_level: string | null
          hints_used: number | null
          id: string
          is_correct: boolean | null
          question_id: string
          question_text: string
          session_duration_seconds: number | null
          started_at: string | null
          student_answer: string | null
          subject: string
          topic: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          correct_answer?: string | null
          created_at?: string | null
          difficulty_level?: string | null
          hints_used?: number | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          question_text: string
          session_duration_seconds?: number | null
          started_at?: string | null
          student_answer?: string | null
          subject: string
          topic?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          correct_answer?: string | null
          created_at?: string | null
          difficulty_level?: string | null
          hints_used?: number | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          question_text?: string
          session_duration_seconds?: number | null
          started_at?: string | null
          student_answer?: string | null
          subject?: string
          topic?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string | null
          challenge_type: string
          created_at: string | null
          current_count: number | null
          id: string
          is_completed: boolean | null
          target_count: number | null
          updated_at: string | null
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          challenge_date?: string | null
          challenge_type: string
          created_at?: string | null
          current_count?: number | null
          id?: string
          is_completed?: boolean | null
          target_count?: number | null
          updated_at?: string | null
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          challenge_date?: string | null
          challenge_type?: string
          created_at?: string | null
          current_count?: number | null
          id?: string
          is_completed?: boolean | null
          target_count?: number | null
          updated_at?: string | null
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      evaluation_items: {
        Row: {
          ai_suggestions: Json | null
          attempt_id: string
          created_at: string | null
          evaluation_id: string
          feedback: string | null
          id: string
          marks_awarded: number | null
          question_id: string | null
          reviewed_by: string | null
          sub_question_id: string | null
          suggestions: string | null
          updated_at: string | null
        }
        Insert: {
          ai_suggestions?: Json | null
          attempt_id: string
          created_at?: string | null
          evaluation_id: string
          feedback?: string | null
          id?: string
          marks_awarded?: number | null
          question_id?: string | null
          reviewed_by?: string | null
          sub_question_id?: string | null
          suggestions?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_suggestions?: Json | null
          attempt_id?: string
          created_at?: string | null
          evaluation_id?: string
          feedback?: string | null
          id?: string
          marks_awarded?: number | null
          question_id?: string | null
          reviewed_by?: string | null
          sub_question_id?: string | null
          suggestions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_items_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_items_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "exam_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_items_sub_question_id_fkey"
            columns: ["sub_question_id"]
            isOneToOne: false
            referencedRelation: "mock_sub_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_training_data: {
        Row: {
          ai_feedback: string | null
          ai_marks_awarded: number | null
          answer_type: string | null
          correct_answer: string | null
          created_at: string | null
          evaluation_id: string
          evaluator_id: string | null
          final_marks: number | null
          id: string
          manual_feedback: string | null
          manual_marks_awarded: number | null
          max_marks: number
          question_id: string
          question_metadata: Json | null
          question_text: string
          student_answer: string
          sub_question_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_marks_awarded?: number | null
          answer_type?: string | null
          correct_answer?: string | null
          created_at?: string | null
          evaluation_id: string
          evaluator_id?: string | null
          final_marks?: number | null
          id?: string
          manual_feedback?: string | null
          manual_marks_awarded?: number | null
          max_marks: number
          question_id: string
          question_metadata?: Json | null
          question_text: string
          student_answer: string
          sub_question_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_feedback?: string | null
          ai_marks_awarded?: number | null
          answer_type?: string | null
          correct_answer?: string | null
          created_at?: string | null
          evaluation_id?: string
          evaluator_id?: string | null
          final_marks?: number | null
          id?: string
          manual_feedback?: string | null
          manual_marks_awarded?: number | null
          max_marks?: number
          question_id?: string
          question_metadata?: Json | null
          question_text?: string
          student_answer?: string
          sub_question_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_training_data_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "exam_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_evaluations: {
        Row: {
          ai_evaluation_data: Json | null
          created_at: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_mode: string | null
          evaluation_status: string | null
          feedback: string | null
          final_marks: Json | null
          final_score: number | null
          finalized_at: string | null
          id: string
          manual_adjustments: Json | null
          question_evaluations: Json | null
          student_id: string
          suggestions: Json | null
          test_attempt_id: string
          test_id: string
          updated_at: string | null
        }
        Insert: {
          ai_evaluation_data?: Json | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_mode?: string | null
          evaluation_status?: string | null
          feedback?: string | null
          final_marks?: Json | null
          final_score?: number | null
          finalized_at?: string | null
          id?: string
          manual_adjustments?: Json | null
          question_evaluations?: Json | null
          student_id: string
          suggestions?: Json | null
          test_attempt_id: string
          test_id: string
          updated_at?: string | null
        }
        Update: {
          ai_evaluation_data?: Json | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_mode?: string | null
          evaluation_status?: string | null
          feedback?: string | null
          final_marks?: Json | null
          final_score?: number | null
          finalized_at?: string | null
          id?: string
          manual_adjustments?: Json | null
          question_evaluations?: Json | null
          student_id?: string
          suggestions?: Json | null
          test_attempt_id?: string
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_evaluations_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: true
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          active_session_id: string
          created_at: string | null
          current_question_id: string | null
          current_sub_question_id: string | null
          device_info: Json | null
          exam_state: Database["public"]["Enums"]["exam_state"] | null
          id: string
          is_locked: boolean | null
          last_synced_at: string | null
          started_at: string | null
          submitted_at: string | null
          test_id: string
          time_remaining_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_session_id: string
          created_at?: string | null
          current_question_id?: string | null
          current_sub_question_id?: string | null
          device_info?: Json | null
          exam_state?: Database["public"]["Enums"]["exam_state"] | null
          id?: string
          is_locked?: boolean | null
          last_synced_at?: string | null
          started_at?: string | null
          submitted_at?: string | null
          test_id: string
          time_remaining_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_session_id?: string
          created_at?: string | null
          current_question_id?: string | null
          current_sub_question_id?: string | null
          device_info?: Json | null
          exam_state?: Database["public"]["Enums"]["exam_state"] | null
          id?: string
          is_locked?: boolean | null
          last_synced_at?: string | null
          started_at?: string | null
          submitted_at?: string | null
          test_id?: string
          time_remaining_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          file_url: string | null
          group_id: string
          id: string
          is_edited: boolean
          message: string
          message_type: Database["public"]["Enums"]["message_type"]
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          is_edited?: boolean
          message: string
          message_type?: Database["public"]["Enums"]["message_type"]
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          is_edited?: boolean
          message?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_questions: {
        Row: {
          answer_block_config: Json | null
          answer_block_type: string | null
          answer_key: string | null
          category: string | null
          command_term: string | null
          created_at: string
          diagram_description: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions: boolean
          id: string
          marks: number
          mock_test_id: string
          question_image_url: string | null
          question_number: number
          question_text: string
          section_id: string | null
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          category?: string | null
          command_term?: string | null
          created_at?: string
          diagram_description?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions?: boolean
          id?: string
          marks?: number
          mock_test_id: string
          question_image_url?: string | null
          question_number: number
          question_text: string
          section_id?: string | null
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          category?: string | null
          command_term?: string | null
          created_at?: string
          diagram_description?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions?: boolean
          id?: string
          marks?: number
          mock_test_id?: string
          question_image_url?: string | null
          question_number?: number
          question_text?: string
          section_id?: string | null
          updated_at?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_questions_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mock_test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_sub_questions: {
        Row: {
          answer_block_config: Json | null
          answer_block_type: string | null
          answer_key: string | null
          command_term: string | null
          created_at: string
          diagram_description: string | null
          id: string
          marks: number
          question_id: string
          sub_question_image_url: string | null
          sub_question_label: string
          sub_question_text: string
          word_limit: number | null
        }
        Insert: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          command_term?: string | null
          created_at?: string
          diagram_description?: string | null
          id?: string
          marks?: number
          question_id: string
          sub_question_image_url?: string | null
          sub_question_label: string
          sub_question_text: string
          word_limit?: number | null
        }
        Update: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          command_term?: string | null
          created_at?: string
          diagram_description?: string | null
          id?: string
          marks?: number
          question_id?: string
          sub_question_image_url?: string | null
          sub_question_label?: string
          sub_question_text?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_sub_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_question_bank: {
        Row: {
          answer_block_config: Json | null
          answer_block_type: string | null
          answer_key: string | null
          category: string | null
          command_term: string | null
          created_at: string | null
          created_by: string | null
          diagram_description: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions: boolean | null
          id: string
          is_active: boolean | null
          marks: number
          question_image_url: string | null
          question_number: number
          question_text: string
          subject: Database["public"]["Enums"]["test_subject"]
          topic: string
          updated_at: string | null
          word_limit: number | null
        }
        Insert: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          category?: string | null
          command_term?: string | null
          created_at?: string | null
          created_by?: string | null
          diagram_description?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions?: boolean | null
          id?: string
          is_active?: boolean | null
          marks?: number
          question_image_url?: string | null
          question_number: number
          question_text: string
          subject: Database["public"]["Enums"]["test_subject"]
          topic: string
          updated_at?: string | null
          word_limit?: number | null
        }
        Update: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          category?: string | null
          command_term?: string | null
          created_at?: string | null
          created_by?: string | null
          diagram_description?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions?: boolean | null
          id?: string
          is_active?: boolean | null
          marks?: number
          question_image_url?: string | null
          question_number?: number
          question_text?: string
          subject?: Database["public"]["Enums"]["test_subject"]
          topic?: string
          updated_at?: string | null
          word_limit?: number | null
        }
        Relationships: []
      }
      mock_test_sections: {
        Row: {
          created_at: string
          id: string
          mock_test_id: string
          section_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mock_test_id: string
          section_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mock_test_id?: string
          section_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_sections_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_sub_question_bank: {
        Row: {
          answer_block_config: Json | null
          answer_block_type: string | null
          answer_key: string | null
          command_term: string | null
          created_at: string | null
          id: string
          marks: number
          question_bank_id: string
          sub_question_image_url: string | null
          sub_question_label: string
          sub_question_text: string
          word_limit: number | null
        }
        Insert: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          command_term?: string | null
          created_at?: string | null
          id?: string
          marks?: number
          question_bank_id: string
          sub_question_image_url?: string | null
          sub_question_label: string
          sub_question_text: string
          word_limit?: number | null
        }
        Update: {
          answer_block_config?: Json | null
          answer_block_type?: string | null
          answer_key?: string | null
          command_term?: string | null
          created_at?: string | null
          id?: string
          marks?: number
          question_bank_id?: string
          sub_question_image_url?: string | null
          sub_question_label?: string
          sub_question_text?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_sub_question_bank_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "mock_test_question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          allow_late_submission: boolean | null
          created_at: string
          created_by: string | null
          exam_state: Database["public"]["Enums"]["exam_state"] | null
          exam_type: Database["public"]["Enums"]["exam_type"] | null
          id: string
          is_archived: boolean
          is_published: boolean
          subject: Database["public"]["Enums"]["test_subject"]
          time_limit_minutes: number | null
          title: string
          topic: string
          total_questions: number
          training_zip_path: string | null
          training_zip_uploaded_at: string | null
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean | null
          created_at?: string
          created_by?: string | null
          exam_state?: Database["public"]["Enums"]["exam_state"] | null
          exam_type?: Database["public"]["Enums"]["exam_type"] | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          subject: Database["public"]["Enums"]["test_subject"]
          time_limit_minutes?: number | null
          title: string
          topic: string
          total_questions?: number
          training_zip_path?: string | null
          training_zip_uploaded_at?: string | null
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean | null
          created_at?: string
          created_by?: string | null
          exam_state?: Database["public"]["Enums"]["exam_state"] | null
          exam_type?: Database["public"]["Enums"]["exam_type"] | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          subject?: Database["public"]["Enums"]["test_subject"]
          time_limit_minutes?: number | null
          title?: string
          topic?: string
          total_questions?: number
          training_zip_path?: string | null
          training_zip_uploaded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          is_verified: boolean | null
          otp_code: string
          otp_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          is_verified?: boolean | null
          otp_code: string
          otp_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          otp_code?: string
          otp_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_emoji: string | null
          avatar_id: number | null
          avatar_name: string | null
          class_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          institution_name: string | null
          is_active: boolean | null
          last_name: string | null
          onboarding_completed: boolean | null
          parent_email: string | null
          parent_email_verified: boolean | null
          parent_name: string | null
          parent_phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          roll_number: string | null
          signup_method: string | null
          student_email_verified: boolean | null
          student_id: string | null
          student_phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          avatar_id?: number | null
          avatar_name?: string | null
          class_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          institution_name?: string | null
          is_active?: boolean | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          parent_email?: string | null
          parent_email_verified?: boolean | null
          parent_name?: string | null
          parent_phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roll_number?: string | null
          signup_method?: string | null
          student_email_verified?: boolean | null
          student_id?: string | null
          student_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          avatar_id?: number | null
          avatar_name?: string | null
          class_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          institution_name?: string | null
          is_active?: boolean | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          parent_email?: string | null
          parent_email_verified?: boolean | null
          parent_name?: string | null
          parent_phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roll_number?: string | null
          signup_method?: string | null
          student_email_verified?: boolean | null
          student_id?: string | null
          student_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_image_url: string | null
          question_text: string
          test_id: string | null
          topic_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_image_url?: string | null
          question_text: string
          test_id?: string | null
          topic_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_image_url?: string | null
          question_text?: string
          test_id?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_milestones: {
        Row: {
          achieved_at: string
          created_at: string
          id: string
          milestone_days: number
          reward_message: string | null
          reward_xp: number | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_days: number
          reward_message?: string | null
          reward_xp?: number | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          milestone_days?: number
          reward_message?: string | null
          reward_xp?: number | null
          user_id?: string
        }
        Relationships: []
      }
      student_struggle_topics: {
        Row: {
          created_at: string | null
          difficulty_level: string
          id: string
          last_struggled_at: string | null
          struggle_count: number | null
          subject: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty_level: string
          id?: string
          last_struggled_at?: string | null
          struggle_count?: number | null
          subject: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          difficulty_level?: string
          id?: string
          last_struggled_at?: string | null
          struggle_count?: number | null
          subject?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      study_answers: {
        Row: {
          answered_by: string
          content: string
          created_at: string
          id: string
          is_verified: boolean
          question_id: string
          updated_at: string
          upvotes: number
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          answered_by: string
          content: string
          created_at?: string
          id?: string
          is_verified?: boolean
          question_id: string
          updated_at?: string
          upvotes?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          answered_by?: string
          content?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          question_id?: string
          updated_at?: string
          upvotes?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_name: string
          id: string
          is_active: boolean
          is_public: boolean
          member_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_name: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          member_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_name?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          member_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      study_groups_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          reputation: number
          role: Database["public"]["Enums"]["user_role_sg"]
          streak_days: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          reputation?: number
          role?: Database["public"]["Enums"]["user_role_sg"]
          streak_days?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          reputation?: number
          role?: Database["public"]["Enums"]["user_role_sg"]
          streak_days?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          created_at: string
          description: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_published: boolean
          level: string
          material_type: Database["public"]["Enums"]["material_type"]
          subject: Database["public"]["Enums"]["subject_name"]
          tags: string[] | null
          title: string
          topic: string | null
          updated_at: string
          upload_date: string
          uploaded_by: string | null
          view_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_published?: boolean
          level: string
          material_type: Database["public"]["Enums"]["material_type"]
          subject: Database["public"]["Enums"]["subject_name"]
          tags?: string[] | null
          title: string
          topic?: string | null
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
          view_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_published?: boolean
          level?: string
          material_type?: Database["public"]["Enums"]["material_type"]
          subject?: Database["public"]["Enums"]["subject_name"]
          tags?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
          view_count?: number
        }
        Relationships: []
      }
      study_questions: {
        Row: {
          answer_count: number
          asked_by: string
          content: string
          created_at: string
          group_id: string
          id: string
          is_resolved: boolean
          tags: string[] | null
          updated_at: string
          upvotes: number
        }
        Insert: {
          answer_count?: number
          asked_by: string
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_resolved?: boolean
          tags?: string[] | null
          updated_at?: string
          upvotes?: number
        }
        Update: {
          answer_count?: number
          asked_by?: string
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_resolved?: boolean
          tags?: string[] | null
          updated_at?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_questions: {
        Row: {
          answer_key: string
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          hints: string[] | null
          id: string
          is_published: boolean
          level: string
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          question_image_url: string | null
          question_text: string
          subject: Database["public"]["Enums"]["subject_name"]
          tags: string[] | null
          title: string
          topic: string
          updated_at: string
          video_id: string | null
          xp_reward: number | null
        }
        Insert: {
          answer_key: string
          created_at?: string
          created_by?: string | null
          difficulty: string
          explanation?: string | null
          hints?: string[] | null
          id?: string
          is_published?: boolean
          level: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_image_url?: string | null
          question_text: string
          subject: Database["public"]["Enums"]["subject_name"]
          tags?: string[] | null
          title: string
          topic: string
          updated_at?: string
          video_id?: string | null
          xp_reward?: number | null
        }
        Update: {
          answer_key?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          hints?: string[] | null
          id?: string
          is_published?: boolean
          level?: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_image_url?: string | null
          question_text?: string
          subject?: Database["public"]["Enums"]["subject_name"]
          tags?: string[] | null
          title?: string
          topic?: string
          updated_at?: string
          video_id?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: string[]
          id: string
          is_popular: boolean | null
          name: string
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          is_popular?: boolean | null
          name: string
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          is_popular?: boolean | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
        }
        Relationships: []
      }
      test_assignments: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string | null
          due_date: string
          id: string
          start_date: string
          started_at: string | null
          status: string | null
          student_id: string
          test_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          start_date: string
          started_at?: string | null
          status?: string | null
          student_id: string
          test_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          start_date?: string
          started_at?: string | null
          status?: string | null
          student_id?: string
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          score: number
          submission_status: string | null
          test_id: string
          time_taken_seconds: number | null
          total_questions: number
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          score?: number
          submission_status?: string | null
          test_id: string
          time_taken_seconds?: number | null
          total_questions: number
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          score?: number
          submission_status?: string | null
          test_id?: string
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          id: string
          is_active: boolean | null
          pathway: Database["public"]["Enums"]["pathway"] | null
          test_type: Database["public"]["Enums"]["test_type"]
          time_limit_minutes: number | null
          title: string
          topic_id: string | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          id?: string
          is_active?: boolean | null
          pathway?: Database["public"]["Enums"]["pathway"] | null
          test_type: Database["public"]["Enums"]["test_type"]
          time_limit_minutes?: number | null
          title: string
          topic_id?: string | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          id?: string
          is_active?: boolean | null
          pathway?: Database["public"]["Enums"]["pathway"] | null
          test_type?: Database["public"]["Enums"]["test_type"]
          time_limit_minutes?: number | null
          title?: string
          topic_id?: string | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_progress: {
        Row: {
          completed_tasks: number | null
          created_at: string | null
          difficulty: string | null
          id: string
          last_activity_at: string | null
          topic_name: string
          total_tasks: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_tasks?: number | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          last_activity_at?: string | null
          topic_name: string
          total_tasks?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_tasks?: number | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          last_activity_at?: string | null
          topic_name?: string
          total_tasks?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          unit_number: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          unit_number?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          unit_number?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_icon: string
          achievement_name: string
          created_at: string | null
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_icon: string
          achievement_name: string
          created_at?: string | null
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_icon?: string
          achievement_name?: string
          created_at?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          attempt_id: string | null
          id: string
          is_correct: boolean
          question_id: string | null
          selected_answer: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id?: string | null
          id?: string
          is_correct: boolean
          question_id?: string | null
          selected_answer?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string | null
          selected_answer?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          communication: number | null
          created_at: string | null
          id: string
          knowledge_understanding: number | null
          pattern_recognition: number | null
          real_life_applications: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          communication?: number | null
          created_at?: string | null
          id?: string
          knowledge_understanding?: number | null
          pattern_recognition?: number | null
          real_life_applications?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          communication?: number | null
          created_at?: string | null
          id?: string
          knowledge_understanding?: number | null
          pattern_recognition?: number | null
          real_life_applications?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_question_progress: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          is_bookmarked: boolean | null
          is_solved: boolean | null
          last_attempted_at: string | null
          question_id: string
          solved_at: string | null
          updated_at: string | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          is_solved?: boolean | null
          last_attempted_at?: string | null
          question_id: string
          solved_at?: string | null
          updated_at?: string | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          is_solved?: boolean | null
          last_attempted_at?: string | null
          question_id?: string
          solved_at?: string | null
          updated_at?: string | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          session_duration_minutes: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          activity_type: string
          best_streak: number | null
          created_at: string
          current_streak: number | null
          date: string
          id: string
          last_activity_date: string | null
          streak_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          best_streak?: number | null
          created_at?: string
          current_streak?: number | null
          date: string
          id?: string
          last_activity_date?: string | null
          streak_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          best_streak?: number | null
          created_at?: string
          current_streak?: number | null
          date?: string
          id?: string
          last_activity_date?: string | null
          streak_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          current_level: number
          id: string
          total_xp: number
          updated_at: string
          user_id: string
          xp_to_next_level: number
        }
        Insert: {
          created_at?: string
          current_level?: number
          id?: string
          total_xp?: number
          updated_at?: string
          user_id: string
          xp_to_next_level?: number
        }
        Update: {
          created_at?: string
          current_level?: number
          id?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
          xp_to_next_level?: number
        }
        Relationships: []
      }
      xp_activities: {
        Row: {
          activity_data: Json | null
          activity_date: string
          activity_type: string
          description: string | null
          id: string
          user_id: string
          xp_gained: number
        }
        Insert: {
          activity_data?: Json | null
          activity_date?: string
          activity_type: string
          description?: string | null
          id?: string
          user_id: string
          xp_gained: number
        }
        Update: {
          activity_data?: Json | null
          activity_date?: string
          activity_type?: string
          description?: string | null
          id?: string
          user_id?: string
          xp_gained?: number
        }
        Relationships: []
      }
    }
    Views: {
      user_progress_summary: {
        Row: {
          avg_score_percentage: number | null
          created_at: string | null
          current_level: number | null
          email: string | null
          first_name: string | null
          is_active: boolean | null
          last_activity_date: string | null
          last_login: string | null
          last_name: string | null
          longest_streak: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_tests_taken: number | null
          total_xp: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_user_xp: {
        Args: {
          activity_data?: Json
          activity_description?: string
          activity_type: string
          user_uuid: string
          xp_amount: number
        }
        Returns: {
          level_up: boolean
          new_level: number
          new_total_xp: number
          xp_to_next: number
        }[]
      }
      backfill_user_streak: {
        Args: { end_date?: string; start_date: string; user_uuid: string }
        Returns: {
          final_best: number
          final_streak: number
          processed_days: number
        }[]
      }
      calculate_level_from_xp: {
        Args: { total_xp: number }
        Returns: {
          level: number
          xp_for_current_level: number
          xp_for_next_level: number
        }[]
      }
      check_streak_milestones: {
        Args: { streak_days: number; user_uuid: string }
        Returns: {
          message: string
          milestone: number
          reward_xp: number
        }[]
      }
      get_admin_settings: { Args: never; Returns: Json }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_my_progress_summary: {
        Args: never
        Returns: {
          avg_score_percentage: number
          created_at: string
          current_level: number
          email: string
          first_name: string
          is_active: boolean
          last_activity_date: string
          last_login: string
          last_name: string
          longest_streak: number
          role: string
          total_tests_taken: number
          total_xp: number
          user_id: string
        }[]
      }
      get_platform_statistics: {
        Args: never
        Returns: {
          active_tests: number
          storage_used: number
          total_questions: number
          total_users: number
        }[]
      }
      get_user_activity_timeline: {
        Args: { limit_count?: number; user_uuid: string }
        Returns: {
          activity_date: string
          activity_description: string
          activity_id: string
          activity_type: string
          activity_value: number
        }[]
      }
      get_user_level_info: {
        Args: { user_uuid: string }
        Returns: {
          current_level: number
          level_benefits: string[]
          level_title: string
          total_xp: number
          xp_to_next_level: number
        }[]
      }
      get_user_performance_by_subject: {
        Args: { user_uuid: string }
        Returns: {
          accuracy_percentage: number
          avg_score: number
          correct_answers: number
          subject: string
          tests_taken: number
          total_questions: number
        }[]
      }
      get_user_subscription_status: {
        Args: { user_uuid: string }
        Returns: {
          days_left: number
          is_subscription_active: boolean
          is_trial_active: boolean
          plan_name: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_user_progress_data: { Args: { user_uuid: string }; Returns: Json }
      search_knowledge_base: {
        Args: {
          limit_count?: number
          search_query: string
          subject_filter?: string
          topic_filter?: string
        }
        Returns: {
          common_mistakes: Json
          correct_answer: string
          explanation: string
          hints: Json
          id: string
          question_text: string
          relevance_score: number
          subject: string
          topic: string
        }[]
      }
      update_admin_setting: {
        Args: { p_setting_key: string; p_setting_value: Json }
        Returns: boolean
      }
      update_user_streak: {
        Args: { user_uuid: string }
        Returns: {
          best_streak: number
          current_streak: number
          is_new_best: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student"
      difficulty_level: "easy" | "medium" | "hard"
      exam_state: "LIVE" | "PAUSED" | "SUBMITTED" | "CANCELLED"
      exam_type:
        | "MOCK"
        | "PUZZLE"
        | "CHALLENGE"
        | "INTERACTIVE_DEMO"
        | "PRACTICE"
      group_member_role: "member" | "moderator"
      material_type: "pdf" | "video" | "image" | "document" | "note"
      message_type: "text" | "image" | "file" | "audio"
      pathway: "standard" | "extended"
      question_difficulty: "easy" | "medium" | "hard"
      subject_name:
        | "mathematics"
        | "physics"
        | "chemistry"
        | "biology"
        | "english"
        | "history"
        | "economics"
        | "computer_science"
      test_subject:
        | "mathematics"
        | "science"
        | "language_literature"
        | "social_studies"
        | "physics"
        | "chemistry"
        | "biology"
      test_type: "quick_test" | "topic_practice" | "mock_test"
      user_role: "admin" | "student" | "moderator"
      user_role_sg: "student" | "admin" | "moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "student"],
      difficulty_level: ["easy", "medium", "hard"],
      exam_state: ["LIVE", "PAUSED", "SUBMITTED", "CANCELLED"],
      exam_type: [
        "MOCK",
        "PUZZLE",
        "CHALLENGE",
        "INTERACTIVE_DEMO",
        "PRACTICE",
      ],
      group_member_role: ["member", "moderator"],
      material_type: ["pdf", "video", "image", "document", "note"],
      message_type: ["text", "image", "file", "audio"],
      pathway: ["standard", "extended"],
      question_difficulty: ["easy", "medium", "hard"],
      subject_name: [
        "mathematics",
        "physics",
        "chemistry",
        "biology",
        "english",
        "history",
        "economics",
        "computer_science",
      ],
      test_subject: [
        "mathematics",
        "science",
        "language_literature",
        "social_studies",
        "physics",
        "chemistry",
        "biology",
      ],
      test_type: ["quick_test", "topic_practice", "mock_test"],
      user_role: ["admin", "student", "moderator"],
      user_role_sg: ["student", "admin", "moderator"],
    },
  },
} as const
