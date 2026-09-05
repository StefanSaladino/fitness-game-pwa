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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      exercise_catalog: {
        Row: {
          active: boolean
          aliases: string[]
          canonical_name: string
          created_at: string
          id: string
          measurement_type: string
          primary_muscle_group: string
          workout_type: string
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          canonical_name: string
          created_at?: string
          id?: string
          measurement_type: string
          primary_muscle_group?: string
          workout_type?: string
        }
        Update: {
          active?: boolean
          aliases?: string[]
          canonical_name?: string
          created_at?: string
          id?: string
          measurement_type?: string
          primary_muscle_group?: string
          workout_type?: string
        }
        Relationships: []
      }
      exercise_progress: {
        Row: {
          achieved_at: string
          best_reps: number | null
          best_value: number
          best_weight_kg: number | null
          exercise_id: string
          metric_type: string
          source_workout_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at: string
          best_reps?: number | null
          best_value: number
          best_weight_kg?: number | null
          exercise_id: string
          metric_type: string
          source_workout_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          best_reps?: number | null
          best_value?: number
          best_weight_kg?: number | null
          exercise_id?: string
          metric_type?: string
          source_workout_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_source_workout_id_fkey"
            columns: ["source_workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_progress_observations: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          metric_type: string
          metric_value: number
          reps: number | null
          scoring_date: string
          user_id: string
          valid: boolean
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          metric_type: string
          metric_value: number
          reps?: number | null
          scoring_date: string
          user_id: string
          valid?: boolean
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          metric_type?: string
          metric_value?: number
          reps?: number | null
          scoring_date?: string
          user_id?: string
          valid?: boolean
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_progress_observations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_observations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_observations_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_activity_reactions: {
        Row: {
          activity_key: string
          created_at: string
          group_id: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_key: string
          created_at?: string
          group_id: string
          reaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_key?: string
          created_at?: string
          group_id?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_activity_reactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_activity_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_messages: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          deletion_reason: string | null
          group_id: string
          id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deletion_reason?: string | null
          group_id: string
          id?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deletion_reason?: string | null
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_reactions: {
        Row: {
          created_at: string
          group_id: string
          message_id: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          message_id: string
          reaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          message_id?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_reactions_message_fkey"
            columns: ["group_id", "message_id"]
            isOneToOne: false
            referencedRelation: "group_chat_messages"
            referencedColumns: ["group_id", "id"]
          },
          {
            foreignKeyName: "group_chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          created_by: string
          group_id: string
          id: string
          invited_user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          invited_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          invited_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          removed_at: string | null
          role: Database["public"]["Enums"]["group_role"]
          status: Database["public"]["Enums"]["group_member_status"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["group_role"]
          status?: Database["public"]["Enums"]["group_member_status"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["group_role"]
          status?: Database["public"]["Enums"]["group_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lifting_consistency_state: {
        Row: {
          best_completed_week_streak: number
          completed_weeks: number
          current_completed_week_streak: number
          goals_hit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_completed_week_streak?: number
          completed_weeks?: number
          current_completed_week_streak?: number
          goals_hit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_completed_week_streak?: number
          completed_weeks?: number
          current_completed_week_streak?: number
          goals_hit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifting_consistency_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          badge_achievements: boolean
          created_at: string
          group_activity: boolean
          group_invitations: boolean
          notifications_enabled: boolean
          personal_record_alerts: boolean
          updated_at: string
          user_id: string
          weekly_goal_reminders: boolean
          workout_reminders: boolean
        }
        Insert: {
          badge_achievements?: boolean
          created_at?: string
          group_activity?: boolean
          group_invitations?: boolean
          notifications_enabled?: boolean
          personal_record_alerts?: boolean
          updated_at?: string
          user_id: string
          weekly_goal_reminders?: boolean
          workout_reminders?: boolean
        }
        Update: {
          badge_achievements?: boolean
          created_at?: string
          group_activity?: boolean
          group_invitations?: boolean
          notifications_enabled?: boolean
          personal_record_alerts?: boolean
          updated_at?: string
          user_id?: string
          weekly_goal_reminders?: boolean
          workout_reminders?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_benchmarks: {
        Row: {
          benchmark_key: string
          benchmark_value: number | null
          higher_is_better: boolean | null
          last_bonus_scoring_date: string | null
          state: Database["public"]["Enums"]["benchmark_state"]
          updated_at: string
          user_id: string
          valid_observation_count: number
        }
        Insert: {
          benchmark_key: string
          benchmark_value?: number | null
          higher_is_better?: boolean | null
          last_bonus_scoring_date?: string | null
          state?: Database["public"]["Enums"]["benchmark_state"]
          updated_at?: string
          user_id: string
          valid_observation_count?: number
        }
        Update: {
          benchmark_key?: string
          benchmark_value?: number | null
          higher_is_better?: boolean | null
          last_bonus_scoring_date?: string | null
          state?: Database["public"]["Enums"]["benchmark_state"]
          updated_at?: string
          user_id?: string
          valid_observation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_benchmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_observations: {
        Row: {
          benchmark_key: string
          created_at: string
          higher_is_better: boolean
          id: string
          metric_type: string
          metric_value: number
          scoring_date: string
          user_id: string
          valid: boolean
          workout_id: string
        }
        Insert: {
          benchmark_key: string
          created_at?: string
          higher_is_better: boolean
          id?: string
          metric_type: string
          metric_value: number
          scoring_date: string
          user_id: string
          valid?: boolean
          workout_id: string
        }
        Update: {
          benchmark_key?: string
          created_at?: string
          higher_is_better?: boolean
          id?: string
          metric_type?: string
          metric_value?: number
          scoring_date?: string
          user_id?: string
          valid?: boolean
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_observations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_observations_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          onboarding_completed_at: string | null
          pending_weekly_workout_target: number | null
          pending_weekly_workout_target_week_start: string | null
          preferred_weight_unit: string
          profile_code: string
          profile_picture_path: string | null
          timezone: string
          updated_at: string
          username: string
          weekly_workout_target: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          onboarding_completed_at?: string | null
          pending_weekly_workout_target?: number | null
          pending_weekly_workout_target_week_start?: string | null
          preferred_weight_unit?: string
          profile_code?: string
          profile_picture_path?: string | null
          timezone?: string
          updated_at?: string
          username: string
          weekly_workout_target?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed_at?: string | null
          pending_weekly_workout_target?: number | null
          pending_weekly_workout_target_week_start?: string | null
          preferred_weight_unit?: string
          profile_code?: string
          profile_picture_path?: string | null
          timezone?: string
          updated_at?: string
          username?: string
          weekly_workout_target?: number
        }
        Relationships: []
      }
      scoring_events: {
        Row: {
          amount: number
          created_at: string
          event_type: Database["public"]["Enums"]["scoring_event_type"]
          exercise_id: string | null
          id: string
          metadata: Json
          scoring_date: string
          scoring_version: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          event_type: Database["public"]["Enums"]["scoring_event_type"]
          exercise_id?: string | null
          id?: string
          metadata?: Json
          scoring_date: string
          scoring_version?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["scoring_event_type"]
          exercise_id?: string | null
          id?: string
          metadata?: Json
          scoring_date?: string
          scoring_version?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_events_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_events_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          metadata: Json
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          created_at: string
          target: number
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          target: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          target?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_lifting_snapshots: {
        Row: {
          achieved: boolean
          finalized_at: string
          lifting_days: number
          target: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          achieved: boolean
          finalized_at?: string
          lifting_days: number
          target: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          achieved?: boolean
          finalized_at?: string
          lifting_days?: number
          target?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_lifting_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_index: number
          revision: number
          superset_group_id: string | null
          superset_order: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index: number
          revision?: number
          superset_group_id?: string | null
          superset_order?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          revision?: number
          superset_group_id?: string | null
          superset_order?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_mutation_receipts: {
        Row: {
          completed_at: string | null
          created_at: string
          idempotency_key: string
          mutation_kind: string
          request_payload: Json
          result_payload: Json | null
          user_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          idempotency_key: string
          mutation_kind: string
          request_payload: Json
          result_payload?: Json | null
          user_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          idempotency_key?: string
          mutation_kind?: string
          request_payload?: Json
          result_payload?: Json | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_mutation_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_mutation_receipts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          active_duration_seconds: number
          category: Database["public"]["Enums"]["workout_category"]
          created_at: string
          ended_at: string | null
          id: string
          last_resumed_at: string | null
          needs_review: boolean
          notes: string | null
          paused_at: string | null
          qualifies: boolean
          qualifies_cardio_bonus: boolean
          qualifies_lifting: boolean
          scoring_date: string
          source: Database["public"]["Enums"]["workout_source"]
          started_at: string
          status: Database["public"]["Enums"]["workout_status"]
          subtype: string | null
          timezone_at_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_duration_seconds?: number
          category: Database["public"]["Enums"]["workout_category"]
          created_at?: string
          ended_at?: string | null
          id?: string
          last_resumed_at?: string | null
          needs_review?: boolean
          notes?: string | null
          paused_at?: string | null
          qualifies?: boolean
          qualifies_cardio_bonus?: boolean
          qualifies_lifting?: boolean
          scoring_date: string
          source?: Database["public"]["Enums"]["workout_source"]
          started_at: string
          status?: Database["public"]["Enums"]["workout_status"]
          subtype?: string | null
          timezone_at_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_duration_seconds?: number
          category?: Database["public"]["Enums"]["workout_category"]
          created_at?: string
          ended_at?: string | null
          id?: string
          last_resumed_at?: string | null
          needs_review?: boolean
          notes?: string | null
          paused_at?: string | null
          qualifies?: boolean
          qualifies_cardio_bonus?: boolean
          qualifies_lifting?: boolean
          scoring_date?: string
          source?: Database["public"]["Enums"]["workout_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["workout_status"]
          subtype?: string | null
          timezone_at_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          bodyweight_mode: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          reps: number | null
          revision: number
          set_number: number
          set_type: Database["public"]["Enums"]["set_type"]
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          bodyweight_mode?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          reps?: number | null
          revision?: number
          set_number: number
          set_type?: Database["public"]["Enums"]["set_type"]
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          bodyweight_mode?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          reps?: number | null
          revision?: number
          set_number?: number
          set_type?: Database["public"]["Enums"]["set_type"]
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          event_type: Database["public"]["Enums"]["xp_event_type"]
          id: string
          metadata: Json
          scoring_date: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          event_type: Database["public"]["Enums"]["xp_event_type"]
          id?: string
          metadata?: Json
          scoring_date: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["xp_event_type"]
          id?: string
          metadata?: Json
          scoring_date?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_events_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_group_invite: { Args: { p_invite_id: string }; Returns: string }
      acknowledge_platform_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      add_lifting_workout_exercise: {
        Args: { p_exercise_id: string; p_workout_id: string }
        Returns: string
      }
      add_lifting_workout_set: {
        Args: {
          p_set_type?: Database["public"]["Enums"]["set_type"]
          p_workout_exercise_id: string
        }
        Returns: string
      }
      add_moderation_case_note: {
        Args: { p_case_id: string; p_note: string }
        Returns: string
      }
      apply_lifting_workout_mutation: {
        Args: {
          p_idempotency_key: string
          p_mutation_kind: string
          p_payload: Json
          p_workout_id: string
        }
        Returns: Json
      }
      assign_moderation_case: {
        Args: {
          p_assignee_user_id: string
          p_case_id: string
          p_reason: string
        }
        Returns: undefined
      }
      begin_moderation_activity_review: {
        Args: {
          p_access_reason: string
          p_activity_types?: Database["public"]["Enums"]["moderation_activity_type"][]
          p_case_id?: string
          p_target_user_id: string
        }
        Returns: {
          access_id: string
          account_status: Database["public"]["Enums"]["platform_account_status"]
          activity_types: Database["public"]["Enums"]["moderation_activity_type"][]
          case_id: string
          expires_at: string
          granted_at: string
          target_display_name: string
          target_user_id: string
          target_username: string
        }[]
      }
      cancel_lifting_workout: {
        Args: { p_workout_id: string }
        Returns: string
      }
      cancel_own_platform_account_deletion: {
        Args: { p_actor_user_id: string; p_reason: string }
        Returns: Database["public"]["Enums"]["platform_account_status"]
      }
      cancel_platform_account_deletion: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      capture_platform_capacity_snapshot: {
        Args: never
        Returns: {
          captured_at: string
          snapshot_id: number
        }[]
      }
      complete_onboarding: {
        Args: {
          p_display_name: string
          p_timezone: string
          p_username: string
          p_weekly_target: number
        }
        Returns: undefined
      }
      complete_platform_account_auth_transition: {
        Args: {
          p_actor_user_id: string
          p_coordination_revision: number
          p_error_code?: string
          p_success: boolean
          p_target_user_id: string
        }
        Returns: Database["public"]["Enums"]["platform_account_status"]
      }
      configure_push_delivery_runtime: {
        Args: { p_edge_function_url: string }
        Returns: undefined
      }
      copy_lifting_workout_set: {
        Args: { p_workout_set_id: string }
        Returns: string
      }
      create_group: { Args: { p_name: string }; Returns: Json }
      create_group_invite: {
        Args: { p_group_id: string; p_recipient: string }
        Returns: Json
      }
      current_group_role: {
        Args: { p_group_id: string }
        Returns: Database["public"]["Enums"]["group_role"]
      }
      decline_group_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      delete_cardio_activity: {
        Args: { p_workout_id: string }
        Returns: string
      }
      delete_group_chat_message: {
        Args: { p_group_id: string; p_message_id: string }
        Returns: undefined
      }
      delete_my_platform_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      edit_platform_message: {
        Args: {
          p_body: string
          p_expires_at: string
          p_message_id: string
          p_reason: string
          p_subject: string
        }
        Returns: {
          edited_at: string
          message_id: string
          revision: number
        }[]
      }
      enqueue_my_push_test: { Args: { p_endpoint: string }; Returns: string }
      finish_lifting_workout: {
        Args: { p_workout_id: string }
        Returns: string
      }
      get_exercise_picker_catalog: {
        Args: never
        Returns: {
          aliases: string[]
          canonical_name: string
          id: string
          last_used_at: string
          measurement_type: string
          primary_muscle_group: string
          workout_type: string
        }[]
      }
      get_global_all_time_leaderboard: {
        Args: never
        Returns: {
          badge_count: number
          display_name: string
          is_current_user: boolean
          lifting_days: number
          member_user_id: string
          pr_count: number
          profile_picture_path: string
          rank: number
          row_kind: string
          username: string
          xp: number
        }[]
      }
      get_group_competition_leaderboard: {
        Args: { p_group_id: string }
        Returns: {
          badge_count: number
          display_name: string
          is_current_user: boolean
          lifting_days: number
          member_user_id: string
          period_end: string
          period_start: string
          pr_count: number
          profile_picture_path: string
          rank: number
          username: string
          xp: number
        }[]
      }
      get_group_lifting_leaderboard: {
        Args: { p_group_id: string; p_week_start: string }
        Returns: {
          display_name: string
          member_user_id: string
          profile_picture_path: string
          username: string
          xp: number
        }[]
      }
      get_group_pending_invites: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          group_id: string
          id: string
          invited_display_name: string
          invited_user_id: string
          invited_username: string
        }[]
      }
      get_group_social_feed: {
        Args: {
          p_before_activity_at?: string
          p_before_activity_key?: string
          p_group_id: string
          p_limit?: number
        }
        Returns: {
          activity_at: string
          activity_key: string
          activity_type: string
          actor_user_id: string
          clap_count: number
          display_name: string
          fire_count: number
          metadata: Json
          my_reaction: string
          profile_picture_path: string
          strong_count: number
          username: string
        }[]
      }
      get_moderation_case_detail: {
        Args: { p_case_id: string }
        Returns: {
          assigned_at: string
          assigned_to: string
          case_id: string
          category: Database["public"]["Enums"]["user_report_category"]
          closed_at: string
          created_at: string
          reason: string
          reference_group_id: string
          reference_id: string
          reference_label: string
          reference_type: Database["public"]["Enums"]["user_report_reference_type"]
          report_id: string
          reporter_display_name: string
          reporter_user_id: string
          reporter_username: string
          resolution_reason: string
          retention_until: string
          status: Database["public"]["Enums"]["moderation_case_status"]
          target_display_name: string
          target_user_id: string
          target_username: string
          updated_at: string
        }[]
      }
      get_my_cardio_history: {
        Args: { p_limit?: number }
        Returns: {
          active_duration_seconds: number
          category: Database["public"]["Enums"]["workout_category"]
          daily_bonus_xp: number
          ended_at: string
          notes: string
          qualifies_cardio_bonus: boolean
          scoring_date: string
          started_at: string
          workout_id: string
        }[]
      }
      get_my_cardio_summary: {
        Args: never
        Returns: {
          last_30_days_active_minutes: number
          last_30_days_activities: number
          last_30_days_bonus_xp: number
          last_activity_at: string
          total_active_minutes: number
          total_activities: number
        }[]
      }
      get_my_exercise_progress_history: {
        Args: { p_exercise_id: string }
        Returns: {
          added_weight_sets: number
          assisted_sets: number
          completed_working_sets: number
          heaviest_weight_kg: number
          is_baseline: boolean
          is_current_pr: boolean
          is_pr: boolean
          max_completed_reps: number
          metric_type: string
          metric_value: number
          observed_at: string
          plain_bodyweight_sets: number
          previous_pr_value: number
          reps: number
          scoring_date: string
          session_volume_kg_reps: number
          weight_kg: number
          workout_id: string
        }[]
      }
      get_my_exercise_progress_overview: {
        Args: never
        Returns: {
          achieved_at: string
          average_days_between_sessions: number
          best_reps: number
          best_value: number
          best_weight_kg: number
          canonical_name: string
          exercise_id: string
          first_performed_at: string
          last_performed_at: string
          latest_metric_value: number
          latest_observed_at: string
          latest_reps: number
          latest_weight_kg: number
          measurement_type: string
          metric_type: string
          observation_count: number
          previous_pr_value: number
          session_count: number
        }[]
      }
      get_my_lifting_calendar_summaries: {
        Args: { p_month_count?: number; p_week_count?: number }
        Returns: {
          completed_lifting_sessions: number
          completed_working_sets: number
          exercise_count: number
          period_end: string
          period_kind: string
          period_start: string
          pr_count: number
          volume_kg_reps: number
        }[]
      }
      get_my_lifting_consistency_summary: {
        Args: never
        Returns: {
          badges: Json
          best_completed_week_streak: number
          completed_weeks: number
          current_completed_week_streak: number
          current_week_lifting_days: number
          current_week_start: string
          current_week_target: number
          goals_hit: number
          recent_weeks: Json
        }[]
      }
      get_my_pending_group_invites: {
        Args: never
        Returns: {
          created_at: string
          group_id: string
          group_name: string
          id: string
          invited_by_display_name: string
          invited_by_user_id: string
          invited_by_username: string
        }[]
      }
      get_my_platform_access: {
        Args: never
        Returns: {
          account_status: Database["public"]["Enums"]["platform_account_status"]
          is_platform_admin: boolean
        }[]
      }
      get_my_push_device_summary: {
        Args: never
        Returns: {
          active_device_count: number
        }[]
      }
      get_platform_account_detail: {
        Args: { p_target_user_id: string }
        Returns: {
          account_status: Database["public"]["Enums"]["platform_account_status"]
          created_at: string
          deletion_requested_at: string
          deletion_requested_by: string
          display_name: string
          is_platform_admin: boolean
          last_sign_in_at: string
          status_reason: string
          status_updated_at: string
          suspension_review_at: string
          user_id: string
          username: string
        }[]
      }
      get_platform_capacity_current: {
        Args: never
        Returns: {
          available: boolean
          limit_value: number
          measured_at: string
          metric_code: string
          note: string
          source: string
          unit: string
          value: number
        }[]
      }
      get_platform_capacity_history: {
        Args: { p_snapshot_limit?: number }
        Returns: {
          available: boolean
          captured_at: string
          limit_value: number
          metric_code: string
          note: string
          snapshot_id: number
          source: string
          unit: string
          value: number
        }[]
      }
      get_push_delivery_runtime: {
        Args: never
        Returns: {
          dispatch_token: string
          edge_function_url: string
          vapid_private_key: string
          vapid_public_key: string
        }[]
      }
      grant_platform_admin: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      group_chat_topic_group_id: { Args: { p_topic: string }; Returns: string }
      group_role_for_user: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["group_role"]
      }
      group_social_activity_exists: {
        Args: { p_activity_key: string; p_group_id: string }
        Returns: boolean
      }
      group_social_activity_key: {
        Args: { p_identity: string; p_kind: string }
        Returns: string
      }
      initialize_push_vapid_keys: {
        Args: { p_private_key: string; p_public_key: string }
        Returns: {
          vapid_private_key: string
          vapid_public_key: string
        }[]
      }
      is_active_group_member: { Args: { p_group_id: string }; Returns: boolean }
      leave_group: { Args: { p_group_id: string }; Returns: undefined }
      list_group_chat_messages: {
        Args: {
          p_before_created_at?: string
          p_before_message_id?: string
          p_group_id: string
          p_limit?: number
        }
        Returns: {
          author_user_id: string
          body: string
          can_delete: boolean
          clap_count: number
          created_at: string
          deleted_at: string
          display_name: string
          fire_count: number
          heart_count: number
          laugh_count: number
          message_id: string
          my_reaction: string
          profile_picture_path: string
          strong_count: number
          username: string
        }[]
      }
      list_moderation_activity_review: {
        Args: {
          p_access_id: string
          p_before_activity_key?: string
          p_before_occurred_at?: string
          p_page_size?: number
        }
        Returns: {
          activity_key: string
          activity_type: Database["public"]["Enums"]["moderation_activity_type"]
          detail: string
          has_more: boolean
          metadata: Json
          occurred_at: string
          source_case_id: string
          title: string
        }[]
      }
      list_moderation_case_events: {
        Args: { p_case_id: string }
        Returns: {
          action: string
          actor_display_name: string
          actor_user_id: string
          actor_username: string
          after_state: Json
          before_state: Json
          created_at: string
          event_id: string
          reason: string
        }[]
      }
      list_moderation_case_notes: {
        Args: { p_case_id: string }
        Returns: {
          author_display_name: string
          author_user_id: string
          author_username: string
          body: string
          created_at: string
          note_id: string
        }[]
      }
      list_moderation_cases: {
        Args: {
          p_assigned_to?: string
          p_page?: number
          p_page_size?: number
          p_status?: Database["public"]["Enums"]["moderation_case_status"]
        }
        Returns: {
          assigned_to: string
          case_id: string
          category: Database["public"]["Enums"]["user_report_category"]
          closed_at: string
          created_at: string
          reason_excerpt: string
          reference_label: string
          reference_type: Database["public"]["Enums"]["user_report_reference_type"]
          report_id: string
          reporter_display_name: string
          reporter_user_id: string
          reporter_username: string
          status: Database["public"]["Enums"]["moderation_case_status"]
          target_display_name: string
          target_user_id: string
          target_username: string
          total_count: number
          updated_at: string
        }[]
      }
      list_my_platform_messages: {
        Args: {
          p_include_expired?: boolean
          p_page?: number
          p_page_size?: number
        }
        Returns: {
          acknowledged_at: string
          acknowledgement_required: boolean
          audience_type: Database["public"]["Enums"]["platform_message_audience_type"]
          body: string
          current_revision: number
          delivered_at: string
          delivery_state: string
          edited_at: string
          expires_at: string
          is_expired: boolean
          message_id: string
          message_type: Database["public"]["Enums"]["platform_message_type"]
          read_at: string
          sent_at: string
          subject: string
          total_count: number
          unread_count: number
        }[]
      }
      list_platform_accounts: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_query?: string
          p_status?: Database["public"]["Enums"]["platform_account_status"]
        }
        Returns: {
          account_status: Database["public"]["Enums"]["platform_account_status"]
          created_at: string
          deletion_requested_at: string
          display_name: string
          is_platform_admin: boolean
          last_sign_in_at: string
          suspension_review_at: string
          total_count: number
          user_id: string
          username: string
        }[]
      }
      list_platform_messages: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: {
          acknowledged_count: number
          acknowledgement_required: boolean
          audience_label: string
          audience_type: Database["public"]["Enums"]["platform_message_audience_type"]
          body: string
          current_revision: number
          edited_at: string
          expires_at: string
          message_id: string
          message_type: Database["public"]["Enums"]["platform_message_type"]
          read_count: number
          recipient_count: number
          sent_at: string
          status: Database["public"]["Enums"]["platform_message_status"]
          subject: string
          total_count: number
          withdrawn_at: string
        }[]
      }
      log_cardio_activity: {
        Args: {
          p_active_duration_seconds: number
          p_category: Database["public"]["Enums"]["workout_category"]
          p_notes?: string
        }
        Returns: string
      }
      mark_platform_account_deletion_storage_cleared: {
        Args: {
          p_actor_user_id: string
          p_deletion_revision: number
          p_target_user_id: string
        }
        Returns: undefined
      }
      mark_platform_message_read: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      move_lifting_workout_exercise: {
        Args: { p_new_order_index: number; p_workout_exercise_id: string }
        Returns: string
      }
      pause_lifting_workout: { Args: { p_workout_id: string }; Returns: string }
      pause_lifting_workout_intent: {
        Args: { p_action_at: string; p_workout_id: string }
        Returns: Json
      }
      post_group_chat_message: {
        Args: { p_body: string; p_group_id: string }
        Returns: string
      }
      prepare_platform_account_auth_transition: {
        Args: {
          p_action: string
          p_actor_user_id: string
          p_reason: string
          p_review_at?: string
          p_target_user_id: string
        }
        Returns: {
          account_status: Database["public"]["Enums"]["platform_account_status"]
          coordination_revision: number
          desired_banned: boolean
        }[]
      }
      prepare_platform_account_deletion: {
        Args: {
          p_actor_user_id: string
          p_confirmation: string
          p_mode: string
          p_target_user_id: string
        }
        Returns: {
          deletion_revision: number
          storage_cleanup_required: boolean
          storage_prefix: string
        }[]
      }
      prepare_push_delivery: {
        Args: { p_queue_id: string }
        Returns: {
          auth_secret: string
          body: string
          category: string
          endpoint: string
          p256dh: string
          queue_id: string
          subscription_id: string
          target_path: string
          title: string
        }[]
      }
      preview_platform_message_audience: {
        Args: {
          p_audience_type: Database["public"]["Enums"]["platform_message_audience_type"]
          p_message_type?: Database["public"]["Enums"]["platform_message_type"]
          p_target_group_id?: string
          p_target_user_id?: string
        }
        Returns: {
          audience_label: string
          audience_type: Database["public"]["Enums"]["platform_message_audience_type"]
          confirmation_phrase: string
          expires_at: string
          preview_id: string
          recipient_count: number
        }[]
      }
      reconcile_lifting_v1_scoring_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reconcile_my_lifting_v1_scoring: { Args: never; Returns: undefined }
      reconcile_weekly_lifting_consistency_for_user: {
        Args: { p_as_of_date?: string; p_user_id: string }
        Returns: undefined
      }
      record_platform_account_deletion_failure: {
        Args: {
          p_actor_user_id: string
          p_deletion_revision: number
          p_error_code: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      record_push_delivery_result: {
        Args: {
          p_error_code?: string
          p_outcome: string
          p_queue_id: string
          p_subscription_id: string
        }
        Returns: undefined
      }
      register_my_push_subscription: {
        Args: {
          p_auth_secret: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: string
      }
      remove_group_member: {
        Args: { p_group_id: string; p_target_user_id: string }
        Returns: undefined
      }
      remove_lifting_workout_exercise: {
        Args: { p_workout_exercise_id: string }
        Returns: string
      }
      remove_lifting_workout_set: {
        Args: { p_workout_set_id: string }
        Returns: string
      }
      request_own_platform_account_deletion: { Args: never; Returns: string }
      request_platform_account_deletion: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      restore_platform_account: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      resume_lifting_workout: {
        Args: { p_workout_id: string }
        Returns: string
      }
      resume_lifting_workout_intent: {
        Args: { p_action_at: string; p_workout_id: string }
        Returns: Json
      }
      revoke_group_invite: { Args: { p_invite_id: string }; Returns: undefined }
      revoke_my_push_subscription: {
        Args: { p_endpoint: string }
        Returns: boolean
      }
      revoke_platform_admin: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      save_lifting_workout_set: {
        Args: {
          p_bodyweight_mode: string
          p_completed: boolean
          p_reps: number
          p_set_type: Database["public"]["Enums"]["set_type"]
          p_weight_kg: number
          p_workout_set_id: string
        }
        Returns: string
      }
      schedule_weekly_target: { Args: { p_target: number }; Returns: undefined }
      search_platform_message_groups: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          eligible_recipient_count: number
          group_id: string
          group_name: string
        }[]
      }
      search_platform_message_users: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          account_status: Database["public"]["Enums"]["platform_account_status"]
          display_name: string
          user_id: string
          username: string
        }[]
      }
      send_platform_message: {
        Args: {
          p_acknowledgement_required: boolean
          p_audit_reason: string
          p_body: string
          p_confirmation: string
          p_expires_at: string
          p_preview_id: string
          p_subject: string
        }
        Returns: {
          message_id: string
          recipient_count: number
          sent_at: string
        }[]
      }
      set_group_activity_reaction: {
        Args: {
          p_activity_key: string
          p_group_id: string
          p_reaction_type?: string
        }
        Returns: undefined
      }
      set_group_chat_reaction: {
        Args: {
          p_group_id: string
          p_message_id: string
          p_reaction_type?: string
        }
        Returns: undefined
      }
      set_group_member_role: {
        Args: {
          p_group_id: string
          p_role: Database["public"]["Enums"]["group_role"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      start_lifting_workout_from_preset: {
        Args: { p_action_at?: string; p_exercise_ids: string[] }
        Returns: Json
      }
      start_or_resume_lifting_workout: { Args: never; Returns: string }
      start_or_resume_lifting_workout_intent: {
        Args: { p_action_at: string }
        Returns: Json
      }
      submit_user_report: {
        Args: {
          p_category: Database["public"]["Enums"]["user_report_category"]
          p_reason: string
          p_reference_group_id?: string
          p_reference_id?: string
          p_reference_type?: Database["public"]["Enums"]["user_report_reference_type"]
          p_target_user_id: string
        }
        Returns: string
      }
      suspend_platform_account: {
        Args: {
          p_reason: string
          p_review_at?: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      sync_lifting_badge: {
        Args: {
          p_badge_key: string
          p_earned_at: string
          p_metadata?: Json
          p_qualified: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      transfer_group_ownership: {
        Args: { p_group_id: string; p_target_user_id: string }
        Returns: undefined
      }
      update_moderation_case_status: {
        Args: {
          p_case_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["moderation_case_status"]
        }
        Returns: undefined
      }
      update_my_notification_preferences: {
        Args: {
          p_badge_achievements: boolean
          p_group_activity: boolean
          p_group_invitations: boolean
          p_notifications_enabled: boolean
          p_personal_record_alerts: boolean
          p_weekly_goal_reminders: boolean
          p_workout_reminders: boolean
        }
        Returns: {
          badge_achievements: boolean
          created_at: string
          group_activity: boolean
          group_invitations: boolean
          notifications_enabled: boolean
          personal_record_alerts: boolean
          updated_at: string
          user_id: string
          weekly_goal_reminders: boolean
          workout_reminders: boolean
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_profile_settings: {
        Args: {
          p_display_name: string
          p_preferred_weight_unit: string
          p_timezone: string
          p_username: string
          p_weekly_target: number
        }
        Returns: {
          created_at: string
          display_name: string
          id: string
          onboarding_completed_at: string | null
          pending_weekly_workout_target: number | null
          pending_weekly_workout_target_week_start: string | null
          preferred_weight_unit: string
          profile_code: string
          profile_picture_path: string | null
          timezone: string
          updated_at: string
          username: string
          weekly_workout_target: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      users_share_active_group: {
        Args: { p_other_user_id: string }
        Returns: boolean
      }
      withdraw_platform_message: {
        Args: { p_message_id: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      benchmark_state: "UNSEEN" | "CALIBRATING" | "ESTABLISHED"
      group_member_status: "ACTIVE" | "REMOVED"
      group_role: "OWNER" | "ADMIN" | "MEMBER"
      moderation_activity_type:
        | "ACCOUNT"
        | "WORKOUT"
        | "GROUP_MEMBERSHIP"
        | "GROUP_ACTIVITY"
        | "REPORT"
        | "COMMUNICATION"
      moderation_case_status: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED"
      platform_account_status: "ACTIVE" | "SUSPENDED" | "DELETION_PENDING"
      platform_message_audience_type: "USER" | "GROUP" | "ALL"
      platform_message_status: "SENT" | "WITHDRAWN"
      platform_message_type:
        | "NOTICE"
        | "WARNING"
        | "ACTION_REQUIRED"
        | "ACCOUNT_STATUS"
      scoring_event_type:
        | "LIFTING_WORKOUT"
        | "EXERCISE_COMPLETE"
        | "EXERCISE_PROGRESS"
        | "CARDIO_BONUS"
      set_type: "WARMUP" | "WORKING" | "DROP" | "FAILURE"
      user_report_category:
        | "HARASSMENT"
        | "SPAM"
        | "ABUSIVE_CONTENT"
        | "IMPERSONATION"
        | "CHEATING"
        | "SAFETY"
        | "OTHER"
      user_report_reference_type: "GROUP" | "WORKOUT" | "SOCIAL_ACTIVITY"
      workout_category:
        | "STRENGTH"
        | "RUNNING"
        | "WALKING_HIKING"
        | "CYCLING"
        | "SWIMMING"
        | "SPORT"
        | "CARDIO"
        | "HIIT"
        | "MOBILITY"
        | "OTHER"
      workout_source: "IN_APP" | "MANUAL" | "EXTERNAL"
      workout_status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      xp_event_type:
        | "DAILY_WORKOUT"
        | "PERFORMANCE_BONUS"
        | "WEEKLY_IMPROVEMENT"
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
      benchmark_state: ["UNSEEN", "CALIBRATING", "ESTABLISHED"],
      group_member_status: ["ACTIVE", "REMOVED"],
      group_role: ["OWNER", "ADMIN", "MEMBER"],
      moderation_activity_type: [
        "ACCOUNT",
        "WORKOUT",
        "GROUP_MEMBERSHIP",
        "GROUP_ACTIVITY",
        "REPORT",
        "COMMUNICATION",
      ],
      moderation_case_status: ["NEW", "IN_REVIEW", "RESOLVED", "DISMISSED"],
      platform_account_status: ["ACTIVE", "SUSPENDED", "DELETION_PENDING"],
      platform_message_audience_type: ["USER", "GROUP", "ALL"],
      platform_message_status: ["SENT", "WITHDRAWN"],
      platform_message_type: [
        "NOTICE",
        "WARNING",
        "ACTION_REQUIRED",
        "ACCOUNT_STATUS",
      ],
      scoring_event_type: [
        "LIFTING_WORKOUT",
        "EXERCISE_COMPLETE",
        "EXERCISE_PROGRESS",
        "CARDIO_BONUS",
      ],
      set_type: ["WARMUP", "WORKING", "DROP", "FAILURE"],
      user_report_category: [
        "HARASSMENT",
        "SPAM",
        "ABUSIVE_CONTENT",
        "IMPERSONATION",
        "CHEATING",
        "SAFETY",
        "OTHER",
      ],
      user_report_reference_type: ["GROUP", "WORKOUT", "SOCIAL_ACTIVITY"],
      workout_category: [
        "STRENGTH",
        "RUNNING",
        "WALKING_HIKING",
        "CYCLING",
        "SWIMMING",
        "SPORT",
        "CARDIO",
        "HIIT",
        "MOBILITY",
        "OTHER",
      ],
      workout_source: ["IN_APP", "MANUAL", "EXTERNAL"],
      workout_status: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
      xp_event_type: [
        "DAILY_WORKOUT",
        "PERFORMANCE_BONUS",
        "WEEKLY_IMPROVEMENT",
      ],
    },
  },
} as const

