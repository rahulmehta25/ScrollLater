/**
 * @fileoverview AI-powered priority scoring edge function
 * @description Analyzes content to assign priority scores based on relevance, timeliness,
 *              quality, and user interest patterns. Helps users focus on high-value content.
 *
 * @example
 * POST /functions/v1/ai-priority-score
 * {
 *   "entryId": "uuid",
 *   "content": "Content to score...",
 *   "url": "https://example.com/article",
 *   "userContext": {
 *     "interests": ["AI", "startups"],
 *     "recentlyRead": ["topic1", "topic2"],
 *     "goals": ["Learn machine learning", "Stay updated on tech"]
 *   }
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
  generateFallbackPriority,
} from '../_shared/utils.ts'
import type {
  PriorityScoreRequest,
  PriorityScoreResponse,
  PriorityFactors,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for priority scoring */
const SYSTEM_PROMPT = `You are a content prioritization expert for ScrollLater, a personal knowledge management app. Your role is to help users focus on the most valuable content by scoring items based on multiple factors.

Scoring Philosophy:
- High scores (80+) = Must-read content that's highly relevant and time-sensitive
- Medium-high (60-79) = Valuable content worth scheduling soon
- Medium (40-59) = Good content for when user has time
- Low (20-39) = Nice-to-have, can wait
- Very low (<20) = Consider archiving or skipping

Consider user's explicit interests and implicit patterns equally.`

/**
 * Fetch user's interest profile from their history
 */
async function fetchUserInterests(
  client: ReturnType<typeof import('../_shared/utils.ts').createServiceClient>,
  userId: string
): Promise<{
  interests: string[]
  recentTopics: string[]
  preferredCategories: string[]
  avgCompletionTime: number
}> {
  // Get completed entries for pattern analysis
  const { data: completedEntries } = await client
    .from('entries')
    .select('ai_category, ai_tags, ai_topics, ai_reading_time, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(50)

  const tagCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  const topicCounts: Record<string, number> = {}
  let totalReadingTime = 0
  let completedCount = 0

  if (completedEntries) {
    for (const entry of completedEntries) {
      // Count tags
      if (Array.isArray(entry.ai_tags)) {
        for (const tag of entry.ai_tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
      // Count topics
      if (Array.isArray(entry.ai_topics)) {
        for (const topic of entry.ai_topics) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        }
      }
      // Count categories
      if (entry.ai_category) {
        categoryCounts[entry.ai_category] = (categoryCounts[entry.ai_category] || 0) + 1
      }
      // Track reading time
      if (entry.ai_reading_time) {
        totalReadingTime += entry.ai_reading_time
        completedCount++
      }
    }
  }

  const interests = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag)

  const recentTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([topic]) => topic)

  const preferredCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat)

  return {
    interests,
    recentTopics,
    preferredCategories,
    avgCompletionTime: completedCount > 0 ? Math.round(totalReadingTime / completedCount) : 15,
  }
}

/**
 * Build priority scoring prompt
 */
function buildPriorityPrompt(
  content: string,
  url: string | undefined,
  userContext: {
    interests: string[]
    recentlyRead: string[]
    goals?: string[]
  },
  userProfile: {
    interests: string[]
    recentTopics: string[]
    preferredCategories: string[]
    avgCompletionTime: number
  }
): string {
  const currentDate = new Date().toISOString().split('T')[0]

  return `Score this content's priority for the user on a scale of 1-100.

CURRENT DATE: ${currentDate}

CONTENT TO SCORE:
"""
${content.substring(0, 5000)}
"""
${url ? `\nSOURCE URL: ${url}` : ''}

USER CONTEXT (explicit preferences):
- Stated Interests: ${userContext.interests?.join(', ') || 'Not specified'}
- Recently Read Topics: ${userContext.recentlyRead?.join(', ') || 'Not specified'}
- Goals: ${userContext.goals?.join(', ') || 'Not specified'}

USER PROFILE (inferred from history):
- Frequent Topics: ${userProfile.interests.join(', ') || 'Not established'}
- Recent Focus Areas: ${userProfile.recentTopics.join(', ') || 'Not established'}
- Preferred Categories: ${userProfile.preferredCategories.join(', ') || 'Not established'}
- Avg. Content Length Preference: ${userProfile.avgCompletionTime} min

Score the content based on these factors (each 0.0-1.0):

1. RELEVANCE: How well does this match user's interests and preferences?
2. TIMELINESS: Is this time-sensitive? Will it become stale? Is it about current events?
3. QUALITY: Content depth, credibility, uniqueness of insights
4. ACTIONABILITY: Can the user do something with this information?
5. LEARNING VALUE: Does this teach something new or build on existing knowledge?
6. URGENCY: Does this require immediate attention or decision?

Respond in JSON format:
{
  "score": 1-100,
  "tier": "must_read|high|medium|low|archive_candidate",
  "factors": {
    "relevance": 0.0-1.0,
    "timeliness": 0.0-1.0,
    "quality": 0.0-1.0,
    "actionability": 0.0-1.0,
    "learningValue": 0.0-1.0,
    "urgency": 0.0-1.0
  },
  "explanation": "Brief explanation of the score",
  "suggestedDeadline": "ISO date if time-sensitive, otherwise null"
}

Tier thresholds:
- must_read: 80-100
- high: 60-79
- medium: 40-59
- low: 20-39
- archive_candidate: 1-19`
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
    const { body, error: parseError } = await parseRequestBody<PriorityScoreRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    // Validate required fields
    const validationError = validateRequired(body as Record<string, unknown>, ['entryId', 'content'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const {
      entryId,
      content,
      url,
      userContext = { interests: [], recentlyRead: [] },
    } = body

    // Fetch user's interest profile
    const userProfile = await fetchUserInterests(client, user.id)

    // Build prompt and call AI
    const prompt = buildPriorityPrompt(content, url, userContext, userProfile)

    let result: PriorityScoreResponse['result']

    try {
      const { result: aiResult, latencyMs } = await measureLatency(async () => {
        return await callAI(prompt, {
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 500,
          temperature: 0.3,
        })
      })

      usage = aiResult.usage

      // Parse response
      const parsed = parseAIJson<{
        score: number
        tier: string
        factors: PriorityFactors
        explanation: string
        suggestedDeadline?: string
      }>(aiResult.content, generateFallbackPriority(content))

      // Validate and normalize
      const score = Math.max(1, Math.min(100, Math.round(parsed.score || 50)))

      const tierMap: Record<string, PriorityScoreResponse['result']['tier']> = {
        must_read: 'must_read',
        high: 'high',
        medium: 'medium',
        low: 'low',
        archive_candidate: 'archive_candidate',
      }

      const tier = tierMap[parsed.tier] || (
        score >= 80 ? 'must_read' :
        score >= 60 ? 'high' :
        score >= 40 ? 'medium' :
        score >= 20 ? 'low' : 'archive_candidate'
      )

      const factors: PriorityFactors = {
        relevance: Math.max(0, Math.min(1, parsed.factors?.relevance ?? 0.5)),
        timeliness: Math.max(0, Math.min(1, parsed.factors?.timeliness ?? 0.5)),
        quality: Math.max(0, Math.min(1, parsed.factors?.quality ?? 0.5)),
        actionability: Math.max(0, Math.min(1, parsed.factors?.actionability ?? 0.5)),
        learningValue: Math.max(0, Math.min(1, parsed.factors?.learningValue ?? 0.5)),
        urgency: Math.max(0, Math.min(1, parsed.factors?.urgency ?? 0.3)),
      }

      result = {
        score,
        tier,
        factors,
        explanation: parsed.explanation || 'Priority score calculated based on content analysis',
        suggestedDeadline: parsed.suggestedDeadline,
      }

      // Log usage
      await logAIUsage(client, {
        user_id: user.id,
        function_name: 'ai-priority-score',
        entry_id: entryId,
        tokens_used: usage.totalTokens,
        model: usage.model,
        latency_ms: latencyMs,
        success: true,
      })
    } catch (aiError) {
      console.error('AI call failed, using fallback:', aiError)
      const fallback = generateFallbackPriority(content)
      result = {
        score: fallback.score,
        tier: fallback.tier as PriorityScoreResponse['result']['tier'],
        factors: fallback.factors,
        explanation: fallback.explanation,
      }
    }

    // Update entry with priority score
    await client
      .from('entries')
      .update({
        ai_priority_score: result.score,
        ai_priority_tier: result.tier,
        ai_priority_factors: result.factors,
        ai_suggested_deadline: result.suggestedDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', user.id)

    const response: PriorityScoreResponse = {
      success: true,
      result,
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-priority-score function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
