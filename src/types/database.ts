export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      ai_usage: {
        Row: {
          count: number;
          date: string;
          user_id: string;
        };
        Insert: {
          count?: number;
          date: string;
          user_id: string;
        };
        Update: {
          count?: number;
          date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_targets: {
        Row: {
          base_kcal: number;
          carbs_g: number;
          computed_at: string;
          date: string;
          fat_g: number;
          is_training_day: boolean;
          protein_g: number;
          tdee_used: number | null;
          user_id: string;
          workout_bonus_kcal: number;
        };
        Insert: {
          base_kcal: number;
          carbs_g: number;
          computed_at?: string;
          date: string;
          fat_g: number;
          is_training_day?: boolean;
          protein_g: number;
          tdee_used?: number | null;
          user_id: string;
          workout_bonus_kcal?: number;
        };
        Update: {
          base_kcal?: number;
          carbs_g?: number;
          computed_at?: string;
          date?: string;
          fat_g?: number;
          is_training_day?: boolean;
          protein_g?: number;
          tdee_used?: number | null;
          user_id?: string;
          workout_bonus_kcal?: number;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          expires_at: string | null;
          is_premium: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          expires_at?: string | null;
          is_premium?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          expires_at?: string | null;
          is_premium?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          category: string;
          created_at: string;
          custom_name: string | null;
          equipment: string | null;
          id: string;
          met_value: number | null;
          muscle_groups: string[];
          name_key: string | null;
          owner_id: string | null;
          tracking_type: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          custom_name?: string | null;
          equipment?: string | null;
          id?: string;
          met_value?: number | null;
          muscle_groups?: string[];
          name_key?: string | null;
          owner_id?: string | null;
          tracking_type: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          custom_name?: string | null;
          equipment?: string | null;
          id?: string;
          met_value?: number | null;
          muscle_groups?: string[];
          name_key?: string | null;
          owner_id?: string | null;
          tracking_type?: string;
        };
        Relationships: [];
      };
      favorite_meals: {
        Row: {
          created_at: string;
          id: string;
          items: Json;
          title: string;
          updated_at: string;
          use_count: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          items?: Json;
          title: string;
          updated_at?: string;
          use_count?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          items?: Json;
          title?: string;
          updated_at?: string;
          use_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      food_items: {
        Row: {
          barcode: string | null;
          carbs_g: number;
          created_at: string;
          fat_g: number;
          food_log_id: string;
          grams: number | null;
          id: string;
          kcal: number;
          name: string;
          protein_g: number;
        };
        Insert: {
          barcode?: string | null;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          food_log_id: string;
          grams?: number | null;
          id?: string;
          kcal?: number;
          name: string;
          protein_g?: number;
        };
        Update: {
          barcode?: string | null;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          food_log_id?: string;
          grams?: number | null;
          id?: string;
          kcal?: number;
          name?: string;
          protein_g?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'food_items_food_log_id_fkey';
            columns: ['food_log_id'];
            isOneToOne: false;
            referencedRelation: 'food_logs';
            referencedColumns: ['id'];
          },
        ];
      };
      food_logs: {
        Row: {
          ai_confidence: number | null;
          ai_raw: Json | null;
          carbs_g: number;
          created_at: string;
          date: string;
          fat_g: number;
          id: string;
          image_path: string | null;
          kcal: number;
          logged_at: string;
          meal_type: string;
          protein_g: number;
          source: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_confidence?: number | null;
          ai_raw?: Json | null;
          carbs_g?: number;
          created_at?: string;
          date: string;
          fat_g?: number;
          id?: string;
          image_path?: string | null;
          kcal?: number;
          logged_at?: string;
          meal_type: string;
          protein_g?: number;
          source: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_confidence?: number | null;
          ai_raw?: Json | null;
          carbs_g?: number;
          created_at?: string;
          date?: string;
          fat_g?: number;
          id?: string;
          image_path?: string | null;
          kcal?: number;
          logged_at?: string;
          meal_type?: string;
          protein_g?: number;
          source?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          activity_level: string | null;
          birth_date: string | null;
          created_at: string;
          diet: string | null;
          display_name: string | null;
          eat_back_factor: number;
          goal: string | null;
          goal_rate_kg_per_week: number | null;
          health_disclaimer_accepted_at: string | null;
          height_cm: number | null;
          id: string;
          locale: string;
          motivation: string | null;
          sex: string | null;
          target_weight_kg: number | null;
          training_experience: string | null;
          unit_system: string;
          updated_at: string;
          workouts_per_week: number | null;
        };
        Insert: {
          activity_level?: string | null;
          birth_date?: string | null;
          created_at?: string;
          diet?: string | null;
          display_name?: string | null;
          eat_back_factor?: number;
          goal?: string | null;
          goal_rate_kg_per_week?: number | null;
          health_disclaimer_accepted_at?: string | null;
          height_cm?: number | null;
          id: string;
          locale?: string;
          motivation?: string | null;
          sex?: string | null;
          target_weight_kg?: number | null;
          training_experience?: string | null;
          unit_system?: string;
          updated_at?: string;
          workouts_per_week?: number | null;
        };
        Update: {
          activity_level?: string | null;
          birth_date?: string | null;
          created_at?: string;
          diet?: string | null;
          display_name?: string | null;
          eat_back_factor?: number;
          goal?: string | null;
          goal_rate_kg_per_week?: number | null;
          health_disclaimer_accepted_at?: string | null;
          height_cm?: number | null;
          id?: string;
          locale?: string;
          motivation?: string | null;
          sex?: string | null;
          target_weight_kg?: number | null;
          training_experience?: string | null;
          unit_system?: string;
          updated_at?: string;
          workouts_per_week?: number | null;
        };
        Relationships: [];
      };
      routine_exercises: {
        Row: {
          exercise_id: string;
          id: string;
          order_index: number;
          routine_id: string;
          superset_group: number | null;
          target_reps: number | null;
          target_reps_min: number | null;
          target_sets: number | null;
        };
        Insert: {
          exercise_id: string;
          id?: string;
          order_index?: number;
          routine_id: string;
          superset_group?: number | null;
          target_reps?: number | null;
          target_reps_min?: number | null;
          target_sets?: number | null;
        };
        Update: {
          exercise_id?: string;
          id?: string;
          order_index?: number;
          routine_id?: string;
          superset_group?: number | null;
          target_reps?: number | null;
          target_reps_min?: number | null;
          target_sets?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_exercises_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
        ];
      };
      routines: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tdee_estimates: {
        Row: {
          blended_tdee: number | null;
          confidence: number | null;
          created_at: string;
          formula_tdee: number | null;
          observed_tdee: number | null;
          reason_code: string | null;
          user_id: string;
          week_start: string;
          weekly_change_kcal: number | null;
          weight_trend_kg: number | null;
        };
        Insert: {
          blended_tdee?: number | null;
          confidence?: number | null;
          created_at?: string;
          formula_tdee?: number | null;
          observed_tdee?: number | null;
          reason_code?: string | null;
          user_id: string;
          week_start: string;
          weekly_change_kcal?: number | null;
          weight_trend_kg?: number | null;
        };
        Update: {
          blended_tdee?: number | null;
          confidence?: number | null;
          created_at?: string;
          formula_tdee?: number | null;
          observed_tdee?: number | null;
          reason_code?: string | null;
          user_id?: string;
          week_start?: string;
          weekly_change_kcal?: number | null;
          weight_trend_kg?: number | null;
        };
        Relationships: [];
      };
      training_plan_days: {
        Row: {
          expected_kcal: number | null;
          routine_id: string | null;
          user_id: string;
          weekday: number;
        };
        Insert: {
          expected_kcal?: number | null;
          routine_id?: string | null;
          user_id: string;
          weekday: number;
        };
        Update: {
          expected_kcal?: number | null;
          routine_id?: string | null;
          user_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'training_plan_days_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
        ];
      };
      water_logs: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          logged_at: string;
          ml: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          logged_at?: string;
          ml: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          logged_at?: string;
          ml?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          created_at: string;
          date: string;
          healthkit_uuid: string | null;
          id: string;
          source: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          date: string;
          healthkit_uuid?: string | null;
          id?: string;
          source?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          healthkit_uuid?: string | null;
          id?: string;
          source?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          completed_at: string | null;
          distance_m: number | null;
          duration_s: number | null;
          exercise_id: string;
          id: string;
          reps: number | null;
          rpe: number | null;
          set_index: number;
          updated_at: string;
          weight_kg: number | null;
          workout_id: string;
        };
        Insert: {
          completed_at?: string | null;
          distance_m?: number | null;
          duration_s?: number | null;
          exercise_id: string;
          id?: string;
          reps?: number | null;
          rpe?: number | null;
          set_index?: number;
          updated_at?: string;
          weight_kg?: number | null;
          workout_id: string;
        };
        Update: {
          completed_at?: string | null;
          distance_m?: number | null;
          duration_s?: number | null;
          exercise_id?: string;
          id?: string;
          reps?: number | null;
          rpe?: number | null;
          set_index?: number;
          updated_at?: string;
          weight_kg?: number | null;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sets_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_sets_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      workouts: {
        Row: {
          category: string;
          created_at: string;
          ended_at: string | null;
          healthkit_uuid: string | null;
          id: string;
          kcal_burned: number | null;
          kcal_source: string | null;
          notes: string | null;
          routine_id: string | null;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          ended_at?: string | null;
          healthkit_uuid?: string | null;
          id?: string;
          kcal_burned?: number | null;
          kcal_source?: string | null;
          notes?: string | null;
          routine_id?: string | null;
          started_at: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          ended_at?: string | null;
          healthkit_uuid?: string | null;
          id?: string;
          kcal_burned?: number | null;
          kcal_source?: string | null;
          notes?: string | null;
          routine_id?: string | null;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workouts_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      v_daily_summary: {
        Row: {
          base_kcal: number | null;
          carbs_eaten: number | null;
          date: string | null;
          fat_eaten: number | null;
          food_log_count: number | null;
          had_workout: boolean | null;
          is_training_day: boolean | null;
          kcal_burned: number | null;
          kcal_eaten: number | null;
          protein_eaten: number | null;
          set_volume_kg: number | null;
          target_carbs_g: number | null;
          target_fat_g: number | null;
          target_kcal: number | null;
          target_protein_g: number | null;
          user_id: string | null;
          workout_bonus_kcal: number | null;
          workout_count: number | null;
        };
        Relationships: [];
      };
      v_exercise_progress: {
        Row: {
          estimated_1rm_kg: number | null;
          exercise_id: string | null;
          max_weight_kg: number | null;
          set_count: number | null;
          user_id: string | null;
          volume_kg: number | null;
          week_start: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sets_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      get_ai_usage_count: {
        Args: { p_date: string; p_user_id: string };
        Returns: number;
      };
      increment_ai_usage: {
        Args: { p_date: string; p_user_id: string };
        Returns: {
          count: number;
          date: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'ai_usage';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      refund_ai_usage: {
        Args: { p_date: string; p_user_id: string };
        Returns: undefined;
      };
      reserve_ai_usage: {
        Args: { p_date: string; p_limit: number; p_user_id: string };
        Returns: number;
      };
      trigger_cleanup_label_photos: { Args: never; Returns: undefined };
      trigger_recompute_targets: { Args: never; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          lifecycle_configuration: Json | null;
          lifecycle_configuration_generation: string | null;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string | null;
          versioning_status: string;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          lifecycle_configuration?: Json | null;
          lifecycle_configuration_generation?: string | null;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          lifecycle_configuration?: Json | null;
          lifecycle_configuration_generation?: string | null;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          archived_at: string | null;
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vector_indexes_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_vectors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: { delete_markers?: string; noncurrent_versions?: string };
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
          raw_prefix_param?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delete_markers?: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          next_token_archived_at?: string;
          next_token_version?: string;
          noncurrent_versions?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          delete_markers?: string;
          levels?: number;
          limits?: number;
          noncurrent_versions?: string;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          delete_markers?: string;
          noncurrent_versions?: string;
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
          p_start_after_version?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          delete_markers?: string;
          levels?: number;
          limits?: number;
          noncurrent_versions?: string;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
          start_after_archived_at?: string;
          start_after_is_continuation?: boolean;
          start_after_version?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const;
