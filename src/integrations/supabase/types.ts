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
          answer_key: string | null
          category: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions: boolean
          id: string
          marks: number
          mock_test_id: string
          question_image_url: string | null
          question_number: number
          question_text: string
          updated_at: string
          word_limit: number | null
        }
        Insert: {
          answer_key?: string | null
          category?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions?: boolean
          id?: string
          marks?: number
          mock_test_id: string
          question_image_url?: string | null
          question_number: number
          question_text: string
          updated_at?: string
          word_limit?: number | null
        }
        Update: {
          answer_key?: string | null
          category?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          has_sub_questions?: boolean
          id?: string
          marks?: number
          mock_test_id?: string
          question_image_url?: string | null
          question_number?: number
          question_text?: string
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
        ]
      }
      mock_sub_questions: {
        Row: {
          answer_key: string | null
          created_at: string
          id: string
          marks: number
          question_id: string
          sub_question_image_url: string | null
          sub_question_label: string
          sub_question_text: string
          word_limit: number | null
        }
        Insert: {
          answer_key?: string | null
          created_at?: string
          id?: string
          marks?: number
          question_id: string
          sub_question_image_url?: string | null
          sub_question_label: string
          sub_question_text: string
          word_limit?: number | null
        }
        Update: {
          answer_key?: string | null
          created_at?: string
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
      mock_tests: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          subject: Database["public"]["Enums"]["test_subject"]
          title: string
          topic: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          subject: Database["public"]["Enums"]["test_subject"]
          title: string
          topic: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          subject?: Database["public"]["Enums"]["test_subject"]
          title?: string
          topic?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_emoji: string | null
          avatar_id: number | null
          avatar_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          avatar_id?: number | null
          avatar_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          avatar_id?: number | null
          avatar_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
      test_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          score: number
          test_id: string | null
          time_taken_seconds: number | null
          total_questions: number
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          score?: number
          test_id?: string | null
          time_taken_seconds?: number | null
          total_questions: number
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          score?: number
          test_id?: string | null
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
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
