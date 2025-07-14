// src/components/settings/CalendarConnection.tsx
'use client';

import { useState, useEffect } from 'react';
import { googleCalendar } from '../../lib/google-calendar';
import { createSupabaseClient } from '../../lib/supabase';

export function CalendarConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    const checkConnection = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('google_calendar_connected')
          .single();
        setIsConnected(profile?.google_calendar_connected || false);
      }
      setLoading(false);
    };

    checkConnection();
  }, [supabase]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await googleCalendar.signIn();
    } catch (error) {
      console.error('Failed to connect to Google Calendar', error);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    // This is a simplified disconnect. A full implementation would require
    // a server-side function to revoke the token.
    await googleCalendar.signOut();
    setIsConnected(false);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Calendar Integration</h3>
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
