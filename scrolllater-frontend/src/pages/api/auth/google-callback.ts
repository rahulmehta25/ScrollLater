import { NextApiRequest, NextApiResponse } from 'next';
import { createApiSupabaseClient } from '@/lib/supabase-api';

// Helper function to retry fetch with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });
      return response;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  try {
    // Create Supabase client for API route
    const supabase = createApiSupabaseClient()

    // Log the values being sent to Google
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : undefined);
    console.log('redirect_uri:', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`);
    console.log('code:', code);
    console.log('DEBUG: API/auth/google-callback NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL);

    // Exchange the authorization code for tokens with retry logic
    const tokenResponse = await fetchWithRetry('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return res.redirect('/dashboard/settings?calendar=error&message=Google authentication failed');
    }

    const tokenData = await tokenResponse.json();
    const { refresh_token } = tokenData;

    console.log('Token exchange successful, refresh_token received:', !!refresh_token);

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      // Redirect to login page with error message
      return res.redirect('/?error=session_expired&message=Please log in again to connect Google Calendar');
    }

    if (!session?.user) {
      console.error('No valid session found');
      
      // Try to decode the state parameter which should contain the user's session info
      if (state && typeof state === 'string') {
        try {
          // The state parameter should be a JWT token that contains user session info
          // Let's try to extract user info from it
          const { data: { user: decodedUser }, error: decodeError } = await supabase.auth.getUser(state);
          
          if (decodeError) {
            console.error('Failed to decode user from state:', decodeError);
          } else if (decodedUser) {
            console.log('User decoded from state:', decodedUser.email);
            
            // Update user profile with Google Calendar connection
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                google_calendar_connected: true,
                google_refresh_token: refresh_token,
                updated_at: new Date().toISOString(),
              })
              .eq('id', decodedUser.id);

            if (updateError) {
              console.error('Failed to update user profile:', updateError);
              return res.redirect('/dashboard/settings?calendar=error&message=Failed to save connection');
            }

            console.log('User profile updated successfully with Google Calendar connection');
            return res.redirect('/dashboard/settings?calendar=connected');
          }
        } catch (decodeError) {
          console.error('Error decoding user from state:', decodeError);
        }
      }
      
      // If we still don't have a session, redirect to login
      return res.redirect('/?error=no_session&message=Please log in to connect Google Calendar');
    }

    console.log('Valid session found for user:', session.user.email);

    // Update user profile with Google Calendar connection
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        google_calendar_connected: true,
        google_refresh_token: refresh_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to update user profile:', updateError);
      return res.redirect('/dashboard/settings?calendar=error&message=Failed to save connection');
    }

    console.log('User profile updated successfully with Google Calendar connection');

    // Redirect back to settings page with success
    res.redirect('/dashboard/settings?calendar=connected');
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Unexpected error occurred';
    if (error instanceof Error) {
      if ('code' in error && error.code === 'UND_ERR_CONNECT_TIMEOUT') {
        errorMessage = 'Network timeout - please check your internet connection and try again';
      } else if (error.message?.includes('fetch failed')) {
        errorMessage = 'Network error - please check your internet connection and try again';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.redirect(`/dashboard/settings?calendar=error&message=${encodeURIComponent(errorMessage)}`);
  }
} 