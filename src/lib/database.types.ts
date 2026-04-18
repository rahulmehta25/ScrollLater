// Enhanced TypeScript types for Supabase schema
// This file should be regenerated when schema changes

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EntryStatus = 'inbox' | 'scheduled' | 'completed' | 'archived'
export type ProcessingTaskType = 'summarize' | 'categorize' | 'schedule_suggest'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          display_name: string | null
          avatar_url: string | null
          timezone: string
          default_calendar_id: string | null
          preferred_scheduling_times: Json
          default_block_duration: number
          auto_schedule_enabled: boolean
          google_calendar_connected: boolean
          google_refresh_token: string | null
          apple_shortcut_token: string | null
          total_entries: number
          total_scheduled: number
          notification_email: boolean
          notification_weekly_digest: boolean
          notification_ai_insights: boolean
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: Json
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
          total_entries?: number
          total_scheduled?: number
          notification_email?: boolean
          notification_weekly_digest?: boolean
          notification_ai_insights?: boolean
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: Json
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
          notification_email?: boolean
          notification_weekly_digest?: boolean
          notification_ai_insights?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      entries: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          url: string | null
          title: string | null
          content: string
          original_input: string
          ai_summary: string | null
          ai_category: string | null
          ai_tags: string[]
          ai_confidence_score: number | null
          ai_schedule_suggestions: Json | null
          user_category: string | null
          user_tags: string[]
          user_notes: string | null
          priority: number
          status: EntryStatus
          scheduled_for: string | null
          completed_at: string | null
          calendar_event_id: string | null
          calendar_event_url: string | null
          source: string
          metadata: Json
          search_vector: unknown
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          url?: string | null
          title?: string | null
          content: string
          original_input: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[]
          ai_confidence_score?: number | null
          ai_schedule_suggestions?: Json | null
          user_category?: string | null
          user_tags?: string[]
          user_notes?: string | null
          priority?: number
          status?: EntryStatus
          scheduled_for?: string | null
          completed_at?: string | null
          calendar_event_id?: string | null
          calendar_event_url?: string | null
          source?: string
          metadata?: Json
        }
        Update: {
          url?: string | null
          title?: string | null
          content?: string
          original_input?: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[]
          ai_confidence_score?: number | null
          ai_schedule_suggestions?: Json | null
          user_category?: string | null
          user_tags?: string[]
          user_notes?: string | null
          priority?: number
          status?: EntryStatus
          scheduled_for?: string | null
          completed_at?: string | null
          calendar_event_id?: string | null
          calendar_event_url?: string | null
          source?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'entries_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string | null
          created_at: string
          is_system: boolean
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          icon?: string | null
          created_at?: string
          is_system?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          color?: string
          icon?: string | null
          is_system?: boolean
        }
        Relationships: []
      }
      processing_queue: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          created_at: string
          started_at: string | null
          completed_at: string | null
          task_type: ProcessingTaskType
          status: ProcessingStatus
          priority: number
          result: Json | null
          error_message: string | null
          retry_count: number
          max_retries: number
          ai_model_used: string | null
          processing_time_ms: number | null
          tokens_used: number | null
        }
        Insert: {
          id?: string
          entry_id: string
          user_id: string
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          task_type: ProcessingTaskType
          status?: ProcessingStatus
          priority?: number
          result?: Json | null
          error_message?: string | null
          retry_count?: number
          max_retries?: number
          ai_model_used?: string | null
          processing_time_ms?: number | null
          tokens_used?: number | null
        }
        Update: {
          started_at?: string | null
          completed_at?: string | null
          status?: ProcessingStatus
          priority?: number
          result?: Json | null
          error_message?: string | null
          retry_count?: number
          ai_model_used?: string | null
          processing_time_ms?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'processing_queue_entry_id_fkey'
            columns: ['entry_id']
            referencedRelation: 'entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'processing_queue_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          request_count: number
          window_start: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          request_count?: number
          window_start?: string
          created_at?: string
        }
        Update: {
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rate_limits_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      entry_summaries: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          title: string | null
          url: string | null
          content_preview: string
          ai_summary: string | null
          category: string | null
          status: EntryStatus
          scheduled_for: string | null
          priority: number
          category_color: string | null
          category_icon: string | null
          tag_count: number | null
        }
      }
      user_dashboard_stats: {
        Row: {
          user_id: string
          display_name: string | null
          total_entries: number
          total_scheduled: number
          inbox_count: number
          scheduled_count: number
          completed_count: number
          archived_count: number
          entries_this_week: number
          scheduled_this_week: number
        }
      }
    }
    Functions: {
      update_updated_at_column: {
        Args: Record<string, never>
        Returns: unknown
      }
      queue_entry_processing: {
        Args: Record<string, never>
        Returns: unknown
      }
      update_user_stats: {
        Args: Record<string, never>
        Returns: unknown
      }
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_endpoint: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
    }
    Enums: {
      entry_status: EntryStatus
      processing_task_type: ProcessingTaskType
      processing_status: ProcessingStatus
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
