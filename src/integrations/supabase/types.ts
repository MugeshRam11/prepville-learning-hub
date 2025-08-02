export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      user_streaks: {
        Row: {
          activity_type: string
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          date: string
          id?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      difficulty_level: "easy" | "medium" | "hard"
      group_member_role: "member" | "moderator"
      message_type: "text" | "image" | "file" | "audio"
      pathway: "standard" | "extended"
      question_difficulty: "easy" | "medium" | "hard"
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
      difficulty_level: ["easy", "medium", "hard"],
      group_member_role: ["member", "moderator"],
      message_type: ["text", "image", "file", "audio"],
      pathway: ["standard", "extended"],
      question_difficulty: ["easy", "medium", "hard"],
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
