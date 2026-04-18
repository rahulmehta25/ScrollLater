/**
 * @fileoverview AI-powered content digest generation edge function
 * @description Generates daily, weekly, or monthly digest summaries of saved but unread
 *              content. Identifies key themes, prioritizes items, and provides actionable
 *              reading recommendations.
 *
 * @example
 * POST /functions/v1/ai-digest
 * {
 *   "userId": "uuid",
 *   "frequency": "weekly",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-07",
 *   "maxItems": 50,
 *   "focusCategories": ["tech", "ai"]
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
  DigestRequest,
  DigestResponse,
  DigestCategorySummary,
  Category,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for digest generation */
const SYSTEM_PROMPT = `You are a content curator and analyst for ScrollLater, a personal knowledge management app. Your role is to create insightful, actionable digests of saved content.

Guidelines:
- Identify overarching themes across content
- Highlight the most valuable items to read first
- Provide cross-cutting insights that connect different pieces
- Be concise but comprehensive
- Focus on actionable takeaways
- Consider time investment vs. value for prioritization`

/**
 * Calculate date range based on frequency
 */
function getDateRange(frequency: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate) : new Date()
  let start: Date

  if (startDate) {
    start = new Date(startDate)
  } else {
    start = new Date(end)
    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() - 1)
        break
      case 'weekly':
        start.setDate(start.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(start.getMonth() - 1)
        break
    }
  }

  return { start, end }
}

interface EntryForDigest {
  id: string
  title: string | null
  ai_summary: string | null
  content: string
  ai_category: string | null
  ai_tags: string[]
  ai_reading_time: number | null
  ai_priority_score: number | null
  created_at: string
  status: string
}

/**
 * Group entries by category
 */
function groupByCategory(entries: EntryForDigest[]): Record<string, EntryForDigest[]> {
  const groups: Record<string, EntryForDigest[]> = {}

  for (const entry of entries) {
    const category = entry.ai_category || 'other'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(entry)
  }

  return groups
}

/**
 * Build digest prompt for AI
 */
function buildDigestPrompt(
  entries: EntryForDigest[],
  groupedEntries: Record<string, EntryForDigest[]>,
  frequency: string,
  dateRange: { start: Date; end: Date }
): string {
  const categorySummaries = Object.entries(groupedEntries).map(([category, items]) => {
    const totalMinutes = items.reduce((sum, e) => sum + (e.ai_reading_time || 10), 0)
    return `
### ${category.toUpperCase()} (${items.length} items, ~${totalMinutes} min)
${items.slice(0, 5).map(e => `- "${e.title || e.content.substring(0, 50)}": ${e.ai_summary || e.content.substring(0, 100)}`).join('\n')}
${items.length > 5 ? `... and ${items.length - 5} more` : ''}`
  }).join('\n')

  return `Generate a ${frequency} digest for content saved between ${dateRange.start.toISOString().split('T')[0]} and ${dateRange.end.toISOString().split('T')[0]}.

CONTENT OVERVIEW:
Total Items: ${entries.length}
Unread Items: ${entries.filter(e => e.status === 'inbox').length}
Categories: ${Object.keys(groupedEntries).join(', ')}

CONTENT BY CATEGORY:
${categorySummaries}

Generate a comprehensive digest in this JSON format:
{
  "title": "Engaging digest title for this period",
  "executiveSummary": "2-3 sentence overview of the key themes and must-reads",
  "categorySummaries": [
    {
      "category": "category name",
      "itemCount": number,
      "totalReadingMinutes": number,
      "keyThemes": ["theme1", "theme2"],
      "mainTakeaway": "The most important insight from this category",
      "topItems": [
        {"id": "entry_id", "title": "Item title", "relevanceScore": 0.0-1.0}
      ]
    }
  ],
  "insights": [
    "Cross-cutting insight 1 connecting multiple pieces",
    "Cross-cutting insight 2",
    "Cross-cutting insight 3"
  ],
  "recommendedReadingOrder": ["id1", "id2", "id3"],
  "estimatedCatchUpTime": total_minutes_for_unread
}

Requirements:
- Include all categories present in the content
- topItems should have 2-3 items per category, sorted by relevance
- insights should connect themes across different categories
- recommendedReadingOrder should prioritize high-value, time-sensitive content
- Be specific and actionable in summaries`
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
    const { body, error: parseError } = await parseRequestBody<DigestRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    const {
      frequency = 'weekly',
      startDate,
      endDate,
      maxItems = 50,
      focusCategories,
    } = body

    // Calculate date range
    const dateRange = getDateRange(frequency, startDate, endDate)

    // Build query for entries
    let query = client
      .from('entries')
      .select('id, title, ai_summary, content, ai_category, ai_tags, ai_reading_time, ai_priority_score, created_at, status')
      .eq('user_id', user.id)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .order('ai_priority_score', { ascending: false, nullsFirst: false })
      .limit(maxItems)

    // Filter by categories if specified
    if (focusCategories && focusCategories.length > 0) {
      query = query.in('ai_category', focusCategories)
    }

    const { data: entries, error: entriesError } = await query

    if (entriesError) {
      return errorResponse(`Failed to fetch entries: ${entriesError.message}`, 500)
    }

    if (!entries || entries.length === 0) {
      return jsonResponse<DigestResponse>({
        success: true,
        digest: {
          title: `No content for ${frequency} digest`,
          executiveSummary: 'No content was saved during this period.',
          period: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          },
          totalItems: 0,
          unreadItems: 0,
          categorySummaries: [],
          insights: [],
          recommendedReadingOrder: [],
          estimatedCatchUpTime: 0,
        },
      })
    }

    // Group entries by category
    const groupedEntries = groupByCategory(entries)

    // Build prompt and call AI
    const prompt = buildDigestPrompt(entries, groupedEntries, frequency, dateRange)

    const { result: aiResult, latencyMs } = await measureLatency(async () => {
      return await callAI(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 1500,
        temperature: 0.4,
      })
    })

    usage = aiResult.usage

    // Parse AI response
    const parsed = parseAIJson<{
      title: string
      executiveSummary: string
      categorySummaries: DigestCategorySummary[]
      insights: string[]
      recommendedReadingOrder: string[]
      estimatedCatchUpTime: number
    }>(aiResult.content, {
      title: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Digest`,
      executiveSummary: `You have ${entries.length} items saved this period.`,
      categorySummaries: [],
      insights: [],
      recommendedReadingOrder: entries.slice(0, 10).map(e => e.id),
      estimatedCatchUpTime: entries.reduce((sum, e) => sum + (e.ai_reading_time || 10), 0),
    })

    // Validate and enhance category summaries
    const categorySummaries: DigestCategorySummary[] = Object.entries(groupedEntries).map(([category, items]) => {
      const aiSummary = parsed.categorySummaries?.find(s => s.category === category)
      const totalMinutes = items.reduce((sum, e) => sum + (e.ai_reading_time || 10), 0)

      return {
        category: category as Category,
        itemCount: items.length,
        totalReadingMinutes: totalMinutes,
        keyThemes: aiSummary?.keyThemes || [],
        mainTakeaway: aiSummary?.mainTakeaway || `${items.length} items about ${category}`,
        topItems: (aiSummary?.topItems || items.slice(0, 3).map(e => ({
          id: e.id,
          title: e.title || e.content.substring(0, 50),
          relevanceScore: e.ai_priority_score ? e.ai_priority_score / 100 : 0.5,
        }))),
      }
    })

    // Log usage
    await logAIUsage(client, {
      user_id: user.id,
      function_name: 'ai-digest',
      tokens_used: usage.totalTokens,
      model: usage.model,
      latency_ms: latencyMs,
      success: true,
    })

    // Store digest in database (optional - for history)
    await client.from('ai_digests').insert({
      user_id: user.id,
      frequency,
      period_start: dateRange.start.toISOString(),
      period_end: dateRange.end.toISOString(),
      digest_data: {
        title: parsed.title,
        executiveSummary: parsed.executiveSummary,
        categorySummaries,
        insights: parsed.insights,
        recommendedReadingOrder: parsed.recommendedReadingOrder,
        estimatedCatchUpTime: parsed.estimatedCatchUpTime,
      },
      created_at: new Date().toISOString(),
    }).catch(() => {
      // Ignore if table doesn't exist
    })

    const response: DigestResponse = {
      success: true,
      digest: {
        title: parsed.title,
        executiveSummary: parsed.executiveSummary,
        period: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
        totalItems: entries.length,
        unreadItems: entries.filter(e => e.status === 'inbox').length,
        categorySummaries,
        insights: parsed.insights?.slice(0, 5) || [],
        recommendedReadingOrder: parsed.recommendedReadingOrder?.slice(0, 10) || [],
        estimatedCatchUpTime: parsed.estimatedCatchUpTime || entries.reduce((sum, e) => sum + (e.ai_reading_time || 10), 0),
      },
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-digest function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
