import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (you can generate these from your existing backend)
export interface Database {
  public: {
    Tables: {
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
          ai_tags: string[] | null
          ai_confidence_score: number | null
          user_category: string | null
          user_tags: string[] | null
          user_notes: string | null
          priority: number
          status: string
          scheduled_for: string | null
          completed_at: string | null
          calendar_event_id: string | null
          calendar_event_url: string | null
          source: string
          metadata: any
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
          ai_tags?: string[] | null
          ai_confidence_score?: number | null
          user_category?: string | null
          user_tags?: string[] | null
          user_notes?: string | null
          priority?: number
          status?: string
          scheduled_for?: string | null
          completed_at?: string | null
          calendar_event_id?: string | null
          calendar_event_url?: string | null
          source?: string
          metadata?: any
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          url?: string | null
          title?: string | null
          content?: string
          original_input?: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[] | null
          ai_confidence_score?: number | null
          user_category?: string | null
          user_tags?: string[] | null
          user_notes?: string | null
          priority?: number
          status?: string
          scheduled_for?: string | null
          completed_at?: string | null
          calendar_event_id?: string | null
          calendar_event_url?: string | null
          source?: string
          metadata?: any
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          display_name: string | null
          timezone: string
          default_calendar_id: string | null
          preferred_scheduling_times: any
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
          created_at?: string
          updated_at?: string
          display_name?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: any
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
          total_entries?: number
          total_scheduled?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: any
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
          total_entries?: number
          total_scheduled?: number
        }
      }
    }
  }
} 