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
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  /**
   * Signs the user out and revokes Google Calendar access.
   */
  async signOut() {
    // We can't directly revoke the token from the client-side.
    // The user must do this from their Google account settings.
    // For our app, we just sign them out.
    await this.supabase.auth.signOut();
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
