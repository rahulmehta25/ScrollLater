/**
 * @fileoverview AI-powered schedule suggestion edge function
 * @description Analyzes user's calendar, reading patterns, and content characteristics
 *              to suggest optimal times for consuming saved content. Learns from user
 *              behavior to improve suggestions over time.
 *
 * @example
 * POST /functions/v1/ai-schedule-suggest
 * {
 *   "entryId": "uuid",
 *   "numSuggestions": 3,
 *   "minDaysAhead": 0,
 *   "maxDaysAhead": 7
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  handleCors,
  jsonResponse,
  errorResponse,
  createAuthenticatedClient,
  callAI,
  parseAIJson,
  logAIUsage,
  measureLatency,
  parseRequestBody,
  validateRequired,
} from '../_shared/utils.ts'
import type {
  ScheduleSuggestRequest,
  ScheduleSuggestResponse,
  ScheduleSuggestion,
  UserReadingPatterns,
  Category,
  TimeOfDay,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for schedule optimization */
const SYSTEM_PROMPT = `You are a productivity and time management expert for ScrollLater, a content scheduling app. Your role is to analyze user schedules and content to suggest optimal reading/viewing times.

Consider:
- User's calendar availability and busy patterns
- Content type and estimated consumption time
- User's historical preferences and completion patterns
- Time of day suitability for different content types
- Work-life balance and avoiding scheduling fatigue
- Grouping similar content for focused sessions`

interface CalendarEvent {
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  summary?: string
}

interface GoogleCalendarResponse {
  items: CalendarEvent[]
}

/**
 * Fetch user's reading patterns from completed entries
 */
async function fetchUserPatterns(
  client: ReturnType<typeof import('../_shared/utils.ts').createServiceClient>,
  userId: string
): Promise<UserReadingPatterns> {
  // Get completed entries from the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: completedEntries } = await client
    .from('entries')
    .select('completed_at, ai_category, ai_reading_time, scheduled_for')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', thirtyDaysAgo.toISOString())
    .order('completed_at', { ascending: false })
    .limit(100)

  // Analyze patterns
  const patterns: UserReadingPatterns = {
    preferredTimesByDay: {},
    averageSessionDuration: 30,
    productiveHours: [],
    topCategories: [],
    completionRate: 0,
  }

  if (!completedEntries || completedEntries.length === 0) {
    // Return defaults for new users
    return {
      ...patterns,
      preferredTimesByDay: {
        weekday: ['morning', 'evening'],
        weekend: ['morning', 'afternoon'],
      },
      productiveHours: [9, 10, 11, 14, 15, 19, 20],
      topCategories: ['tech', 'productivity'],
      completionRate: 0.5,
    }
  }

  // Calculate productive hours
  const hourCounts: Record<number, number> = {}
  const dayCounts: Record<string, Record<TimeOfDay, number>> = {
    weekday: { early_morning: 0, morning: 0, afternoon: 0, evening: 0, night: 0 },
    weekend: { early_morning: 0, morning: 0, afternoon: 0, evening: 0, night: 0 },
  }
  const categoryCounts: Record<string, number> = {}
  let totalDuration = 0

  for (const entry of completedEntries) {
    if (entry.completed_at) {
      const date = new Date(entry.completed_at)
      const hour = date.getHours()
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dayType = isWeekend ? 'weekend' : 'weekday'

      // Track hour
      hourCounts[hour] = (hourCounts[hour] || 0) + 1

      // Track time of day
      const timeOfDay = getTimeOfDay(hour)
      dayCounts[dayType][timeOfDay]++

      // Track category
      if (entry.ai_category) {
        categoryCounts[entry.ai_category] = (categoryCounts[entry.ai_category] || 0) + 1
      }

      // Track duration
      totalDuration += entry.ai_reading_time || 15
    }
  }

  // Find top productive hours
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([h]) => parseInt(h, 10))

  // Find preferred times by day
  const getTopTimesOfDay = (counts: Record<TimeOfDay, number>): TimeOfDay[] => {
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([time]) => time as TimeOfDay)
  }

  // Find top categories
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat as Category)

  // Calculate completion rate
  const { count: totalEntries } = await client
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  return {
    preferredTimesByDay: {
      weekday: getTopTimesOfDay(dayCounts.weekday),
      weekend: getTopTimesOfDay(dayCounts.weekend),
    },
    averageSessionDuration: Math.round(totalDuration / completedEntries.length),
    productiveHours: sortedHours,
    topCategories,
    completionRate: totalEntries ? completedEntries.length / totalEntries : 0.5,
  }
}

/**
 * Convert hour to time of day
 */
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'early_morning'
  if (hour >= 8 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Refresh Google OAuth access token
 */
async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`)
  }

  return data.access_token
}

/**
 * Fetch calendar events for scheduling
 */
async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  daysAhead: number
): Promise<Array<{ start: string; end: string; title?: string }>> {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Calendar fetch failed: ${error}`)
  }

  const data: GoogleCalendarResponse = await response.json()

  return data.items
    .filter(event => event.start.dateTime && event.end.dateTime)
    .map(event => ({
      start: event.start.dateTime!,
      end: event.end.dateTime!,
      title: event.summary,
    }))
}

/**
 * Build AI prompt for schedule suggestions
 */
function buildSchedulePrompt(
  entry: { ai_category: string | null; ai_summary: string | null; content: string; ai_reading_time?: number },
  userProfile: { timezone: string; preferred_scheduling_times: Record<string, unknown> },
  busySlots: Array<{ start: string; end: string; title?: string }>,
  patterns: UserReadingPatterns,
  numSuggestions: number,
  minDaysAhead: number,
  maxDaysAhead: number
): string {
  const now = new Date()
  const readingTime = entry.ai_reading_time || 30

  return `Analyze the user's schedule and suggest ${numSuggestions} optimal time slots for this content.

CURRENT TIME: ${now.toISOString()}
USER TIMEZONE: ${userProfile.timezone || 'UTC'}

CONTENT TO SCHEDULE:
- Category: ${entry.ai_category || 'general'}
- Estimated Duration: ${readingTime} minutes
- Summary: ${entry.ai_summary || entry.content.substring(0, 200)}

USER READING PATTERNS (learned from history):
- Productive Hours: ${patterns.productiveHours.map(h => `${h}:00`).join(', ')}
- Preferred Times (Weekday): ${patterns.preferredTimesByDay.weekday?.join(', ') || 'morning, evening'}
- Preferred Times (Weekend): ${patterns.preferredTimesByDay.weekend?.join(', ') || 'morning, afternoon'}
- Average Session: ${patterns.averageSessionDuration} minutes
- Top Categories: ${patterns.topCategories.join(', ')}
- Completion Rate: ${Math.round(patterns.completionRate * 100)}%

USER PREFERENCES:
${JSON.stringify(userProfile.preferred_scheduling_times, null, 2)}

BUSY SCHEDULE (next ${maxDaysAhead} days):
${busySlots.length > 0
  ? busySlots.map(s => `- ${s.start} to ${s.end}${s.title ? ` (${s.title})` : ''}`).join('\n')
  : '- No events scheduled'}

SCHEDULING RULES:
1. Suggest times between ${minDaysAhead} and ${maxDaysAhead} days from now
2. Each slot must be at least ${readingTime} minutes
3. Avoid overlapping with busy slots
4. Consider content type:
   - "Learning/Research" content: Suggest focused morning slots
   - "News/Trending" content: Suggest quick afternoon breaks
   - "Entertainment" content: Suggest evening/weekend slots
   - "Tech/AI" content: Suggest when user is most productive
5. Space suggestions across different days when possible
6. Match user's historical productive hours

Respond with a JSON array of ${numSuggestions} suggestions:
[
  {
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime",
    "durationMinutes": ${readingTime},
    "confidence": 0.0-1.0,
    "reason": "Why this time is optimal",
    "slotQuality": 1-5
  }
]

Ensure startTime and endTime are valid ISO 8601 strings in the user's timezone context.`
}

/**
 * Generate fallback suggestions when calendar is unavailable
 */
function generateFallbackSuggestions(
  patterns: UserReadingPatterns,
  readingTime: number,
  numSuggestions: number
): ScheduleSuggestion[] {
  const suggestions: ScheduleSuggestion[] = []
  const now = new Date()

  // Use productive hours to generate suggestions
  const hours = patterns.productiveHours.length > 0
    ? patterns.productiveHours
    : [9, 14, 19]

  for (let day = 1; day <= numSuggestions && suggestions.length < numSuggestions; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() + day)

    const hour = hours[suggestions.length % hours.length]
    date.setHours(hour, 0, 0, 0)

    const endDate = new Date(date.getTime() + readingTime * 60 * 1000)

    suggestions.push({
      startTime: date.toISOString(),
      endTime: endDate.toISOString(),
      durationMinutes: readingTime,
      confidence: 0.6,
      reason: `Suggested based on your typical productive hours (${hour}:00)`,
      slotQuality: 3,
    })
  }

  return suggestions
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const startTime = performance.now()
  let usage: TokenUsage | undefined

  try {
    // Authenticate user
    const { client, user, error: authError } = await createAuthenticatedClient(req)
    if (authError) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    const { body, error: parseError } = await parseRequestBody<ScheduleSuggestRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    // Validate required fields
    const validationError = validateRequired(body as Record<string, unknown>, ['entryId'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const {
      entryId,
      numSuggestions = 3,
      minDaysAhead = 0,
      maxDaysAhead = 7,
    } = body

    // Fetch user profile and entry in parallel
    const [profileResult, entryResult, patterns] = await Promise.all([
      client
        .from('user_profiles')
        .select('google_refresh_token, default_calendar_id, timezone, preferred_scheduling_times')
        .eq('id', user.id)
        .single(),
      client
        .from('entries')
        .select('ai_summary, ai_category, content, ai_reading_time')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .single(),
      fetchUserPatterns(client, user.id),
    ])

    if (entryResult.error || !entryResult.data) {
      return errorResponse('Entry not found', 404)
    }

    const entry = entryResult.data
    const userProfile = profileResult.data || { timezone: 'UTC', preferred_scheduling_times: {} }
    const readingTime = entry.ai_reading_time || 30

    let suggestions: ScheduleSuggestion[]
    let calendarConnected = false

    // Try to get calendar events if connected
    if (profileResult.data?.google_refresh_token) {
      try {
        const accessToken = await refreshGoogleToken(profileResult.data.google_refresh_token)
        const busySlots = await fetchCalendarEvents(
          accessToken,
          profileResult.data.default_calendar_id || 'primary',
          maxDaysAhead
        )
        calendarConnected = true

        // Build prompt and call AI
        const prompt = buildSchedulePrompt(
          entry,
          userProfile,
          busySlots,
          patterns,
          numSuggestions,
          minDaysAhead,
          maxDaysAhead
        )

        const { result: aiResult, latencyMs } = await measureLatency(async () => {
          return await callAI(prompt, {
            systemPrompt: SYSTEM_PROMPT,
            maxTokens: 600,
            temperature: 0.5,
          })
        })

        usage = aiResult.usage

        // Parse suggestions
        const parsed = parseAIJson<ScheduleSuggestion[]>(aiResult.content, [])
        suggestions = parsed.slice(0, numSuggestions).map(s => ({
          startTime: s.startTime,
          endTime: s.endTime,
          durationMinutes: s.durationMinutes || readingTime,
          confidence: Math.max(0, Math.min(1, s.confidence || 0.7)),
          reason: s.reason || 'AI-optimized time slot',
          slotQuality: Math.max(1, Math.min(5, s.slotQuality || 3)),
        }))

        // Log usage
        await logAIUsage(client, {
          user_id: user.id,
          function_name: 'ai-schedule-suggest',
          entry_id: entryId,
          tokens_used: usage.totalTokens,
          model: usage.model,
          latency_ms: latencyMs,
          success: true,
        })
      } catch (calendarError) {
        console.error('Calendar/AI error, using fallback:', calendarError)
        suggestions = generateFallbackSuggestions(patterns, readingTime, numSuggestions)
      }
    } else {
      // No calendar connected, use pattern-based fallback
      suggestions = generateFallbackSuggestions(patterns, readingTime, numSuggestions)
    }

    // Update entry with suggestions
    await client
      .from('entries')
      .update({
        ai_schedule_suggestions: suggestions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)

    // Update processing queue
    await client
      .from('processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: { suggestions },
        ai_model_used: usage?.model || 'pattern-based',
        tokens_used: usage?.totalTokens || 0,
      })
      .eq('entry_id', entryId)
      .eq('task_type', 'schedule_suggest')

    const response: ScheduleSuggestResponse = {
      success: true,
      suggestions,
      patternsUsed: patterns,
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-schedule-suggest function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
