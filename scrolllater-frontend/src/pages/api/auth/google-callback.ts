import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log all environment variables for debugging (force visibility)
  console.error('=== ALL ENV DEBUG ===', JSON.stringify(process.env, null, 2));
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  try {
    const supabase = createSupabaseClient();

    // Log the values being sent to Google
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : undefined);
    console.log('redirect_uri:', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`);
    console.log('code:', code);

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
      // Log the full response for debugging
      console.error('Token exchange POST body:', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : undefined,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`,
      });
      return res.status(400).json({ error: 'Token exchange failed', details: errorData });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('Session error:', sessionError);
      return res.status(401).json({ error: 'No valid session found' });
    }

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
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    // Redirect back to settings page with success
    res.redirect('/dashboard/settings?calendar=connected');
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/dashboard/settings?calendar=error');
  }
} 