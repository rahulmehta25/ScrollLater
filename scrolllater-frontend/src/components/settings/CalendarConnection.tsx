// src/components/settings/CalendarConnection.tsx
'use client';

import { useState, useEffect } from 'react';
import { googleCalendar } from '../../lib/google-calendar';
import { createSupabaseClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export function CalendarConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('google_calendar_connected, google_refresh_token')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            setError('Failed to check connection status');
          } else {
            const connected = !!(profile?.google_calendar_connected && profile?.google_refresh_token);
            setIsConnected(connected);
            console.log('Calendar connection status:', connected, profile);
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err);
        setError('Failed to check connection status');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [supabase]);

  // Check for OAuth callback results
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const calendarStatus = urlParams.get('calendar');
      
      if (calendarStatus === 'connected') {
        // OAuth was successful, refresh the connection status
        setIsConnected(true);
        setError(null);
        // Clean up the URL
        const url = new URL(window.location.href);
        url.searchParams.delete('calendar');
        window.history.replaceState({}, document.title, url.pathname);
      } else if (calendarStatus === 'error') {
        setError('Failed to connect to Google Calendar. Please try again.');
        setIsConnected(false);
        // Clean up the URL
        const url = new URL(window.location.href);
        url.searchParams.delete('calendar');
        window.history.replaceState({}, document.title, url.pathname);
      }
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await googleCalendar.signIn();
      // The user will be redirected to Google OAuth
    } catch (error) {
      console.error('Failed to connect to Google Calendar', error);
      setError('Failed to connect to Google Calendar');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await googleCalendar.signOut();
      setIsConnected(false);
    } catch (error) {
      console.error('Failed to disconnect Google Calendar', error);
      setError('Failed to disconnect Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Calendar Integration</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : isConnected ? (
        <div>
          <p className="text-green-600 mb-4">✅ Calendar is connected.</p>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">Connect your Google Calendar to enable smart scheduling.</p>
          <p className="text-sm text-gray-500 mb-4">
            This will allow ScrollLater to create calendar events for your scheduled content.
          </p>
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Connect Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}
