import React, { useState, useEffect } from 'react';
import { createSupabaseClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { googleCalendar } from '../../lib/google-calendar';

export function CalendarConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseClient();
  const router = useRouter();

  // Helper to call Edge Function after OAuth
  const updateProfileServerSide = async (userId: string, refreshToken: string, defaultCalendarId?: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calendar-integration/connect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, refreshToken, defaultCalendarId })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');
      return true;
    } catch (err) {
      console.error('[CalendarConnection] Server-side profile update failed:', err);
      return false;
    }
  };

  // Helper to update profile after OAuth
  const updateProfileAfterOAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[CalendarConnection] OAuth redirect detected. Session:', session, 'Error:', sessionError);
      if (session && session.user) {
        // TODO: Extract real refreshToken from OAuth response/session if available
        const userId = session.user.id;
        const refreshToken = 'PLACEHOLDER_REFRESH_TOKEN'; // <-- Replace with real token extraction
        const defaultCalendarId = undefined; // Optionally set
        const serverResult = await updateProfileServerSide(userId, refreshToken, defaultCalendarId);
        if (serverResult) {
          setIsConnected(true);
          console.log('[CalendarConnection] Successfully updated google_calendar_connected to true (server-side).');
        } else {
          setError('Failed to update Google Calendar connection status (server-side).');
        }
      } else {
        setError('No valid session found after OAuth.');
        console.error('[CalendarConnection] No valid session found after OAuth.');
      }
    } catch (err) {
      setError('Error updating profile after OAuth.');
      console.error('[CalendarConnection] Error updating profile after OAuth:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[CalendarConnection] Checking connection. Session:', session, 'Error:', sessionError);
      if (session && session.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('google_calendar_connected')
          .eq('id', session.user.id)
          .single();
        console.log('[CalendarConnection] user_profiles query result:', profile, 'Error:', profileError);
        setIsConnected(profile?.google_calendar_connected || false);
      }
      setLoading(false);
    };

    checkConnection();
  }, [supabase]);

  // Detect OAuth redirect and update profile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
      console.log('[CalendarConnection] OAuth code detected in URL. Running updateProfileAfterOAuth.');
      updateProfileAfterOAuth();
      // Optionally, clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await googleCalendar.signIn();
      // After redirect, useEffect above will run
    } catch (error) {
      setError('Failed to connect to Google Calendar.');
      console.error('Failed to connect to Google Calendar', error);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    await googleCalendar.signOut();
    setIsConnected(false);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Calendar Integration</h3>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : isConnected ? (
        <div>
          <p className="text-green-600 mb-4">Calendar is connected.</p>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">Connect your Google Calendar to enable smart scheduling.</p>
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Connect to Google Calendar
          </button>
        </div>
      )}
    </div>
  );
} 