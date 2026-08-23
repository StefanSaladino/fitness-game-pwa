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
    PostgrestVersion: "14.15"
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
          profile_code: string
          profile_picture_path: string | null
          preferred_weight_unit: string
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
          profile_code?: string
          profile_picture_path?: string | null
          preferred_weight_unit?: string
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
          profile_code?: string
          profile_picture_path?: string | null
          preferred_weight_unit?: string
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
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index: number
          revision?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          revision?: number
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
      apply_lifting_workout_mutation: {
        Args: {
          p_idempotency_key: string
          p_mutation_kind: string
          p_payload: Json
          p_workout_id: string
        }
        Returns: Json
      }
      cancel_lifting_workout: {
        Args: { p_workout_id: string }
        Returns: string
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
      get_group_competition_leaderboard: {
        Args: { p_group_id: string; p_period?: string; p_week_start?: string }
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
      is_active_group_member: { Args: { p_group_id: string }; Returns: boolean }
      leave_group: { Args: { p_group_id: string }; Returns: undefined }
      log_cardio_activity: {
        Args: {
          p_active_duration_seconds: number
          p_category: Database["public"]["Enums"]["workout_category"]
          p_notes?: string
        }
        Returns: string
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
      reconcile_lifting_v1_scoring_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reconcile_my_lifting_v1_scoring: { Args: never; Returns: undefined }
      reconcile_weekly_lifting_consistency_for_user: {
        Args: { p_as_of_date?: string; p_user_id: string }
        Returns: undefined
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
      resume_lifting_workout: {
        Args: { p_workout_id: string }
        Returns: string
      }
      resume_lifting_workout_intent: {
        Args: { p_action_at: string; p_workout_id: string }
        Returns: Json
      }
      revoke_group_invite: { Args: { p_invite_id: string }; Returns: undefined }
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
      set_group_activity_reaction: {
        Args: {
          p_activity_key: string
          p_group_id: string
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
      start_or_resume_lifting_workout: { Args: never; Returns: string }
      start_or_resume_lifting_workout_intent: {
        Args: { p_action_at: string }
        Returns: Json
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
      update_my_profile_settings: {
        Args: {
          p_display_name: string
          p_preferred_weight_unit: string
          p_timezone: string
          p_username: string
          p_weekly_target: number
        }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      users_share_active_group: {
        Args: { p_other_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      benchmark_state: "UNSEEN" | "CALIBRATING" | "ESTABLISHED"
      group_member_status: "ACTIVE" | "REMOVED"
      group_role: "OWNER" | "ADMIN" | "MEMBER"
      scoring_event_type:
        | "LIFTING_WORKOUT"
        | "EXERCISE_COMPLETE"
        | "EXERCISE_PROGRESS"
        | "CARDIO_BONUS"
      set_type: "WARMUP" | "WORKING" | "DROP" | "FAILURE"
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
      scoring_event_type: [
        "LIFTING_WORKOUT",
        "EXERCISE_COMPLETE",
        "EXERCISE_PROGRESS",
        "CARDIO_BONUS",
      ],
      set_type: ["WARMUP", "WORKING", "DROP", "FAILURE"],
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
