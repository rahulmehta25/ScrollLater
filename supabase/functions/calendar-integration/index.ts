// supabase/functions/calendar-integration/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '* ',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendarEventRequest {
  entryId: string;
  title: string;
  description: string;
  startTime: string;
  duration: number; // in minutes
  userId: string; // Add user ID to the request
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // --- BEGIN: Google Calendar OAuth profile update endpoint ---
  if (req.method === 'POST' && req.url?.endsWith('/connect')) {
    try {
      // Check for Authorization header
      const authHeader = req.headers.get('Authorization');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!authHeader || authHeader.replace('Bearer ', '') !== serviceRoleKey) {
        console.error('[calendar-integration/connect] Missing or invalid Authorization header');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const { userId, refreshToken, defaultCalendarId } = await req.json();
      if (!userId || !refreshToken) {
        console.error('[calendar-integration/connect] Missing userId or refreshToken');
        return new Response(
          JSON.stringify({ error: 'Missing userId or refreshToken' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Update user_profiles
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({
          google_calendar_connected: true,
          google_refresh_token: refreshToken,
          default_calendar_id: defaultCalendarId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (updateError) {
        console.error('[calendar-integration/connect] Update error:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[calendar-integration/connect] Successfully updated user profile for', userId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('[calendar-integration/connect] Exception:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
  // --- END: Google Calendar OAuth profile update endpoint ---

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { entryId, title, description, startTime, duration, userId }: CalendarEventRequest = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Google Calendar refresh token
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('google_refresh_token, default_calendar_id')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exchange refresh token for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: userProfile.google_refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      // If the refresh token is invalid, disconnect the user's calendar
      if (tokenData.error === 'invalid_grant' || tokenData.error === 'invalid_request') {
        await supabaseClient
          .from('user_profiles')
          .update({
            google_calendar_connected: false,
            google_refresh_token: null,
            default_calendar_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        return new Response(
          JSON.stringify({ error: 'invalid_token', message: 'Google Calendar connection lost. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Token refresh failed: ${tokenData.error}`)
    }

    // Calculate end time
    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + duration * 60000)

    // Create calendar event
    const calendarEvent = {
      summary: title,
      description: description,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    }

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${userProfile.default_calendar_id || 'primary'}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      }
    )

    const eventData = await calendarResponse.json()

    if (!calendarResponse.ok) {
      throw new Error(`Calendar event creation failed: ${eventData.error?.message}`)
    }

    // Update entry with calendar information
    const { error: updateError } = await supabaseClient
      .from('entries')
      .update({
        calendar_event_id: eventData.id,
        calendar_event_url: eventData.htmlLink,
        scheduled_for: startTime,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', userId)

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: eventData.id,
        eventUrl: eventData.htmlLink
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in calendar-integration:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
