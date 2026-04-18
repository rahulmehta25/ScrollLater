/**
 * @fileoverview AI-powered Smart Queue edge function
 * @description Generates an AI-curated reading queue that adapts based on available time,
 *              user interests, energy level, and content priority. Provides an optimized
 *              reading order for maximum value.
 *
 * @example
 * POST /functions/v1/ai-smart-queue
 * {
 *   "userId": "uuid",
 *   "availableMinutes": 30,
 *   "timeOfDay": "morning",
 *   "energyLevel": "high",
 *   "focusAreas": ["tech", "ai"],
 *   "maxItems": 10
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
} from '../_shared/utils.ts'
import type {
  SmartQueueRequest,
  SmartQueueResponse,
  QueueItem,
  Category,
  TimeOfDay,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for smart queue generation */
const SYSTEM_PROMPT = `You are a productivity coach for ScrollLater, a personal knowledge management app. Your role is to create optimized reading queues that maximize value within the user's available time.

Queue Optimization Principles:
1. Time-box effectively - fit items within available time
2. Energy matching - suggest complex content for high energy, lighter content for low energy
3. Context switching - minimize cognitive load by grouping similar topics
4. Priority balance - mix must-reads with exploration
5. Quick wins - include some short items for momentum
6. Flexibility - mark items as skippable when appropriate`

interface QueueCandidate {
  id: string
  title: string | null
  content: string
  ai_summary: string | null
  ai_category: string | null
  ai_tags: string[]
  ai_reading_time: number | null
  ai_priority_score: number | null
  ai_complexity: number | null
  ai_is_time_sensitive: boolean | null
}

/**
 * Fetch candidate items for the queue
 */
async function fetchCandidates(
  client: ReturnType<typeof import('../_shared/utils.ts').createServiceClient>,
  userId: string,
  focusAreas: Category[] | undefined,
  maxItems: number
): Promise<QueueCandidate[]> {
  let query = client
    .from('entries')
    .select('id, title, content, ai_summary, ai_category, ai_tags, ai_reading_time, ai_priority_score, ai_complexity, ai_is_time_sensitive')
    .eq('user_id', userId)
    .eq('status', 'inbox')
    .order('ai_priority_score', { ascending: false, nullsFirst: false })
    .limit(maxItems * 2)

  if (focusAreas && focusAreas.length > 0) {
    query = query.in('ai_category', focusAreas)
  }

  const { data } = await query
  return data || []
}

/**
 * Build smart queue prompt
 */
function buildQueuePrompt(
  candidates: QueueCandidate[],
  availableMinutes: number,
  timeOfDay: TimeOfDay,
  energyLevel: 'low' | 'medium' | 'high',
  focusAreas: Category[] | undefined
): string {
  const candidatesList = candidates.map((c, i) => `
${i + 1}. ID: ${c.id}
   Title: ${c.title || c.content.substring(0, 50)}
   Summary: ${c.ai_summary || c.content.substring(0, 100)}
   Category: ${c.ai_category || 'other'}
   Read Time: ${c.ai_reading_time || 10} min
   Priority: ${c.ai_priority_score || 50}/100
   Complexity: ${c.ai_complexity || 3}/5
   Time-Sensitive: ${c.ai_is_time_sensitive ? 'Yes' : 'No'}`).join('\n')

  const timeOfDayGuidance: Record<TimeOfDay, string> = {
    early_morning: 'User is starting their day early. Suggest focused, strategic content.',
    morning: 'Peak cognitive time for most. Include complex, important items.',
    afternoon: 'Post-lunch period. Mix of focused work and lighter content.',
    evening: 'Wind-down time. Prefer lighter, inspiring, or entertaining content.',
    night: 'Late hours. Quick reads or relaxing content only.',
  }

  const energyGuidance: Record<string, string> = {
    high: 'User has high energy. Include challenging, complex content.',
    medium: 'Balanced energy. Mix of complexity levels.',
    low: 'Low energy. Prioritize quick wins and lighter content.',
  }

  return `Create an optimized reading queue for this user session.

SESSION CONTEXT:
- Available Time: ${availableMinutes} minutes
- Time of Day: ${timeOfDay} - ${timeOfDayGuidance[timeOfDay]}
- Energy Level: ${energyLevel} - ${energyGuidance[energyLevel]}
- Focus Areas: ${focusAreas?.join(', ') || 'No specific focus'}

CANDIDATE ITEMS:
${candidatesList}

Create an optimized queue that:
1. Fits within ${availableMinutes} minutes total
2. Matches the user's current energy level
3. Prioritizes time-sensitive items
4. Groups similar categories together
5. Includes a mix of lengths when possible
6. Marks lower-priority items as skippable

Respond in JSON format:
{
  "items": [
    {
      "entryId": "id from candidates",
      "title": "Item title",
      "category": "category",
      "readTimeMinutes": number,
      "priorityScore": 1-100,
      "reason": "Why this item at this position",
      "position": 1,
      "skippable": false
    }
  ],
  "totalMinutes": total_reading_time,
  "fitsInTimeSlot": true|false,
  "explanation": "Overall queue strategy explanation",
  "quickAlternative": [
    // If total exceeds available time, provide shorter alternative
    // Same format as items, but fewer items
  ]
}

Requirements:
- Only include items from CANDIDATE ITEMS
- Order by optimal reading sequence, not just priority
- First item should be a good "starter" - engaging but not overwhelming
- Last item should provide closure - satisfying to complete
- Mark items skippable if they're lower priority or user could skip without missing critical content`
}

/**
 * Generate fallback queue when AI is unavailable
 */
function generateFallbackQueue(
  candidates: QueueCandidate[],
  availableMinutes: number
): SmartQueueResponse['queue'] {
  let totalMinutes = 0
  const items: QueueItem[] = []

  // Sort by priority and fit within time
  const sorted = [...candidates].sort((a, b) =>
    (b.ai_priority_score || 50) - (a.ai_priority_score || 50)
  )

  for (const candidate of sorted) {
    const readTime = candidate.ai_reading_time || 10
    if (totalMinutes + readTime <= availableMinutes || items.length === 0) {
      items.push({
        entryId: candidate.id,
        title: candidate.title || candidate.content.substring(0, 50),
        category: (candidate.ai_category || 'other') as Category,
        readTimeMinutes: readTime,
        priorityScore: candidate.ai_priority_score || 50,
        reason: 'Sorted by priority score',
        position: items.length + 1,
        skippable: items.length > 2,
      })
      totalMinutes += readTime
    }

    if (items.length >= 10) break
  }

  return {
    items,
    totalMinutes,
    fitsInTimeSlot: totalMinutes <= availableMinutes,
    explanation: 'Queue generated based on priority scores',
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let usage: TokenUsage | undefined

  try {
    // Authenticate user
    const { client, user, error: authError } = await createAuthenticatedClient(req)
    if (authError) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    const { body, error: parseError } = await parseRequestBody<SmartQueueRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    const {
      availableMinutes = 30,
      timeOfDay = 'afternoon',
      energyLevel = 'medium',
      focusAreas,
      maxItems = 10,
    } = body

    // Fetch candidates
    const candidates = await fetchCandidates(client, user.id, focusAreas, maxItems)

    if (candidates.length === 0) {
      return jsonResponse<SmartQueueResponse>({
        success: true,
        queue: {
          items: [],
          totalMinutes: 0,
          fitsInTimeSlot: true,
          explanation: 'No unread content available for the queue.',
        },
      })
    }

    let queue: SmartQueueResponse['queue']

    try {
      // Build prompt and call AI
      const prompt = buildQueuePrompt(
        candidates,
        availableMinutes,
        timeOfDay,
        energyLevel,
        focusAreas
      )

      const { result: aiResult, latencyMs } = await measureLatency(async () => {
        return await callAI(prompt, {
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 1000,
          temperature: 0.4,
        })
      })

      usage = aiResult.usage

      // Parse response
      const parsed = parseAIJson<{
        items: Array<{
          entryId: string
          title: string
          category: string
          readTimeMinutes: number
          priorityScore: number
          reason: string
          position: number
          skippable: boolean
        }>
        totalMinutes: number
        fitsInTimeSlot: boolean
        explanation: string
        quickAlternative?: Array<{
          entryId: string
          title: string
          category: string
          readTimeMinutes: number
          priorityScore: number
          reason: string
          position: number
          skippable: boolean
        }>
      }>(aiResult.content, {
        items: [],
        totalMinutes: 0,
        fitsInTimeSlot: true,
        explanation: 'AI queue generation failed',
      })

      // Validate items against candidates
      const validIds = new Set(candidates.map(c => c.id))

      const validatedItems: QueueItem[] = parsed.items
        .filter(item => validIds.has(item.entryId))
        .slice(0, maxItems)
        .map((item, index) => {
          const candidate = candidates.find(c => c.id === item.entryId)
          return {
            entryId: item.entryId,
            title: item.title || candidate?.title || 'Untitled',
            category: (item.category || candidate?.ai_category || 'other') as Category,
            readTimeMinutes: item.readTimeMinutes || candidate?.ai_reading_time || 10,
            priorityScore: Math.max(1, Math.min(100, item.priorityScore || candidate?.ai_priority_score || 50)),
            reason: item.reason,
            position: index + 1,
            skippable: Boolean(item.skippable),
          }
        })

      const validatedQuickAlt: QueueItem[] | undefined = parsed.quickAlternative
        ?.filter(item => validIds.has(item.entryId))
        .slice(0, 5)
        .map((item, index) => {
          const candidate = candidates.find(c => c.id === item.entryId)
          return {
            entryId: item.entryId,
            title: item.title || candidate?.title || 'Untitled',
            category: (item.category || candidate?.ai_category || 'other') as Category,
            readTimeMinutes: item.readTimeMinutes || candidate?.ai_reading_time || 10,
            priorityScore: item.priorityScore || candidate?.ai_priority_score || 50,
            reason: item.reason,
            position: index + 1,
            skippable: Boolean(item.skippable),
          }
        })

      const totalMinutes = validatedItems.reduce((sum, item) => sum + item.readTimeMinutes, 0)

      queue = {
        items: validatedItems,
        totalMinutes,
        fitsInTimeSlot: totalMinutes <= availableMinutes,
        explanation: parsed.explanation,
        quickAlternative: validatedQuickAlt,
      }

      // Log usage
      await logAIUsage(client, {
        user_id: user.id,
        function_name: 'ai-smart-queue',
        tokens_used: usage.totalTokens,
        model: usage.model,
        latency_ms: latencyMs,
        success: true,
      })
    } catch (aiError) {
      console.error('AI call failed, using fallback:', aiError)
      queue = generateFallbackQueue(candidates, availableMinutes)
    }

    const response: SmartQueueResponse = {
      success: true,
      queue,
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-smart-queue function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
