/**
 * @fileoverview AI-powered content recommendation edge function
 * @description Generates personalized content recommendations based on user's reading
 *              history, current item context, and behavioral patterns. Supports both
 *              internal (from user's saved content) and external recommendations.
 *
 * @example
 * POST /functions/v1/ai-recommend
 * {
 *   "userId": "uuid",
 *   "currentEntryId": "uuid",
 *   "limit": 5,
 *   "includeExternal": false
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
  RecommendRequest,
  RecommendResponse,
  Recommendation,
  Category,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for recommendations */
const SYSTEM_PROMPT = `You are a content recommendation expert for ScrollLater, a personal knowledge management app. Your role is to suggest relevant content that will provide maximum value to the user.

Recommendation strategies:
1. Topic similarity - Content on the same or related topics
2. Author/source matching - Content from sources the user enjoys
3. Complementary content - Items that provide different perspectives
4. Trending in user's interests - Popular items in their categories
5. Learning progression - Content that builds on what they've read

Guidelines:
- Prioritize unread content over read items
- Consider reading time and user's available time
- Diversify recommendations across categories
- Explain why each recommendation is relevant`

interface UserEntry {
  id: string
  title: string | null
  ai_summary: string | null
  content: string
  ai_category: string | null
  ai_tags: string[]
  ai_reading_time: number | null
  status: string
  url: string | null
}

/**
 * Fetch user's reading history and preferences
 */
async function fetchUserContext(
  client: ReturnType<typeof import('../_shared/utils.ts').createServiceClient>,
  userId: string
): Promise<{
  recentlyRead: UserEntry[]
  topCategories: string[]
  topTags: string[]
  totalSaved: number
}> {
  // Get recently completed items
  const { data: recentlyRead } = await client
    .from('entries')
    .select('id, title, ai_summary, content, ai_category, ai_tags, ai_reading_time, status, url')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)

  // Get category counts
  const { data: allEntries } = await client
    .from('entries')
    .select('ai_category, ai_tags')
    .eq('user_id', userId)
    .limit(200)

  const categoryCounts: Record<string, number> = {}
  const tagCounts: Record<string, number> = {}

  if (allEntries) {
    for (const entry of allEntries) {
      if (entry.ai_category) {
        categoryCounts[entry.ai_category] = (categoryCounts[entry.ai_category] || 0) + 1
      }
      if (Array.isArray(entry.ai_tags)) {
        for (const tag of entry.ai_tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
    }
  }

  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat)

  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([tag]) => tag)

  return {
    recentlyRead: recentlyRead || [],
    topCategories,
    topTags,
    totalSaved: allEntries?.length || 0,
  }
}

/**
 * Fetch candidate items for recommendations
 */
async function fetchCandidates(
  client: ReturnType<typeof import('../_shared/utils.ts').createServiceClient>,
  userId: string,
  currentEntryId: string | undefined,
  limit: number
): Promise<UserEntry[]> {
  let query = client
    .from('entries')
    .select('id, title, ai_summary, content, ai_category, ai_tags, ai_reading_time, status, url')
    .eq('user_id', userId)
    .eq('status', 'inbox')
    .order('created_at', { ascending: false })
    .limit(limit * 3) // Fetch more to have selection

  if (currentEntryId) {
    query = query.neq('id', currentEntryId)
  }

  const { data } = await query
  return data || []
}

/**
 * Build recommendation prompt
 */
function buildRecommendationPrompt(
  currentEntry: UserEntry | null,
  candidates: UserEntry[],
  userContext: {
    recentlyRead: UserEntry[]
    topCategories: string[]
    topTags: string[]
    totalSaved: number
  },
  limit: number
): string {
  const currentContext = currentEntry
    ? `
CURRENTLY VIEWING:
Title: ${currentEntry.title || 'Untitled'}
Summary: ${currentEntry.ai_summary || currentEntry.content.substring(0, 200)}
Category: ${currentEntry.ai_category || 'uncategorized'}
Tags: ${currentEntry.ai_tags?.join(', ') || 'none'}`
    : 'No current item - general recommendations requested'

  const candidatesList = candidates.map((c, i) => `
${i + 1}. ID: ${c.id}
   Title: ${c.title || c.content.substring(0, 50)}
   Summary: ${c.ai_summary || c.content.substring(0, 150)}
   Category: ${c.ai_category || 'other'}
   Tags: ${c.ai_tags?.join(', ') || 'none'}
   Read Time: ${c.ai_reading_time || 10} min`).join('\n')

  return `Generate ${limit} content recommendations for this user.

${currentContext}

USER PROFILE:
- Top Categories: ${userContext.topCategories.join(', ') || 'Not established yet'}
- Frequent Tags: ${userContext.topTags.slice(0, 10).join(', ') || 'Not established yet'}
- Total Saved Items: ${userContext.totalSaved}
- Recently Read Topics: ${userContext.recentlyRead.slice(0, 5).map(e => e.ai_category).filter(Boolean).join(', ') || 'None yet'}

CANDIDATE ITEMS (unread content to recommend from):
${candidatesList}

Generate recommendations in this JSON format:
{
  "recommendations": [
    {
      "entryId": "id from candidates",
      "title": "Item title",
      "reason": "Specific reason why this is recommended (reference user context)",
      "relevanceScore": 0.0-1.0,
      "category": "category",
      "readTimeMinutes": number,
      "matchType": "topic|author|similar_users|trending|complementary"
    }
  ],
  "reasoning": "Overall explanation of recommendation strategy used"
}

Requirements:
- Only recommend from the CANDIDATE ITEMS list
- Diversify across categories when possible
- Higher relevanceScore for closer topic matches
- matchType should reflect the primary reason for recommendation
- Be specific in reasons (reference actual content themes)`
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
    const { body, error: parseError } = await parseRequestBody<RecommendRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    const {
      currentEntryId,
      limit = 5,
    } = body

    // Fetch context in parallel
    const [userContext, candidates, currentEntry] = await Promise.all([
      fetchUserContext(client, user.id),
      fetchCandidates(client, user.id, currentEntryId, limit),
      currentEntryId
        ? client
            .from('entries')
            .select('id, title, ai_summary, content, ai_category, ai_tags, ai_reading_time, status, url')
            .eq('id', currentEntryId)
            .eq('user_id', user.id)
            .single()
            .then(r => r.data)
        : Promise.resolve(null),
    ])

    if (candidates.length === 0) {
      return jsonResponse<RecommendResponse>({
        success: true,
        recommendations: [],
        reasoning: 'No unread content available for recommendations.',
      })
    }

    // Build prompt and call AI
    const prompt = buildRecommendationPrompt(
      currentEntry,
      candidates,
      userContext,
      limit
    )

    const { result: aiResult, latencyMs } = await measureLatency(async () => {
      return await callAI(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 800,
        temperature: 0.5,
      })
    })

    usage = aiResult.usage

    // Parse response
    const parsed = parseAIJson<{
      recommendations: Array<{
        entryId: string
        title: string
        reason: string
        relevanceScore: number
        category: string
        readTimeMinutes: number
        matchType: string
      }>
      reasoning: string
    }>(aiResult.content, {
      recommendations: [],
      reasoning: 'AI recommendation failed',
    })

    // Validate recommendations against actual candidates
    const validCandidateIds = new Set(candidates.map(c => c.id))
    const recommendations: Recommendation[] = parsed.recommendations
      .filter(r => validCandidateIds.has(r.entryId))
      .slice(0, limit)
      .map(r => {
        const candidate = candidates.find(c => c.id === r.entryId)
        return {
          entryId: r.entryId,
          title: r.title || candidate?.title || 'Untitled',
          reason: r.reason,
          relevanceScore: Math.max(0, Math.min(1, r.relevanceScore || 0.5)),
          category: (r.category || candidate?.ai_category || 'other') as Category,
          readTimeMinutes: r.readTimeMinutes || candidate?.ai_reading_time || 10,
          matchType: (['topic', 'author', 'similar_users', 'trending', 'complementary'].includes(r.matchType)
            ? r.matchType
            : 'topic') as Recommendation['matchType'],
        }
      })

    // Log usage
    await logAIUsage(client, {
      user_id: user.id,
      function_name: 'ai-recommend',
      entry_id: currentEntryId,
      tokens_used: usage.totalTokens,
      model: usage.model,
      latency_ms: latencyMs,
      success: true,
    })

    const response: RecommendResponse = {
      success: true,
      recommendations,
      reasoning: parsed.reasoning,
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-recommend function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
