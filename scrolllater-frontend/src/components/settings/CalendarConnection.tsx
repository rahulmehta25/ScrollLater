// src/components/settings/CalendarConnection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseClient } from '@/lib/supabase';

export default function CalendarConnection() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseClient();

  const checkConnectionStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('google_calendar_connected, google_refresh_token')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking connection status:', error);
        return;
      }

      // Consider connected if both flags are true
      const connected = !!(profile?.google_calendar_connected && profile?.google_refresh_token);
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  }, [user, supabase]);

  // Check connection status on mount and when user changes
  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user, checkConnectionStatus]);

  const handleConnect = async () => {
    if (!user) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clear any existing connection first
      if (isConnected) {
        await supabase
          .from('user_profiles')
          .update({
            google_calendar_connected: false,
            google_refresh_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
      // Get the current session to pass the access token in state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('Error getting session:', sessionError);
        setError('Please log in again to connect Google Calendar');
        setIsLoading(false);
        return;
      }

      // Use the access token as state parameter for session restoration
      const state = session.access_token;
      
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
        prompt: 'select_account consent', // Force account selection + consent
        state: state,
        login_hint: user.email || '', // Suggest the current user's email
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      setError('Failed to start Google Calendar connection');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          google_calendar_connected: false,
          google_refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error disconnecting:', error);
        setError('Failed to disconnect Google Calendar');
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const calendarStatus = urlParams.get('calendar');
    const errorMessage = urlParams.get('message');

    if (calendarStatus === 'connected') {
      setIsConnected(true);
      setError(null);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (calendarStatus === 'error') {
      setError(errorMessage || 'Failed to connect Google Calendar');
      setIsConnected(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Google Calendar Connection</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Authentication Required:</strong><br />
            You need to sign in to ScrollLater first before connecting Google Calendar.<br />
            <Link href="/" className="text-blue-600 hover:underline">Go to login page</Link>
          </p>
        </div>
        <p className="text-gray-600">Please log in to connect your Google Calendar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Google Calendar Connection</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            {isConnected 
              ? 'Your Google Calendar is connected and ready for scheduling.'
              : 'Connect your Google Calendar to automatically schedule entries.'
            }
          </p>
          {isConnected && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Calendar events will be created automatically
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {isConnected && (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="px-4 py-2 rounded font-medium bg-gray-500 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Switch to a different Google account"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Re-authenticating...
                </span>
              ) : (
                'Switch Account'
              )}
            </button>
          )}
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium ${
              isConnected
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isConnected ? 'Disconnecting...' : 'Connecting...'}
              </span>
            ) : (
              isConnected ? 'Disconnect' : 'Connect'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
