// supabase/functions/ai-schedule-suggest/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '* ',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleSuggestRequest {
  entryId: string;
}

interface GoogleCalendarListResponse {
  items: Array<{
    start: { dateTime: string };
    end: { dateTime: string };
  }>;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    }
  }>;
  usage: {
    total_tokens: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the authorization header and verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { entryId }: ScheduleSuggestRequest = await req.json()

    // 1. Fetch user profile and entry details in parallel
    const [
      { data: userProfile, error: profileError },
      { data: entry, error: entryError }
    ] = await Promise.all([
      supabaseClient.from('user_profiles').select('google_refresh_token, default_calendar_id, timezone, preferred_scheduling_times').eq('id', user.id).single(),
      supabaseClient.from('entries').select('ai_summary, ai_category, content').eq('id', entryId).single()
    ])

    if (profileError || !userProfile?.google_refresh_token) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected or profile not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (entryError || !entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Get a new Google Calendar access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: userProfile.google_refresh_token,
        grant_type: 'refresh_token'
      })
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) throw new Error(`Token refresh failed: ${tokenData.error}`)

    // 3. Fetch user's calendar events for the next 7 days
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${userProfile.default_calendar_id || 'primary'}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
    )
    const calendarData: GoogleCalendarListResponse = await calendarResponse.json()
    if (!calendarResponse.ok) throw new Error('Failed to fetch calendar events')

    const busySlots = calendarData.items.map(event => ({
      start: event.start.dateTime,
      end: event.end.dateTime
    }))

    // 4. Construct the AI prompt
    const prompt = `
    Analyze the user's schedule and the provided content to suggest 3 optimal time slots to schedule it.

    User's Timezone: ${userProfile.timezone || 'UTC'}
    User's Preferred Scheduling Times (e.g., weekdays, weekends, mornings): ${JSON.stringify(userProfile.preferred_scheduling_times)}
    
    User's Busy Schedule for the next 7 days (ISO 8601 format):
    ${JSON.stringify(busySlots, null, 2)}

    Content to Schedule:
    - Category: ${entry.ai_category}
    - Summary: ${entry.ai_summary || entry.content.substring(0, 200)}

    Based on the content type and the user's availability, suggest three 30-minute time slots.
    - Prioritize user's preferred times if available.
    - For "Read Later" or "Learning", suggest quiet times like evenings or weekends.
    - For "Build" or "Todo", suggest focus blocks during weekdays.
    - For "Explore", suggest casual times like lunch breaks or afternoons.
    - Avoid suggesting times that overlap with busy slots.
    - Provide suggestions within the next 7 days.

    Respond ONLY with a valid JSON array of suggested start times in ISO 8601 format.
    Example response:
    [
      "2025-07-15T14:00:00.000Z",
      "2025-07-16T10:30:00.000Z",
      "2025-07-18T18:00:00.000Z"
    ]
    `;

    // 5. Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 400,
        temperature: 0.5
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${await openRouterResponse.text()}`)
    }

    const aiResponse: OpenRouterResponse = await openRouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content
    if (!aiContent) throw new Error('No content received from AI')

    const suggestedTimes = JSON.parse(aiContent)

    // 6. Update the entry in the database
    const { error: updateError } = await supabaseClient
      .from('entries')
      .update({
        ai_schedule_suggestions: suggestedTimes,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)

    if (updateError) throw new Error(`Database update error: ${updateError.message}`)

    // 7. Update processing queue
    await supabaseClient
      .from('processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: { suggestions: suggestedTimes },
        ai_model_used: 'anthropic/claude-3-haiku',
        tokens_used: aiResponse.usage?.total_tokens || 0
      })
      .eq('entry_id', entryId)
      .eq('task_type', 'schedule_suggest')

    return new Response(
      JSON.stringify({ success: true, suggestions: suggestedTimes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-schedule-suggest function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
