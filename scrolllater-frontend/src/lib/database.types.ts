// src/lib/database.types.ts
export type Json = | string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          display_name: string | null
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
        }
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: Json
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
        }
        Update: {
          display_name?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: Json
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
        }
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
          status: 'inbox' | 'scheduled' | 'completed' | 'archived'
          scheduled_for: string | null
          completed_at: string | null
          calendar_event_id: string | null
          calendar_event_url: string | null
          source: string
          metadata: Json
        }
        Insert: {
          user_id: string
          url?: string | null
          title?: string | null
          content: string
          original_input: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[]
          ai_confidence_score?: number | null
          user_category?: string | null
          user_tags?: string[]
          user_notes?: string | null
          priority?: number
          status?: 'inbox' | 'scheduled' | 'completed' | 'archived'
          scheduled_for?: string | null
          source?: string
          metadata?: Json
        }
        Update: {
          url?: string | null
          title?: string | null
          content?: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[]
          ai_confidence_score?: number | null
          user_category?: string | null
          user_tags?: string[]
          user_notes?: string | null
          priority?: number
          status?: 'inbox' | 'scheduled' | 'completed' | 'archived'
          scheduled_for?: string | null
          completed_at?: string | null
          calendar_event_id?: string | null
          calendar_event_url?: string | null
          metadata?: Json
        }
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
      }
    }
  }
}
