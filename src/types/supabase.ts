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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      deload_log: {
        Row: {
          fatigue_score: number
          id: string
          reason: string
          triggered_at: string | null
          user_id: string
          volume_reduction_pct: number
        }
        Insert: {
          fatigue_score: number
          id?: string
          reason: string
          triggered_at?: string | null
          user_id: string
          volume_reduction_pct: number
        }
        Update: {
          fatigue_score?: number
          id?: string
          reason?: string
          triggered_at?: string | null
          user_id?: string
          volume_reduction_pct?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string | null
          created_by: string | null
          equipment: string | null
          id: string
          is_custom: boolean | null
          movement_pattern: string
          muscle_group: string
          name: string
          secondary_muscles: string[] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          equipment?: string | null
          id?: string
          is_custom?: boolean | null
          movement_pattern: string
          muscle_group: string
          name: string
          secondary_muscles?: string[] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          equipment?: string | null
          id?: string
          is_custom?: boolean | null
          movement_pattern?: string
          muscle_group?: string
          name?: string
          secondary_muscles?: string[] | null
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          exercise_id: string
          id: string
          pr_type: string
          reps: number | null
          set_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          exercise_id: string
          id?: string
          pr_type: string
          reps?: number | null
          set_id?: string | null
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          exercise_id?: string
          id?: string
          pr_type?: string
          reps?: number | null
          set_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          experience_level: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phase_started_at: string | null
          rest_timer_seconds: number
          training_goal: string | null
          training_phase: string | null
          training_style: string | null
          updated_at: string | null
          weekly_goal_sessions: number
        }
        Insert: {
          avatar_url?: string | null
          experience_level?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phase_started_at?: string | null
          rest_timer_seconds?: number
          training_goal?: string | null
          training_phase?: string | null
          training_style?: string | null
          updated_at?: string | null
          weekly_goal_sessions?: number
        }
        Update: {
          avatar_url?: string | null
          experience_level?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phase_started_at?: string | null
          rest_timer_seconds?: number
          training_goal?: string | null
          training_phase?: string | null
          training_style?: string | null
          updated_at?: string | null
          weekly_goal_sessions?: number
        }
        Relationships: []
      }
      program_days: {
        Row: {
          day_number: number
          id: string
          name: string | null
          program_id: string
          week_number: number
        }
        Insert: {
          day_number: number
          id?: string
          name?: string | null
          program_id: string
          week_number: number
        }
        Update: {
          day_number?: number
          id?: string
          name?: string | null
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          exercise_id: string
          id: string
          order_index: number
          program_day_id: string
          reps_target: string
          rpe_target: number | null
          sets_target: number
        }
        Insert: {
          exercise_id: string
          id?: string
          order_index: number
          program_day_id: string
          reps_target: string
          rpe_target?: number | null
          sets_target: number
        }
        Update: {
          exercise_id?: string
          id?: string
          order_index?: number
          program_day_id?: string
          reps_target?: string
          rpe_target?: number | null
          sets_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          duration_weeks: number
          goal: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_weeks: number
          goal?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_weeks?: number
          goal?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          order_index: number
          routine_id: string
          target_reps: number
          target_sets: number
        }
        Insert: {
          exercise_id: string
          id?: string
          order_index: number
          routine_id: string
          target_reps?: number
          target_sets?: number
        }
        Update: {
          exercise_id?: string
          id?: string
          order_index?: number
          routine_id?: string
          target_reps?: number
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          completed_at: string | null
          id: string
          is_warmup: boolean | null
          reps: number
          rest_seconds: number | null
          rpe: number | null
          set_number: number
          weight_kg: number
          workout_exercise_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_warmup?: boolean | null
          reps: number
          rest_seconds?: number | null
          rpe?: number | null
          set_number: number
          weight_kg: number
          workout_exercise_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_warmup?: boolean | null
          reps?: number
          rest_seconds?: number | null
          rpe?: number | null
          set_number?: number
          weight_kg?: number
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercise_preferences: {
        Row: {
          exercise_id: string
          rest_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          rest_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          rest_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_preferences_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          notes: string | null
          started_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          started_at: string
          title?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          started_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_update_prs: {
        Args: {
          p_exercise_id: string
          p_reps: number
          p_set_id: string
          p_user_id: string
          p_weight: number
        }
        Returns: {
          is_pr: boolean
          new_value: number
          old_value: number
          pr_type: string
        }[]
      }
      get_user_exercise_frequency: {
        Args: { p_user_id: string }
        Returns: {
          exercise_id: string
          set_count: number
        }[]
      }
      get_weekly_volume: {
        Args: { p_user_id: string; p_weeks?: number }
        Returns: {
          avg_rpe: number
          muscle_group: string
          total_sets: number
          total_volume: number
          week_start: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
