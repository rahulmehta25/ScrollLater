// src/lib/google-calendar.ts
import { createSupabaseClient } from './supabase';

/**
 * A class to manage Google Calendar integration.
 */
class GoogleCalendar {
  private supabase: ReturnType<typeof createSupabaseClient>;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  /**
   * Initiates the Google OAuth flow for calendar access.
   */
  async signIn() {
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in sessionStorage for verification
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('google_oauth_state', state);
    }

    // Construct the Google OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/google-callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'select_account consent',
      state: state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    // Redirect to Google OAuth
    window.location.href = authUrl;
  }

  /**
   * Signs the user out and revokes Google Calendar access.
   */
  async signOut() {
    try {
      // Update user profile to remove Google Calendar connection
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        await this.supabase
          .from('user_profiles')
          .update({
            google_calendar_connected: false,
            google_refresh_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
    }
  }

  /**
   * Creates a calendar event for a given entry.
   * @param entryId - The ID of the entry to schedule.
   * @param title - The title of the event.
   * @param description - The description for the event.
   * @param startTime - The ISO string for the event start time.
   * @param duration - The duration of the event in minutes.
   */
  async createEvent(entryId: string, title: string, description: string, startTime: string, duration: number) {
    const { error } = await this.supabase.functions.invoke('calendar-integration', {
      body: { entryId, title, description, startTime, duration },
    });

    if (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
}

export const googleCalendar = new GoogleCalendar();
